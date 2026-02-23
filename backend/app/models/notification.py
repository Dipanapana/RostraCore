"""Notification and PushToken models for mobile push and in-app notifications."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from app.database import Base
import enum


class NotificationType(str, enum.Enum):
    SHIFT_REMINDER = "shift_reminder"
    SHIFT_CHANGE = "shift_change"
    SHIFT_CANCELLED = "shift_cancelled"
    INCIDENT = "incident"
    LEAVE_UPDATE = "leave_update"
    GENERAL = "general"
    EMERGENCY = "emergency"


class Notification(Base):
    """In-app notification for a user."""

    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, index=True)

    # Target user
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Content
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False, default="general")

    # Read state
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Optional back-reference to the source entity
    reference_type = Column(String(50), nullable=True)  # 'shift', 'incident', 'leave'
    reference_id = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)


class PushToken(Base):
    """Expo / FCM push notification token for a user's mobile device."""

    __tablename__ = "push_tokens"

    token_id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)

    # The push token string (Expo token or FCM token)
    token = Column(String(500), nullable=False, unique=True)

    # Platform identifier
    platform = Column(String(20), nullable=False)  # 'ios', 'android'

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
