"""Overtime record model — tracks overtime hours, approvals, and costs."""

import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float, Date
from sqlalchemy.orm import relationship
from app.database import Base


class OvertimeStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class OvertimeRecord(Base):
    """Employee overtime record with approval workflow."""

    __tablename__ = "overtime_records"

    record_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True, index=True)

    date = Column(Date, nullable=False)
    hours = Column(Float, nullable=False)  # Overtime hours worked
    rate_multiplier = Column(Float, default=1.5)  # 1.5x, 2.0x for Sundays/holidays
    hourly_rate = Column(Integer, nullable=True)  # cents — base hourly rate used for calc
    total_cost = Column(Integer, nullable=True)  # cents — hours * rate * multiplier

    reason = Column(String(200), nullable=True)  # Why overtime was needed
    status = Column(String(20), default="pending")

    approved_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization")
    employee = relationship("Employee")
    site = relationship("Site")

    def __repr__(self):
        return f"<OvertimeRecord {self.record_id}: emp={self.employee_id} {self.hours}h>"
