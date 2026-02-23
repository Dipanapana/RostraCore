"""Attendance photo model for clock-in/clock-out verification images."""

from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from app.database import Base
from datetime import datetime


class AttendancePhoto(Base):
    """Photo captured during attendance events for identity verification."""

    __tablename__ = "attendance_photos"

    photo_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(
        Integer,
        ForeignKey("organizations.org_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Linked entities
    assignment_id = Column(
        Integer,
        ForeignKey("shift_assignments.assignment_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id = Column(
        Integer,
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Photo metadata
    photo_type = Column(String(20), nullable=False)  # clock_in, clock_out, spot_check
    storage_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=False)  # SHA-256 for integrity

    # Verification
    verified = Column(Boolean, nullable=True)  # null = pending, True = match, False = mismatch
    confidence = Column(Float, nullable=True)  # Facial recognition confidence score 0-1
    verified_by = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    verified_at = Column(DateTime, nullable=True)

    # Capture context
    captured_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)

    def __repr__(self):
        return (
            f"<AttendancePhoto(photo_id={self.photo_id}, employee_id={self.employee_id}, "
            f"type={self.photo_type})>"
        )
