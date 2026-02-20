"""Daily Occurrence Book (DOB) model.

Standard security industry log for recording all events at a site during a shift.
"""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class OccurrenceCategory(str, enum.Enum):
    GENERAL = "general"
    PATROL = "patrol"
    ACCESS_CONTROL = "access_control"
    ALARM = "alarm"
    INCIDENT = "incident"
    MAINTENANCE = "maintenance"
    HANDOVER = "handover"
    WEATHER = "weather"
    VISITOR = "visitor"
    DELIVERY = "delivery"
    VEHICLE = "vehicle"
    OTHER = "other"


class OccurrenceEntry(Base):
    """Single entry in the Daily Occurrence Book."""

    __tablename__ = "occurrence_entries"

    entry_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)

    category = Column(String(30), nullable=False, default=OccurrenceCategory.GENERAL.value)
    description = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=True)

    # Who logged it
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    occurred_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site")
    employee = relationship("Employee", foreign_keys=[employee_id])

    def __repr__(self):
        return f"<OccurrenceEntry {self.entry_id}: {self.category} @ site {self.site_id}>"
