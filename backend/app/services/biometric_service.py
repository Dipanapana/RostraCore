"""Biometric verification service — photo-based identity enrolment and matching.

Handles encrypted storage of reference templates and attendance photos,
perceptual hash comparison (with graceful fallback), and a supervisor
verification queue.
"""

import os
import hashlib
import base64
import logging
from io import BytesIO
from datetime import datetime
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet

from app.models.biometric_template import BiometricTemplate
from app.models.attendance_photo import AttendancePhoto
from app.config import settings

logger = logging.getLogger(__name__)

BIOMETRIC_STORAGE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "biometric_data",
)


class BiometricService:
    """Static-method service for biometric photo enrolment, comparison, and storage."""

    # ------------------------------------------------------------------
    # Encryption helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _get_fernet() -> Fernet:
        """Create a Fernet instance from the hex-encoded encryption key in settings.

        The .env value is a hex string (64 hex chars = 32 bytes).  Fernet requires
        a url-safe base64-encoded 32-byte key, so we convert accordingly.
        """
        key_bytes = bytes.fromhex(settings.BIOMETRIC_ENCRYPTION_KEY)[:32]
        fernet_key = base64.urlsafe_b64encode(key_bytes)
        return Fernet(fernet_key)

    @staticmethod
    def encrypt_and_store(data: bytes, subdir: str, filename: str) -> str:
        """Encrypt *data* with Fernet and write to disk.

        Returns the relative storage path (``subdir/filename.enc``) which is
        persisted in the database.
        """
        fernet = BiometricService._get_fernet()
        encrypted = fernet.encrypt(data)

        target_dir = os.path.join(BIOMETRIC_STORAGE_DIR, subdir)
        os.makedirs(target_dir, exist_ok=True)

        enc_filename = f"{filename}.enc"
        filepath = os.path.join(target_dir, enc_filename)

        with open(filepath, "wb") as fh:
            fh.write(encrypted)

        # Return path relative to BIOMETRIC_STORAGE_DIR
        return os.path.join(subdir, enc_filename)

    @staticmethod
    def decrypt_and_load(storage_path: str) -> bytes:
        """Read an encrypted file from disk and return the decrypted bytes."""
        fernet = BiometricService._get_fernet()
        filepath = os.path.join(BIOMETRIC_STORAGE_DIR, storage_path)

        with open(filepath, "rb") as fh:
            encrypted = fh.read()

        return fernet.decrypt(encrypted)

    # ------------------------------------------------------------------
    # Enrolment
    # ------------------------------------------------------------------

    @staticmethod
    def enroll_reference_photo(
        db: Session,
        org_id: int,
        employee_id: int,
        photo_bytes: bytes,
        enrolled_by: int,
    ) -> Dict:
        """Enrol a reference photo for an employee.

        Steps:
        1. Compute SHA-256 hash of the raw photo for integrity checks.
        2. Encrypt and store the photo on disk.
        3. Deactivate any previous active template for the same employee.
        4. Create a new ``BiometricTemplate`` record.
        """
        file_hash = hashlib.sha256(photo_bytes).hexdigest()

        subdir = f"org_{org_id}/templates"
        filename = f"emp_{employee_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        storage_path = BiometricService.encrypt_and_store(photo_bytes, subdir, filename)

        # Deactivate existing active templates for this employee
        db.query(BiometricTemplate).filter(
            BiometricTemplate.employee_id == employee_id,
            BiometricTemplate.org_id == org_id,
            BiometricTemplate.is_active == True,
        ).update(
            {"is_active": False, "deactivated_at": datetime.utcnow()},
            synchronize_session="fetch",
        )

        template = BiometricTemplate(
            org_id=org_id,
            employee_id=employee_id,
            template_type="face",
            storage_path=storage_path,
            file_hash=file_hash,
            enrolled_by=enrolled_by,
            enrolled_at=datetime.utcnow(),
            is_active=True,
        )
        db.add(template)
        db.commit()
        db.refresh(template)

        logger.info(
            "Enrolled biometric template %s for employee %s (org %s)",
            template.template_id,
            employee_id,
            org_id,
        )

        return {
            "success": True,
            "template_id": template.template_id,
            "employee_id": employee_id,
            "template_type": template.template_type,
            "enrolled_at": template.enrolled_at.isoformat(),
        }

    # ------------------------------------------------------------------
    # Comparison
    # ------------------------------------------------------------------

    @staticmethod
    def compare_photos(reference_bytes: bytes, checkin_bytes: bytes) -> Dict:
        """Compare a reference photo with a check-in photo.

        Tries perceptual hashing via the ``imagehash`` library first.  If not
        available, falls back to a basic SHA-256 exact-match comparison.
        """
        try:
            import imagehash
            from PIL import Image

            ref_image = Image.open(BytesIO(reference_bytes))
            checkin_image = Image.open(BytesIO(checkin_bytes))

            ref_hash = imagehash.average_hash(ref_image)
            checkin_hash = imagehash.average_hash(checkin_image)

            # Hamming distance — lower is more similar.  A threshold of 10
            # is a reasonable default for average_hash with 8x8 images.
            distance = ref_hash - checkin_hash
            max_distance = 64  # 8x8 hash
            confidence = round(max(0.0, 1.0 - (distance / max_distance)), 4)
            match = distance <= 10

            return {
                "match": match,
                "confidence": confidence,
                "method": "perceptual_hash",
                "distance": distance,
            }

        except ImportError:
            logger.warning(
                "imagehash / Pillow not installed — falling back to exact hash comparison"
            )

        # Fallback: exact SHA-256 match
        ref_hash = hashlib.sha256(reference_bytes).hexdigest()
        checkin_hash = hashlib.sha256(checkin_bytes).hexdigest()
        match = ref_hash == checkin_hash
        confidence = 1.0 if match else 0.0

        return {
            "match": match,
            "confidence": confidence,
            "method": "exact_hash",
        }

    # ------------------------------------------------------------------
    # Check-in / check-out photo storage
    # ------------------------------------------------------------------

    @staticmethod
    def store_checkin_photo(
        db: Session,
        org_id: int,
        assignment_id: int,
        employee_id: int,
        photo_bytes: bytes,
        photo_type: str,
        gps_lat: Optional[float] = None,
        gps_lng: Optional[float] = None,
    ) -> AttendancePhoto:
        """Encrypt and store a clock-in / clock-out photo, creating the DB record."""
        file_hash = hashlib.sha256(photo_bytes).hexdigest()

        subdir = f"org_{org_id}/attendance"
        filename = (
            f"emp_{employee_id}_{photo_type}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        )
        storage_path = BiometricService.encrypt_and_store(photo_bytes, subdir, filename)

        photo = AttendancePhoto(
            org_id=org_id,
            assignment_id=assignment_id,
            employee_id=employee_id,
            photo_type=photo_type,
            storage_path=storage_path,
            file_hash=file_hash,
            captured_at=datetime.utcnow(),
            gps_lat=gps_lat,
            gps_lng=gps_lng,
        )
        db.add(photo)
        db.commit()
        db.refresh(photo)

        logger.info(
            "Stored %s photo %s for employee %s (assignment %s)",
            photo_type,
            photo.photo_id,
            employee_id,
            assignment_id,
        )

        return photo

    # ------------------------------------------------------------------
    # Verification
    # ------------------------------------------------------------------

    @staticmethod
    def verify_checkin_photo(db: Session, employee_id: int, photo_bytes: bytes) -> Dict:
        """Verify a check-in photo against the employee's active reference template.

        Returns a dict with ``verified``, ``confidence``, ``method``, and
        optionally ``reason`` if no active template exists.
        """
        template = (
            db.query(BiometricTemplate)
            .filter(
                BiometricTemplate.employee_id == employee_id,
                BiometricTemplate.is_active == True,
            )
            .first()
        )

        if not template:
            return {
                "verified": False,
                "confidence": 0.0,
                "method": "none",
                "reason": "No active biometric template found for employee",
            }

        try:
            reference_bytes = BiometricService.decrypt_and_load(template.storage_path)
        except Exception as exc:
            logger.error("Failed to load reference template %s: %s", template.template_id, exc)
            return {
                "verified": False,
                "confidence": 0.0,
                "method": "error",
                "reason": f"Failed to load reference template: {exc}",
            }

        result = BiometricService.compare_photos(reference_bytes, photo_bytes)

        return {
            "verified": result["match"],
            "confidence": result["confidence"],
            "method": result["method"],
            "template_id": template.template_id,
        }

    # ------------------------------------------------------------------
    # Supervisor verification queue
    # ------------------------------------------------------------------

    @staticmethod
    def get_verification_queue(db: Session, org_id: int, limit: int = 50) -> List[Dict]:
        """Return attendance photos pending manual verification.

        Joins with employees and shift assignments to provide context for
        supervisors reviewing the queue.
        """
        from app.models.employee import Employee
        from app.models.shift_assignment import ShiftAssignment
        from app.models.shift import Shift

        rows = (
            db.query(AttendancePhoto, Employee, ShiftAssignment, Shift)
            .join(Employee, AttendancePhoto.employee_id == Employee.employee_id)
            .join(
                ShiftAssignment,
                AttendancePhoto.assignment_id == ShiftAssignment.assignment_id,
            )
            .outerjoin(Shift, ShiftAssignment.shift_id == Shift.shift_id)
            .filter(
                AttendancePhoto.org_id == org_id,
                AttendancePhoto.verified.is_(None),
            )
            .order_by(AttendancePhoto.captured_at.desc())
            .limit(limit)
            .all()
        )

        queue: List[Dict] = []
        for photo, employee, assignment, shift in rows:
            queue.append(
                {
                    "photo_id": photo.photo_id,
                    "employee_id": employee.employee_id,
                    "employee_name": f"{employee.first_name} {employee.last_name}",
                    "assignment_id": assignment.assignment_id,
                    "shift_id": shift.shift_id if shift else None,
                    "photo_type": photo.photo_type,
                    "captured_at": photo.captured_at.isoformat() if photo.captured_at else None,
                    "confidence": photo.confidence,
                    "gps_lat": photo.gps_lat,
                    "gps_lng": photo.gps_lng,
                }
            )

        return queue
