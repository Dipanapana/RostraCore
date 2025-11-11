"""Incident Report model for PSIRA-compliant incident reporting."""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Numeric, JSON, ForeignKey, Date, func, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from enum import Enum


class IncidentType(str, Enum):
    """Types of security incidents"""
    THEFT = "theft"
    BURGLARY = "burglary"
    ASSAULT = "assault"
    TRESPASSING = "trespassing"
    VANDALISM = "vandalism"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    FIRE = "fire"
    MEDICAL_EMERGENCY = "medical_emergency"
    EQUIPMENT_FAILURE = "equipment_failure"
    ACCESS_CONTROL_BREACH = "access_control_breach"
    VEHICLE_INCIDENT = "vehicle_incident"
    ARMED_ROBBERY = "armed_robbery"
    PROTEST_UNREST = "protest_unrest"
    BOMB_THREAT = "bomb_threat"
    OTHER = "other"


class IncidentSeverity(str, Enum):
    """Severity levels for incidents"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentCategory(str, Enum):
    """Categories of incidents"""
    CRIME = "crime"
    SAFETY = "safety"
    OPERATIONAL = "operational"
    CLIENT_PROPERTY = "client_property"
    ENVIRONMENTAL = "environmental"
    PERSONNEL = "personnel"


class IncidentStatus(str, Enum):
    """Status of incident investigation"""
    OPEN = "open"
    UNDER_INVESTIGATION = "under_investigation"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IncidentReport(Base):
    """
    PSIRA-compliant incident report model.

    Captures all required information for security incidents in South Africa,
    including police involvement, witness statements, and supervisor review.
    """
    __tablename__ = "incident_reports"

    incident_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    supervisor_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)

    # Dates
    incident_date = Column(DateTime(timezone=True), nullable=False, index=True)
    reported_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Classification
    incident_type = Column(SQLEnum(IncidentType), nullable=False, index=True)
    severity = Column(SQLEnum(IncidentSeverity), nullable=False)
    incident_category = Column(SQLEnum(IncidentCategory), nullable=True)

    # Location
    location_details = Column(Text, nullable=True)
    exact_location = Column(String(500), nullable=True)

    # Description
    description = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)

    # Parties involved
    suspect_details = Column(Text, nullable=True)
    victim_details = Column(Text, nullable=True)
    witness_details = Column(Text, nullable=True)

    # Official response
    police_notified = Column(Boolean, nullable=False, default=False)
    police_case_number = Column(String(100), nullable=True)
    police_station = Column(String(200), nullable=True)
    client_notified = Column(Boolean, nullable=False, default=False)
    client_notified_at = Column(DateTime(timezone=True), nullable=True)

    # Medical/Emergency
    injuries_reported = Column(Boolean, nullable=False, default=False)
    medical_attention_required = Column(Boolean, nullable=False, default=False)
    ambulance_called = Column(Boolean, nullable=False, default=False)

    # Property/Evidence
    property_damage = Column(Boolean, nullable=False, default=False)
    property_damage_description = Column(Text, nullable=True)
    estimated_loss_value = Column(Numeric(10, 2), nullable=True)
    evidence_collected = Column(Boolean, nullable=False, default=False)
    evidence_description = Column(Text, nullable=True)

    # Attachments
    photos_attached = Column(Boolean, nullable=False, default=False)
    photo_urls = Column(JSON, nullable=True)
    document_urls = Column(JSON, nullable=True)

    # Supervisor review
    supervisor_reviewed = Column(Boolean, nullable=False, default=False)
    supervisor_comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Follow-up
    follow_up_required = Column(Boolean, nullable=False, default=False)
    follow_up_notes = Column(Text, nullable=True)
    status = Column(SQLEnum(IncidentStatus), nullable=False, default=IncidentStatus.OPEN, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="incident_reports")
    site = relationship("Site", back_populates="incident_reports")
    supervisor = relationship("Employee", foreign_keys=[supervisor_id])

    def __repr__(self):
        return f"<IncidentReport(incident_id={self.incident_id}, type='{self.incident_type}', severity='{self.severity}')>"
