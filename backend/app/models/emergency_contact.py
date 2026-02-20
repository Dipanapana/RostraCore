"""Emergency contact model — per-employee emergency contacts."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship as orm_relationship
from app.database import Base


class EmergencyContact(Base):
    """Emergency contact for an employee."""

    __tablename__ = "emergency_contacts"

    contact_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    full_name = Column(String(200), nullable=False)
    relationship = Column(String(100), nullable=False)  # spouse, parent, sibling, friend, other
    phone = Column(String(50), nullable=False)
    alt_phone = Column(String(50), nullable=True)
    email = Column(String(200), nullable=True)
    address = Column(String(500), nullable=True)
    is_primary = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = orm_relationship("Organization")
    employee = orm_relationship("Employee")

    def __repr__(self):
        return f"<EmergencyContact {self.contact_id}: {self.full_name}>"
