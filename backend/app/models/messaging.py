"""In-app messaging models — channels and messages for team communication."""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ChannelType(str, enum.Enum):
    DIRECT = "direct"
    GROUP = "group"
    SITE = "site"
    BROADCAST = "broadcast"


class ChatChannel(Base):
    """Communication channel for messaging."""

    __tablename__ = "chat_channels"

    channel_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    channel_type = Column(SQLEnum(ChannelType, values_callable=lambda x: [e.value for e in x]), nullable=False, default=ChannelType.GROUP)
    name = Column(String(200), nullable=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    site = relationship("Site")
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    members = relationship("ChannelMember", back_populates="channel", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="channel", cascade="all, delete-orphan")


class ChannelMember(Base):
    """Membership in a chat channel."""

    __tablename__ = "channel_members"

    member_id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("chat_channels.channel_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_read_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    channel = relationship("ChatChannel", back_populates="members")
    user = relationship("User")


class ChatMessage(Base):
    """Individual message in a chat channel."""

    __tablename__ = "chat_messages"

    message_id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("chat_channels.channel_id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), nullable=False, default="text")  # text, image, alert
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    read_by = Column(JSON, nullable=True, default=list)  # JSON array of user_ids

    # Relationships
    channel = relationship("ChatChannel", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
