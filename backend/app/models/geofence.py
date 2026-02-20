"""Geofence violation model."""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class ViolationType(str, enum.Enum):
    EXIT = "exit"           # Guard left the site boundary
    ENTRY_OUTSIDE = "entry_outside"  # Check-in attempted outside boundary
    DRIFT = "drift"         # GPS drift detected outside boundary during shift


class GeofenceViolation(Base):
    """Tracks when a guard's GPS location falls outside site geofence boundary."""

    __tablename__ = "geofence_violations"

    violation_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True, index=True)

    violation_type = Column(String(30), nullable=False, default=ViolationType.EXIT.value)

    # Location at time of violation
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    distance_from_site = Column(Float, nullable=True)  # meters from site center

    # Context
    shift_id = Column(Integer, ForeignKey("shifts.shift_id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    resolved = Column(String(20), default="unresolved")  # unresolved, acknowledged, dismissed

    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site")
    employee = relationship("Employee")

    def __repr__(self):
        return f"<GeofenceViolation {self.violation_id}: emp={self.employee_id} site={self.site_id}>"
