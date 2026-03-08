"""Client service request / ticket model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base


class ClientRequest(Base):
    __tablename__ = "client_requests"

    request_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True, index=True)

    requested_by = Column(String(200), nullable=False)
    request_type = Column(String(50), nullable=False, default="general")
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(20), nullable=False, default="medium")
    status = Column(String(20), nullable=False, default="open")

    assigned_to_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization")
    client = relationship("Client")
    site = relationship("Site")
    assigned_user = relationship("User", foreign_keys=[assigned_to_user_id])

    def __repr__(self):
        return f"<ClientRequest {self.request_id}: {self.subject}>"
