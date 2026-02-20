"""Company announcement / noticeboard model."""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class AnnouncementPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Announcement(Base):
    """Company-wide or site-specific announcement."""

    __tablename__ = "announcements"

    announcement_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String(20), default="normal")
    category = Column(String(50), nullable=True)  # general, policy, safety, hr, operations

    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True)  # null = all sites
    is_pinned = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    published_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    author_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    author_name = Column(String(200), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site")

    def __repr__(self):
        return f"<Announcement {self.announcement_id}: {self.title}>"
