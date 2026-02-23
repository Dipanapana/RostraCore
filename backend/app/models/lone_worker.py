"""Lone worker protection model — monitoring sessions for solo guards."""

from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class LoneWorkerStatus(str, enum.Enum):
    ACTIVE = "active"
    OVERDUE = "overdue"
    ESCALATED = "escalated"
    ENDED = "ended"


class LoneWorkerSession(Base):
    """Lone worker monitoring session for a guard working solo."""

    __tablename__ = "lone_worker_sessions"

    session_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Who is being monitored
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    # Shift context
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=True, index=True)

    # Check-in configuration
    check_in_interval_minutes = Column(Integer, nullable=False, default=60)

    # Status tracking
    status = Column(SQLEnum(LoneWorkerStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=LoneWorkerStatus.ACTIVE, index=True)
    last_check_in = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    next_check_in_due = Column(DateTime(timezone=True), nullable=False)
    missed_check_ins = Column(Integer, nullable=False, default=0)

    # Escalation
    escalation_level = Column(Integer, nullable=False, default=0)  # 0=none, 1=warning, 2=supervisor, 3=emergency

    # GPS at last check-in
    last_latitude = Column(Float, nullable=True)
    last_longitude = Column(Float, nullable=True)

    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id])
    user = relationship("User", foreign_keys=[user_id])
    site = relationship("Site")
