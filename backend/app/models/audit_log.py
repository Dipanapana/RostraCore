"""Audit log model for tracking entity changes."""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base
from datetime import datetime


class AuditLog(Base):
    """Immutable audit trail for entity-level changes."""

    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(
        Integer,
        ForeignKey("organizations.org_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # What changed
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    action = Column(String(30), nullable=False, index=True)  # create, update, delete, etc.
    changes = Column(JSONB, nullable=True)  # {field: {old: X, new: Y}}
    reason = Column(Text, nullable=True)

    # Who changed it
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)

    # When and where
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6

    def __repr__(self):
        return (
            f"<AuditLog(log_id={self.log_id}, entity={self.entity_type}:{self.entity_id}, "
            f"action={self.action})>"
        )
