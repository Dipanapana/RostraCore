"""Site maintenance request model."""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class MaintenancePriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MaintenanceStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MaintenanceRequest(Base):
    """Site maintenance / repair request."""

    __tablename__ = "maintenance_requests"

    request_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)  # electrical, plumbing, structural, security_equipment, hvac, other
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="open")

    reported_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reported_by_name = Column(String(200), nullable=True)
    assigned_to = Column(String(200), nullable=True)  # Maintenance person or contractor name

    estimated_cost = Column(Integer, nullable=True)  # cents
    actual_cost = Column(Integer, nullable=True)

    completed_at = Column(DateTime, nullable=True)
    completion_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site")

    def __repr__(self):
        return f"<MaintenanceRequest {self.request_id}: {self.title}>"
