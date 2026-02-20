"""Shift Handover Notes model."""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship as orm_relationship
from datetime import datetime

from app.database import Base


class ShiftHandover(Base):
    __tablename__ = "shift_handovers"

    handover_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id", ondelete="SET NULL"), nullable=True)
    outgoing_employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    incoming_employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)

    # Handover content
    summary = Column(Text, nullable=False)
    incidents_note = Column(Text, nullable=True)
    ongoing_issues = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    equipment_status = Column(String(500), nullable=True)
    keys_handed = Column(Boolean, default=True)
    priority = Column(String(20), nullable=False, default="normal")  # low, normal, high, urgent

    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = orm_relationship("Organization")
    site = orm_relationship("Site")
