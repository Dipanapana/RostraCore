"""Biometric enrollment service - HR-initiated enrollment workflow."""

from datetime import date, datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException
import numpy as np
import cv2
from deepface import DeepFace

from app.models.biometric import BiometricTemplate, EnrollmentSession
from app.models.employee import Employee
from app.models.user import User, UserRole
from .encryption import encrypt_template
from .liveness import check_liveness


def start_enrollment_session(
    employee_id: int,
    initiated_by: int,
    template_type: str,
    db: Session,
    grace_period_days: int = 5
) -> EnrollmentSession:
    """
    Start a new enrollment session for an employee.

    Args:
        employee_id: Employee to enroll
        initiated_by: User ID of HR initiator
        template_type: Type of biometric template (e.g., "facial_facenet512")
        db: Database session
        grace_period_days: Days until enrollment must be completed (default 5)
            Grace period: 3-5 days recommended. Default 5 for max employee flexibility.
            Override via grace_period_days param or org-level config.

    Returns:
        Created EnrollmentSession

    Raises:
        HTTPException: 404 if employee not found, 403 if org mismatch or not HR role
    """
    # Validate initiator has HR/Admin role
    initiator = db.query(User).filter(User.user_id == initiated_by).first()
    if not initiator:
        raise HTTPException(status_code=403, detail="Initiator user not found")

    if initiator.role not in [UserRole.ADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN]:
        raise HTTPException(
            status_code=403,
            detail="Only HR/Admin users can initiate biometric enrollment"
        )

    # Validate employee exists and belongs to same org
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if initiator.role != UserRole.SUPERADMIN and employee.org_id != initiator.org_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot enroll employee from different organization"
        )

    # Calculate grace period end date
    grace_period_end = date.today() + timedelta(days=grace_period_days)

    # Create enrollment session
    session = EnrollmentSession(
        org_id=employee.org_id,
        employee_id=employee_id,
        initiated_by=initiated_by,
        status="pending",
        template_type=template_type,
        attempts=0,
        grace_period_end=grace_period_end
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


def enroll_face(session_id: int, image_bytes: bytes, db: Session) -> dict:
    """
    Enroll employee face biometric from uploaded image.

    Workflow:
    1. Load and validate enrollment session
    2. Run passive liveness checks
    3. Extract face embedding using DeepFace FaceNet512
    4. Encrypt embedding with pgcrypto
    5. Store BiometricTemplate (deactivate old if exists)
    6. Update session status to completed

    Args:
        session_id: Enrollment session ID
        image_bytes: Raw image bytes (JPEG/PNG)
        db: Database session

    Returns:
        {
            "success": bool,
            "quality_score": float,
            "embedding_dimensions": int,
            "template_id": int
        }

    Raises:
        HTTPException: 404 if session not found, 400 if liveness/quality checks fail
    """
    # Load enrollment session
    session = db.query(EnrollmentSession).filter(
        EnrollmentSession.session_id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Enrollment session not found")

    if session.status not in ["pending", "in_progress"]:
        raise HTTPException(
            status_code=400,
            detail=f"Session already {session.status}. Cannot enroll."
        )

    # Update session to in_progress
    session.status = "in_progress"
    session.attempts += 1
    session.last_attempt_at = datetime.utcnow()
    db.commit()

    # Run liveness check
    liveness_result = check_liveness(image_bytes)

    if not liveness_result["is_live"]:
        # Update session with feedback
        session.quality_feedback = str(liveness_result)
        db.commit()

        # Provide guidance for next attempt
        issues_text = " | ".join(liveness_result["issues"])
        if session.attempts >= 5:
            raise HTTPException(
                status_code=400,
                detail=f"Liveness check failed (attempt {session.attempts}/5): {issues_text}. "
                       "Please re-schedule enrollment with better lighting conditions."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Liveness check failed: {issues_text}"
            )

    # Convert image bytes to numpy array for DeepFace
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Failed to decode image")

        # Extract face embedding using DeepFace FaceNet512
        result = DeepFace.represent(
            img_path=img,
            model_name="Facenet512",
            enforce_detection=True,
            detector_backend="retinaface",
            align=True
        )

        # DeepFace.represent returns a list of dicts (one per face)
        if not result or len(result) == 0:
            raise ValueError("No face detected by DeepFace")

        embedding = result[0]["embedding"]  # 512-dimensional vector
        quality_score = liveness_result.get("face_confidence", 0.95) * 100  # Convert to 0-100

    except Exception as e:
        session.status = "failed"
        session.quality_feedback = f"Face detection error: {str(e)}"
        db.commit()

        raise HTTPException(
            status_code=400,
            detail=f"Face embedding extraction failed: {str(e)}"
        )

    # Encrypt embedding
    try:
        encrypted_template = encrypt_template(db, embedding)
    except Exception as e:
        session.status = "failed"
        session.quality_feedback = f"Encryption error: {str(e)}"
        db.commit()

        raise HTTPException(
            status_code=500,
            detail=f"Template encryption failed: {str(e)}"
        )

    # Check if employee already has active template of this type
    existing_template = db.query(BiometricTemplate).filter(
        and_(
            BiometricTemplate.employee_id == session.employee_id,
            BiometricTemplate.template_type == session.template_type,
            BiometricTemplate.is_active == True
        )
    ).first()

    if existing_template:
        # Deactivate old template (re-enrollment)
        existing_template.is_active = False
        db.commit()

    # Create new BiometricTemplate
    template = BiometricTemplate(
        org_id=session.org_id,
        employee_id=session.employee_id,
        template_type=session.template_type,
        encrypted_template=encrypted_template,
        embedding_dimensions=len(embedding),
        quality_score=quality_score,
        enrolled_by=session.initiated_by,
        is_active=True
    )

    db.add(template)

    # Update session to completed
    session.status = "completed"
    db.commit()
    db.refresh(template)

    return {
        "success": True,
        "quality_score": float(quality_score),
        "embedding_dimensions": len(embedding),
        "template_id": template.template_id
    }


def get_enrollment_status(employee_id: int, db: Session) -> dict:
    """
    Get current enrollment status for an employee.

    Args:
        employee_id: Employee to check
        db: Database session

    Returns:
        {
            "enrolled": bool,
            "template_types": list[str],
            "in_grace_period": bool,
            "grace_period_end": date | None
        }
    """
    # Check for active templates
    templates = db.query(BiometricTemplate).filter(
        and_(
            BiometricTemplate.employee_id == employee_id,
            BiometricTemplate.is_active == True
        )
    ).all()

    template_types = [t.template_type for t in templates]
    enrolled = len(templates) > 0

    # Check for active enrollment session with grace period
    active_session = db.query(EnrollmentSession).filter(
        and_(
            EnrollmentSession.employee_id == employee_id,
            EnrollmentSession.status.in_(["pending", "in_progress"]),
            EnrollmentSession.grace_period_end >= date.today()
        )
    ).order_by(EnrollmentSession.created_at.desc()).first()

    in_grace_period = active_session is not None
    grace_period_end = active_session.grace_period_end if active_session else None

    return {
        "enrolled": enrolled,
        "template_types": template_types,
        "in_grace_period": in_grace_period,
        "grace_period_end": grace_period_end
    }
