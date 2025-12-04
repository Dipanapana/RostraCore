"""Refresh token model for long-lived sessions."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class RefreshToken(Base):
    """Refresh token model for maintaining user sessions."""

    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    # Token metadata
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked = Column(Boolean, default=False, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    # Device/session tracking
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(50), nullable=True)

    # Relationships
    user = relationship("User")

    def __repr__(self):
        return f"<RefreshToken {self.id}: user={self.user_id}, revoked={self.revoked}>"
