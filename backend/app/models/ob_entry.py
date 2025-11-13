"""OB Entry model for individual occurrence book entries via mobile app."""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, func, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from enum import Enum


class OBCategory(str, Enum):
    """Categories for Occurrence Book entries"""
    VISITOR = "visitor"  # Visitor log (name, ID, time in/out)
    KEY_HANDOVER = "key_handover"  # Keys issued/returned
    ALARM = "alarm"  # Alarm activations (zone, response)
    PATROL = "patrol"  # Patrol completed (areas checked)
    EQUIPMENT = "equipment"  # Equipment status (working/faulty)
    OBSERVATION = "observation"  # General observations
    HANDOVER = "handover"  # Shift handover notes
    OTHER = "other"  # Other activities


class OBEntry(Base):
    """
    Individual Occurrence Book entry for mobile app.

    Guards can quickly log timestamped entries throughout their shift
    with category-specific data and optional photo attachments.
    """
    __tablename__ = "ob_entries"

    entry_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id", ondelete="SET NULL"), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Entry details
    category = Column(SQLEnum(OBCategory), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    description = Column(Text, nullable=False)

    # Category-specific structured data (JSON)
    # Examples:
    # VISITOR: {"name": "John Doe", "id_number": "123456", "company": "ABC Ltd", "time_in": "09:00", "time_out": "10:30", "purpose": "Delivery"}
    # KEY_HANDOVER: {"key_id": "K-123", "action": "issued/returned", "recipient": "John Doe", "signature": "url"}
    # ALARM: {"zone": "Zone 3", "type": "motion", "response": "False alarm", "reset_time": "09:15"}
    # PATROL: {"route": "Route A", "checkpoints": ["CP1", "CP2", "CP3"], "duration_mins": 25, "issues": "None"}
    # EQUIPMENT: {"item": "Radio-05", "status": "faulty", "issue": "Low battery", "reported": true}
    entry_data = Column(JSON, nullable=True)

    # Media attachments
    photo_urls = Column(JSON, nullable=True)
    # Array of photo URLs (up to 3 per entry)

    # GPS location (captured from mobile device)
    latitude = Column(String(50), nullable=True)
    longitude = Column(String(50), nullable=True)
    location_accuracy = Column(String(50), nullable=True)  # Meters

    # Supervisor review
    supervisor_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    supervisor_reviewed = Column(Boolean, default=False, nullable=False)
    supervisor_comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    requires_review = Column(Boolean, default=False, nullable=False)
    # Flag for entries that need supervisor attention (e.g., equipment faults, alarms)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="ob_entries")
    site = relationship("Site", back_populates="ob_entries")
    shift = relationship("Shift")
    organization = relationship("Organization")
    supervisor = relationship("Employee", foreign_keys=[supervisor_id])

    def __repr__(self):
        return f"<OBEntry(entry_id={self.entry_id}, category='{self.category}', timestamp='{self.timestamp}')>"
