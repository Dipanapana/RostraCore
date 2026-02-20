"""Training management model.

Track employee training courses, completion, and compliance.
"""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Float
from sqlalchemy.orm import relationship
from app.database import Base


class TrainingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TrainingCategory(str, enum.Enum):
    INDUCTION = "induction"
    FIREARMS = "firearms"
    FIRST_AID = "first_aid"
    PSIRA = "psira"
    FIRE_SAFETY = "fire_safety"
    ACCESS_CONTROL = "access_control"
    CCTV = "cctv"
    CUSTOMER_SERVICE = "customer_service"
    HEALTH_SAFETY = "health_safety"
    REFRESHER = "refresher"
    OTHER = "other"


class TrainingCourse(Base):
    """A training course definition."""

    __tablename__ = "training_courses"

    course_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False, default="other")
    description = Column(Text, nullable=True)
    provider = Column(String(200), nullable=True)
    duration_hours = Column(Float, nullable=True)
    is_mandatory = Column(Boolean, default=False)
    validity_months = Column(Integer, nullable=True)  # How long cert is valid
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization")
    records = relationship("TrainingRecord", back_populates="course")

    def __repr__(self):
        return f"<TrainingCourse {self.course_id}: {self.name}>"


class TrainingRecord(Base):
    """An employee's training record (attendance/completion)."""

    __tablename__ = "training_records"

    record_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("training_courses.course_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(String(30), nullable=False, default="scheduled")
    scheduled_date = Column(DateTime, nullable=True)
    completed_date = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)  # Pass percentage if applicable
    certificate_number = Column(String(100), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    created_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization")
    course = relationship("TrainingCourse", back_populates="records")
    employee = relationship("Employee")

    def __repr__(self):
        return f"<TrainingRecord {self.record_id}: emp={self.employee_id} course={self.course_id}>"
