"""Emergency alert model for panic/duress button functionality."""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class AlertType(str, enum.Enum):
    PANIC = "panic"
    DURESS = "duress"
    MEDICAL = "medical"
    FIRE = "fire"


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    DISPATCHED = "dispatched"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"


class EmergencyAlert(Base):
    """Emergency alert triggered by a guard via panic/duress button."""

    __tablename__ = "emergency_alerts"

    alert_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Who triggered the alert
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True, index=True)
    triggered_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)

    # Alert details
    alert_type = Column(String(20), nullable=False, default="panic")
    status = Column(String(20), nullable=False, default="active", index=True)

    # GPS location at time of alert
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Optional context
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=True)
    notes = Column(Text, nullable=True)

    # Linked incident (auto-created)
    related_incident_id = Column(Integer, ForeignKey("incidents.incident_id"), nullable=True)

    # Response tracking
    acknowledged_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Timestamps
    triggered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id])
    triggered_by = relationship("User", foreign_keys=[triggered_by_user_id])
    acknowledged_by = relationship("User", foreign_keys=[acknowledged_by_user_id])
    site = relationship("Site")
    related_incident = relationship("Incident")
