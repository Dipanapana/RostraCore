"""Adaptive threshold algorithm for per-employee verification thresholds."""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.biometric import VerificationAttempt


def get_adaptive_threshold(employee_id: int, db: Session) -> float:
    """
    Calculate personalized verification threshold based on employee's history.

    Algorithm:
    - Default threshold: 85.0%
    - If employee has 10+ successful verifications at 90%+ confidence in last 30 days: 80.0% (relaxed)
    - If employee has 3 consecutive recent failures: revert to 85.0% (even if previously relaxed)

    Args:
        employee_id: Employee to calculate threshold for
        db: Database session

    Returns:
        float: Threshold percentage (80.0 or 85.0)
    """
    DEFAULT_THRESHOLD = 85.0
    RELAXED_THRESHOLD = 80.0
    REQUIRED_HIGH_CONFIDENCE_COUNT = 10
    HIGH_CONFIDENCE_MINIMUM = 90.0
    CONSECUTIVE_FAILURES_TO_REVERT = 3
    HISTORY_WINDOW_DAYS = 30

    # Calculate date cutoff for rolling 30-day window
    cutoff_date = datetime.utcnow() - timedelta(days=HISTORY_WINDOW_DAYS)

    # Count high-confidence successful verifications in last 30 days
    high_confidence_count = db.query(VerificationAttempt).filter(
        VerificationAttempt.employee_id == employee_id,
        VerificationAttempt.status == "success",
        VerificationAttempt.confidence >= HIGH_CONFIDENCE_MINIMUM,
        VerificationAttempt.created_at >= cutoff_date
    ).count()

    # Check if employee qualifies for relaxed threshold
    qualifies_for_relaxed = high_confidence_count >= REQUIRED_HIGH_CONFIDENCE_COUNT

    # Check for consecutive recent failures (overrides relaxed threshold)
    recent_attempts = db.query(VerificationAttempt).filter(
        VerificationAttempt.employee_id == employee_id
    ).order_by(
        VerificationAttempt.created_at.desc()
    ).limit(CONSECUTIVE_FAILURES_TO_REVERT).all()

    # If we have 3+ recent attempts and all are failures, revert to default
    if len(recent_attempts) >= CONSECUTIVE_FAILURES_TO_REVERT:
        all_failed = all(attempt.status == "failed" for attempt in recent_attempts)
        if all_failed:
            return DEFAULT_THRESHOLD

    # Return relaxed threshold if qualified, otherwise default
    if qualifies_for_relaxed:
        return RELAXED_THRESHOLD
    else:
        return DEFAULT_THRESHOLD
