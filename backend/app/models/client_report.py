"""Client report model — periodic report generated for clients."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base


class ClientReport(Base):
    """Generated report shared with a client."""

    __tablename__ = "client_reports"

    report_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True)

    title = Column(String(200), nullable=False)
    report_type = Column(String(50), nullable=False)  # monthly_summary, incident_report, sla_review, coverage_report
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)

    summary = Column(Text, nullable=True)
    content_json = Column(Text, nullable=True)  # JSON blob with report data

    status = Column(String(20), default="draft")  # draft, published, archived

    created_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization")
    client = relationship("Client")
    site = relationship("Site")

    def __repr__(self):
        return f"<ClientReport {self.report_id}: {self.title}>"
