"""Daily Occurrence Book (OB) model for shift reporting."""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Date, func
from sqlalchemy.orm import relationship
from app.database import Base


class DailyOccurrenceBook(Base):
    """
    Daily Occurrence Book (OB) for recording shift activities.

    Used by security guards to log daily activities, patrols, visitors,
    equipment status, and handovers as required by PSIRA standards.
    """
    __tablename__ = "daily_occurrence_books"

    ob_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id", ondelete="SET NULL"), nullable=True)

    # Shift details
    ob_date = Column(Date, nullable=False, index=True)
    shift_start = Column(DateTime(timezone=True), nullable=False)
    shift_end = Column(DateTime(timezone=True), nullable=True)

    # Weather and site conditions
    weather_conditions = Column(String(100), nullable=True)
    # Examples: "Clear", "Rainy", "Windy", "Hot", "Cold"
    site_conditions = Column(Text, nullable=True)
    # Description of site condition on arrival

    # Patrol activities
    patrol_rounds_completed = Column(Integer, nullable=True)
    patrol_notes = Column(Text, nullable=True)

    # Visitors management
    visitors_logged = Column(Integer, nullable=True, default=0)
    visitor_details = Column(JSON, nullable=True)
    # Format: [{"name": "John Doe", "company": "ABC Ltd", "time_in": "09:00", "time_out": "10:30", "purpose": "Delivery"}]

    # Equipment checks
    equipment_checked = Column(Boolean, nullable=False, default=False)
    equipment_status = Column(Text, nullable=True)
    # Description of equipment checked (radios, torches, panic buttons, CCTV, etc.)
    equipment_issues = Column(Text, nullable=True)
    # Any equipment problems or failures

    # Incidents
    incidents_reported = Column(Integer, nullable=True, default=0)
    incident_summary = Column(Text, nullable=True)
    # Brief summary of incidents (full details in incident_reports table)

    # General observations
    observations = Column(Text, nullable=True)
    unusual_activities = Column(Text, nullable=True)

    # Handover
    handover_notes = Column(Text, nullable=True)
    relieving_officer_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    relieving_officer_name = Column(String(200), nullable=True)
    handover_completed = Column(Boolean, nullable=False, default=False)

    # Keys and assets
    keys_handed_over = Column(Boolean, nullable=False, default=False)
    keys_description = Column(Text, nullable=True)

    # Supervisor review
    supervisor_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    supervisor_reviewed = Column(Boolean, nullable=False, default=False)
    supervisor_comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="daily_reports")
    site = relationship("Site", back_populates="daily_reports")
    shift = relationship("Shift")
    relieving_officer = relationship("Employee", foreign_keys=[relieving_officer_id])
    supervisor = relationship("Employee", foreign_keys=[supervisor_id])

    def __repr__(self):
        return f"<DailyOccurrenceBook(ob_id={self.ob_id}, date='{self.ob_date}', employee_id={self.employee_id})>"
