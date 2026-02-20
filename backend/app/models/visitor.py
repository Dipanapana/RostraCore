"""Visitor management model."""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class VisitorStatus(str, enum.Enum):
    SIGNED_IN = "signed_in"
    SIGNED_OUT = "signed_out"
    DENIED = "denied"


class Visitor(Base):
    """Visitor sign-in / sign-out log for a site."""

    __tablename__ = "visitors"

    visitor_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)

    # Visitor details
    full_name = Column(String(200), nullable=False)
    id_number = Column(String(50), nullable=True)        # SA ID / passport
    company = Column(String(200), nullable=True)          # Visitor's company
    phone = Column(String(30), nullable=True)
    vehicle_reg = Column(String(30), nullable=True)       # Vehicle registration
    purpose = Column(String(200), nullable=False)         # Reason for visit
    visiting_person = Column(String(200), nullable=True)  # Person being visited
    badge_number = Column(String(50), nullable=True)      # Visitor badge issued

    # Status
    status = Column(String(20), nullable=False, default=VisitorStatus.SIGNED_IN.value)

    # Timestamps
    signed_in_at = Column(DateTime, default=datetime.utcnow)
    signed_out_at = Column(DateTime, nullable=True)
    expected_out_at = Column(DateTime, nullable=True)     # Expected departure

    # Guard who processed this visitor
    processed_by = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    signed_out_by = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)

    notes = Column(Text, nullable=True)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site")
    guard = relationship("Employee", foreign_keys=[processed_by])

    def __repr__(self):
        return f"<Visitor {self.visitor_id}: {self.full_name} @ site {self.site_id}>"
