"""Daily Activity Report (DAR) model.

Guards submit end-of-shift activity summaries.
"""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class DARStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"


class DailyActivityReport(Base):
    """A guard's daily / shift activity report."""

    __tablename__ = "daily_activity_reports"

    report_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id", ondelete="SET NULL"), nullable=True)

    report_date = Column(DateTime, nullable=False)
    shift_start = Column(DateTime, nullable=True)
    shift_end = Column(DateTime, nullable=True)

    # Content
    summary = Column(Text, nullable=False)
    patrols_completed = Column(Integer, default=0)
    incidents_reported = Column(Integer, default=0)
    visitors_processed = Column(Integer, default=0)
    access_denied_count = Column(Integer, default=0)
    notable_events = Column(Text, nullable=True)
    equipment_issues = Column(Text, nullable=True)
    handover_notes = Column(Text, nullable=True)

    status = Column(String(30), default="submitted")
    reviewed_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site")
    employee = relationship("Employee")

    def __repr__(self):
        return f"<DAR {self.report_id}: site={self.site_id} date={self.report_date}>"
