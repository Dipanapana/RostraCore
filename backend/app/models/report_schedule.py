"""Report schedule model for automated report generation and delivery."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ReportFrequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ReportType(str, enum.Enum):
    DAILY_ACTIVITY = "daily_activity"
    WEEKLY_SUMMARY = "weekly_summary"
    MONTHLY_COMPLIANCE = "monthly_compliance"
    INCIDENT_SUMMARY = "incident_summary"
    PATROL_REPORT = "patrol_report"
    ATTENDANCE_REPORT = "attendance_report"
    PAYROLL_SUMMARY = "payroll_summary"


class ReportSchedule(Base):
    """Scheduled automated report generation and email delivery."""

    __tablename__ = "report_schedules"

    schedule_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Report config
    report_type = Column(SQLEnum(ReportType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    name = Column(String(200), nullable=False)

    # Frequency
    frequency = Column(SQLEnum(ReportFrequency, values_callable=lambda x: [e.value for e in x]), nullable=False)
    day_of_week = Column(Integer, nullable=True)  # 0=Mon, 6=Sun (for weekly)
    day_of_month = Column(Integer, nullable=True)  # 1-28 (for monthly)
    time_of_day = Column(String(5), nullable=False, default="08:00")  # HH:MM

    # Recipients
    recipients = Column(JSON, nullable=False, default=list)  # array of email addresses
    client_id = Column(Integer, ForeignKey("clients.client_id"), nullable=True)

    # Filters
    site_ids = Column(JSON, nullable=True)  # array of site IDs to include

    # Status
    enabled = Column(Boolean, nullable=False, default=True)
    last_sent_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(String(500), nullable=True)

    # Audit
    created_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    client = relationship("Client")
