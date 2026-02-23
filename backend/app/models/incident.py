"""Incident model for security incident reporting via the mobile app."""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class IncidentSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, enum.Enum):
    REPORTED = "reported"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Incident(Base):
    """Security incident reported by a guard via the mobile app."""

    __tablename__ = "incidents"

    incident_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Location
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=True, index=True)

    # Optional link to the shift during which the incident occurred
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=True, index=True)

    # Reporter — either an Employee (guard) or a User account
    reported_by_employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True, index=True)
    reported_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)

    # Incident details
    incident_type = Column(String(100), nullable=False)  # theft, violence, medical, trespassing, fire, vandalism, other
    description = Column(Text, nullable=False)
    severity = Column(SQLEnum(IncidentSeverity, values_callable=lambda x: [e.value for e in x]), nullable=False, default=IncidentSeverity.MEDIUM)
    status = Column(SQLEnum(IncidentStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=IncidentStatus.REPORTED, index=True)

    # GPS coordinates where the incident occurred
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Optional photo evidence (array of URLs)
    photo_urls = Column(ARRAY(String), nullable=True)

    # Timestamps
    reported_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Relationships
    site = relationship("Site")
    reporter_employee = relationship("Employee", foreign_keys=[reported_by_employee_id])
    reporter_user = relationship("User", foreign_keys=[reported_by_user_id])
