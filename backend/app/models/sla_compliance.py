"""SLA (Service Level Agreement) compliance tracking model."""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class SLAStatus(str, enum.Enum):
    COMPLIANT = "compliant"
    AT_RISK = "at_risk"
    BREACHED = "breached"


class SLARecord(Base):
    """Monthly SLA compliance record per site."""

    __tablename__ = "sla_records"

    record_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    period_month = Column(Integer, nullable=False)  # 1-12
    period_year = Column(Integer, nullable=False)

    # Coverage metrics (percentage 0-100)
    coverage_target = Column(Float, default=95.0)  # Required staffing coverage %
    coverage_actual = Column(Float, nullable=True)
    coverage_status = Column(String(20), default="compliant")

    # Response time metrics (minutes)
    response_target_mins = Column(Integer, default=30)  # Max response time target
    response_avg_mins = Column(Integer, nullable=True)
    response_status = Column(String(20), default="compliant")

    # Incident resolution (hours)
    resolution_target_hrs = Column(Integer, default=24)
    resolution_avg_hrs = Column(Integer, nullable=True)
    resolution_status = Column(String(20), default="compliant")

    # Overall
    overall_score = Column(Float, nullable=True)  # 0-100 weighted score
    overall_status = Column(String(20), default="compliant")

    notes = Column(Text, nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site")

    def __repr__(self):
        return f"<SLARecord {self.record_id}: site={self.site_id} {self.period_year}-{self.period_month}>"
