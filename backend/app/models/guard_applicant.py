"""Guard Applicant model for job marketplace."""

from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from enum import Enum


class ApplicantStatus(str, Enum):
    """Status of guard applicant."""
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class PSIRAGrade(str, Enum):
    """PSIRA grades."""
    GRADE_A = "A"
    GRADE_B = "B"
    GRADE_C = "C"
    GRADE_D = "D"
    GRADE_E = "E"


class GuardApplicant(Base):
    """Guard applicant model - PSIRA-certified guards seeking employment."""

    __tablename__ = "guard_applicants"

    applicant_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False, unique=True, index=True)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(200), nullable=False)

    # PSIRA Details
    psira_number = Column(String(50), nullable=False, unique=True, index=True)
    psira_grade = Column(String(20), nullable=False)  # A, B, C, D, E
    psira_expiry_date = Column(Date, nullable=False)
    psira_certificate_url = Column(String(500), nullable=True)

    # Personal Details
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    id_number = Column(String(50), nullable=True)

    # Location
    street_address = Column(String(300), nullable=True)
    suburb = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    province = Column(String(50), nullable=False)
    postal_code = Column(String(20), nullable=True)

    # Work Preferences
    provinces_willing_to_work = Column(JSON, nullable=True)  # Array of provinces
    available_for_work = Column(Boolean, default=True)
    hourly_rate_expectation = Column(Numeric(10, 2), nullable=True)
    years_experience = Column(Integer, nullable=True)
    skills = Column(JSON, nullable=True)  # Array of skills
    languages = Column(JSON, nullable=True)  # Array of languages

    # Additional Qualifications
    has_drivers_license = Column(Boolean, default=False)
    drivers_license_code = Column(String(10), nullable=True)
    has_firearm_competency = Column(Boolean, default=False)
    firearm_competency_expiry = Column(Date, nullable=True)

    # Documents
    cv_url = Column(String(500), nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    references = Column(JSON, nullable=True)  # Array of reference objects

    # Status
    status = Column(String(50), nullable=False, server_default='pending_verification')
    verification_notes = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    applications = relationship("JobApplication", back_populates="applicant")

    def __repr__(self):
        return f"<GuardApplicant {self.applicant_id}: {self.full_name}>"
