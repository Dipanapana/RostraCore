"""Biometric enrolment and verification endpoints.

Provides photo-based identity enrolment, verification queue for supervisors,
and secure photo retrieval for the frontend.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import get_current_user, get_current_org_id, require_finance_access
from app.models.user import User
from app.models.biometric_template import BiometricTemplate
from app.models.attendance_photo import AttendancePhoto
from app.services.biometric_service import BiometricService

router = APIRouter()

# Maximum upload size: 10 MB
MAX_PHOTO_SIZE = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class VerifyRequest(BaseModel):
    verified: bool
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/enroll/{employee_id}")
def enroll_biometric(
    employee_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Enrol a reference photo for an employee.

    Accepts a JPEG / PNG / WebP image upload.  The photo is encrypted at rest
    and linked as the employee's active biometric template.  Any previously
    active template is deactivated.

    Requires admin or finance access.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{file.content_type}'. Allowed: JPEG, PNG, WebP.",
        )

    photo_bytes = file.file.read()

    if len(photo_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(photo_bytes) > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_PHOTO_SIZE // (1024 * 1024)} MB.",
        )

    result = BiometricService.enroll_reference_photo(
        db=db,
        org_id=org_id,
        employee_id=employee_id,
        photo_bytes=photo_bytes,
        enrolled_by=current_user.user_id,
    )

    return result


@router.get("/status/{employee_id}")
def biometric_status(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Return the biometric enrolment status for an employee.

    Indicates whether the employee has an active reference template, its type,
    and when it was enrolled.
    """
    template = (
        db.query(BiometricTemplate)
        .filter(
            BiometricTemplate.employee_id == employee_id,
            BiometricTemplate.org_id == org_id,
            BiometricTemplate.is_active == True,
        )
        .first()
    )

    if not template:
        return {
            "has_template": False,
            "template_type": None,
            "enrolled_at": None,
            "employee_id": employee_id,
        }

    return {
        "has_template": True,
        "template_type": template.template_type,
        "enrolled_at": template.enrolled_at.isoformat() if template.enrolled_at else None,
        "template_id": template.template_id,
        "employee_id": employee_id,
    }


@router.get("/verification-queue")
def verification_queue(
    limit: int = 50,
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Return a list of attendance photos pending supervisor verification.

    Requires admin or finance access.
    """
    queue = BiometricService.get_verification_queue(db, org_id, limit=limit)
    return {"items": queue, "total": len(queue)}


@router.post("/verify/{photo_id}")
def verify_photo(
    photo_id: int,
    body: VerifyRequest,
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Supervisor approves or rejects an attendance photo.

    Sets the ``verified`` flag, records who verified and when, and optionally
    stores a reason (e.g. "Uniform not visible", "Wrong person").
    """
    photo = (
        db.query(AttendancePhoto)
        .filter(
            AttendancePhoto.photo_id == photo_id,
            AttendancePhoto.org_id == org_id,
        )
        .first()
    )

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance photo not found.",
        )

    if photo.verified is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo has already been verified.",
        )

    photo.verified = body.verified
    photo.verified_by = current_user.user_id
    photo.verified_at = datetime.utcnow()

    db.commit()
    db.refresh(photo)

    return {
        "photo_id": photo.photo_id,
        "verified": photo.verified,
        "verified_by": current_user.user_id,
        "verified_at": photo.verified_at.isoformat(),
        "reason": body.reason,
    }


@router.get("/photo/{photo_id}")
def get_photo(
    photo_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Return the decrypted attendance photo as an image response.

    The photo is decrypted from encrypted storage and served with the
    appropriate content type for display in the frontend.
    """
    photo = (
        db.query(AttendancePhoto)
        .filter(
            AttendancePhoto.photo_id == photo_id,
            AttendancePhoto.org_id == org_id,
        )
        .first()
    )

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance photo not found.",
        )

    try:
        photo_bytes = BiometricService.decrypt_and_load(photo.storage_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo file not found on disk.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to decrypt photo: {exc}",
        )

    # Determine content type from storage path extension hint or default to JPEG
    content_type = "image/jpeg"
    if photo.storage_path and "png" in photo.storage_path.lower():
        content_type = "image/png"
    elif photo.storage_path and "webp" in photo.storage_path.lower():
        content_type = "image/webp"

    return Response(
        content=photo_bytes,
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=3600"},
    )
