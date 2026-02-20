"""Injury on Duty (IOD) record model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Text, Boolean
from sqlalchemy.orm import relationship as orm_relationship
from app.database import Base


class IODRecord(Base):
    """Injury on Duty record for an employee."""

    __tablename__ = "iod_records"

    iod_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    incident_date = Column(Date, nullable=False)
    report_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)  # null = still off duty

    injury_type = Column(String(100), nullable=False)  # fracture, laceration, burn, strain, other
    body_part = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    location = Column(String(300), nullable=True)  # where the injury occurred
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True)

    # Status: reported, under_review, approved, rejected, closed
    status = Column(String(50), nullable=False, default="reported")
    wca_claim_number = Column(String(100), nullable=True)  # Workmen's Compensation Act claim
    wca_submitted = Column(Boolean, default=False)
    medical_certificate = Column(Boolean, default=False)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = orm_relationship("Organization")
    employee = orm_relationship("Employee")
    site = orm_relationship("Site")

    def __repr__(self):
        return f"<IODRecord {self.iod_id}: emp={self.employee_id}>"
