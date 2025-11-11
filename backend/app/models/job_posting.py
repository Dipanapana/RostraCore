"""Job Posting model for job marketplace."""

from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from enum import Enum


class JobStatus(str, Enum):
    """Status of job posting."""
    OPEN = "open"
    CLOSED = "closed"
    FILLED = "filled"
    CANCELLED = "cancelled"


class ContractType(str, Enum):
    """Type of employment contract."""
    PERMANENT = "permanent"
    TEMPORARY = "temporary"
    CONTRACT = "contract"
    PART_TIME = "part_time"


class JobPosting(Base):
    """Job posting model - Jobs posted by security companies."""

    __tablename__ = "job_postings"

    job_id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="SET NULL"), nullable=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True)

    # Job Details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    required_psira_grade = Column(String(20), nullable=False)
    required_skills = Column(JSON, nullable=True)
    required_experience_years = Column(Integer, nullable=True)

    # Location
    province = Column(String(50), nullable=False, index=True)
    city = Column(String(100), nullable=True)
    remote_possible = Column(Boolean, default=False)

    # Employment Details
    shift_pattern = Column(String(50), nullable=True)
    hourly_rate = Column(Numeric(10, 2), nullable=True)
    salary_min = Column(Numeric(10, 2), nullable=True)
    salary_max = Column(Numeric(10, 2), nullable=True)
    positions_available = Column(Integer, nullable=False, default=1)
    start_date = Column(Date, nullable=True)
    contract_type = Column(String(50), nullable=False)
    contract_duration_months = Column(Integer, nullable=True)

    # Additional Requirements
    requires_drivers_license = Column(Boolean, default=False)
    requires_firearm_competency = Column(Boolean, default=False)

    # Status
    status = Column(String(50), nullable=False, server_default='open', index=True)
    created_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    filled_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization")
    client = relationship("Client")
    site = relationship("Site")
    applications = relationship("JobApplication", back_populates="job")
    premium_listing = relationship("PremiumJobPosting", back_populates="job_posting", uselist=False)

    def __repr__(self):
        return f"<JobPosting {self.job_id}: {self.title}>"
