"""Job Application model for job marketplace."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from enum import Enum


class ApplicationStatus(str, Enum):
    """Status of job application."""
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEWED = "interviewed"
    REJECTED = "rejected"
    ACCEPTED = "accepted"
    HIRED = "hired"
    WITHDRAWN = "withdrawn"


class JobApplication(Base):
    """Job application model - Guards applying to job postings."""

    __tablename__ = "job_applications"

    application_id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.job_id", ondelete="CASCADE"), nullable=False, index=True)
    applicant_id = Column(Integer, ForeignKey("guard_applicants.applicant_id", ondelete="CASCADE"), nullable=False, index=True)

    # Application Details
    cover_letter = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, server_default='submitted', index=True)

    # Review Process
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    review_notes = Column(Text, nullable=True)
    interview_date = Column(DateTime(timezone=True), nullable=True)
    interview_notes = Column(Text, nullable=True)

    # Hiring Outcome
    hired = Column(Boolean, default=False)
    hired_at = Column(DateTime(timezone=True), nullable=True)
    hired_as_employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Timestamps
    applied_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    job = relationship("JobPosting", back_populates="applications")
    applicant = relationship("GuardApplicant", back_populates="applications")

    def __repr__(self):
        return f"<JobApplication {self.application_id}: Job {self.job_id}>"
