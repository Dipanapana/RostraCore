"""RosterUploadLog model - tracks every site roster file upload."""

from sqlalchemy import Column, Integer, String, Float, DateTime, Date, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class RosterUploadLog(Base):
    """Tracks every roster file upload for auditing, duplicate detection, and troubleshooting."""

    __tablename__ = "roster_upload_logs"

    upload_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.roster_id", ondelete="SET NULL"), nullable=True)

    # Upload metadata
    filename = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    upload_format = Column(String(50), nullable=False, default="mafoko")  # mafoko, rostracore, easyroster
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Parsed header info
    parsed_province = Column(String(100), nullable=True)
    parsed_client = Column(String(200), nullable=True)
    parsed_site_code = Column(String(50), nullable=True)
    parsed_site_name = Column(String(200), nullable=True)
    parsed_schedule = Column(String(50), nullable=True)
    parsed_start_date = Column(Date, nullable=True)
    parsed_end_date = Column(Date, nullable=True)

    # Resolved references
    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="SET NULL"), nullable=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True)

    # Results
    status = Column(String(20), nullable=False, default="processing")  # processing, completed, failed, replaced
    employees_matched = Column(Integer, default=0)
    employees_unmatched = Column(Integer, default=0)
    shifts_created = Column(Integer, default=0)
    assignments_created = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)
    warnings = Column(JSON, nullable=True)
    errors = Column(JSON, nullable=True)
    suggestions = Column(JSON, nullable=True)

    # Relationships
    organization = relationship("Organization")
    roster = relationship("Roster")
    uploader = relationship("User", foreign_keys=[uploaded_by])
    client = relationship("Client")
    site = relationship("Site")
