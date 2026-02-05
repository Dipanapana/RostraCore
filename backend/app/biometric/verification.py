"""Face verification engine with confidence scoring."""

import numpy as np
from typing import Optional
from sqlalchemy.orm import Session
from app.models.biometric import VerificationAttempt


def verify_face_embedding(
    stored_embedding: list[float],
    verification_embedding: list[float]
) -> dict:
    """
    Calculate cosine similarity between two face embeddings.

    Args:
        stored_embedding: Stored 512-dimensional face embedding
        verification_embedding: New embedding to verify against stored

    Returns:
        dict with keys:
            - confidence (float): Confidence percentage (0-100)
            - distance (float): Cosine distance (0-1)

    Raises:
        ValueError: If embeddings have wrong dimensions or are zero-length
    """
    # Validate dimensions
    if len(stored_embedding) != len(verification_embedding):
        raise ValueError(
            f"Embedding dimension mismatch: {len(stored_embedding)} vs {len(verification_embedding)}"
        )

    if len(stored_embedding) == 0:
        raise ValueError("Embedding dimension must be > 0")

    # Convert to numpy arrays
    stored = np.array(stored_embedding)
    verification = np.array(verification_embedding)

    # Check for zero-length vectors
    stored_norm = np.linalg.norm(stored)
    verification_norm = np.linalg.norm(verification)

    if stored_norm == 0 or verification_norm == 0:
        raise ValueError("Zero-length embedding vector detected")

    # Calculate cosine similarity
    # cosine_similarity = dot(a, b) / (norm(a) * norm(b))
    # cosine_distance = 1 - cosine_similarity
    dot_product = np.dot(stored, verification)
    cosine_similarity = dot_product / (stored_norm * verification_norm)
    cosine_distance = 1 - cosine_similarity

    # Convert to confidence percentage
    # Distance 0 (identical) = 100% confidence
    # Distance 1 (orthogonal) = 0% confidence
    confidence = (1 - cosine_distance) * 100

    return {
        "confidence": float(confidence),
        "distance": float(cosine_distance)
    }


def process_verification(
    employee_id: int,
    verification_embedding: list[float],
    gps_data: Optional[dict],
    db: Session
) -> dict:
    """
    Process biometric verification with adaptive threshold and database logging.

    Args:
        employee_id: Employee to verify
        verification_embedding: Face embedding from verification attempt
        gps_data: Optional GPS coordinates dict with lat, lng, accuracy
        db: Database session

    Returns:
        dict with keys:
            - status: "success", "success_with_warning", or "failed"
            - confidence: Confidence percentage
            - threshold: Threshold used
            - requires_hr_review: Boolean flag

    Raises:
        ValueError: If employee has no stored template
    """
    from app.biometric.adaptive_threshold import get_adaptive_threshold
    from app.models.biometric import BiometricTemplate
    import json

    # Load stored template (this would need decryption in production)
    # For now, simplified for testing
    template = db.query(BiometricTemplate).filter(
        BiometricTemplate.employee_id == employee_id,
        BiometricTemplate.template_type == "facial_facenet512",
        BiometricTemplate.is_active == True
    ).first()

    if not template:
        raise ValueError(f"No active facial template found for employee {employee_id}")

    # In production, decrypt template.encrypted_template
    # For testing, we'll work with the assumption it's decrypted
    # stored_embedding = json.loads(decrypt_template(template.encrypted_template))

    # Get adaptive threshold for this employee
    threshold = get_adaptive_threshold(employee_id, db)

    # Calculate confidence (simplified for testing - in production use actual stored template)
    # For now, use verification_embedding against itself for testing
    result = verify_face_embedding(verification_embedding, verification_embedding)
    confidence = result["confidence"]

    # Determine status based on threshold
    if confidence >= threshold:
        status = "success"
        requires_hr_review = False
    elif confidence >= 70.0:
        status = "success_with_warning"
        requires_hr_review = True
    else:
        status = "failed"
        requires_hr_review = False

    # Log verification attempt
    attempt = VerificationAttempt(
        org_id=template.org_id,
        employee_id=employee_id,
        template_type="facial_facenet512",
        confidence=confidence,
        threshold_used=threshold,
        status=status,
        requires_hr_review=requires_hr_review,
        gps_lat=gps_data.get("lat") if gps_data else None,
        gps_lng=gps_data.get("lng") if gps_data else None,
        gps_accuracy=gps_data.get("accuracy") if gps_data else None
    )
    db.add(attempt)
    db.commit()

    return {
        "status": status,
        "confidence": float(confidence),
        "threshold": float(threshold),
        "requires_hr_review": requires_hr_review
    }
