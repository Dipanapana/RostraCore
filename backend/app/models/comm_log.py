"""Control room / communication log model."""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class CommType(str, enum.Enum):
    RADIO = "radio"
    PHONE = "phone"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    IN_PERSON = "in_person"
    ALARM = "alarm"
    CCTV = "cctv"
    OTHER = "other"


class CommPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class CommLog(Base):
    """Log of control room communications and alerts."""

    __tablename__ = "comm_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True, index=True)

    comm_type = Column(String(30), nullable=False, default=CommType.RADIO.value)
    priority = Column(String(20), nullable=False, default=CommPriority.NORMAL.value)
    subject = Column(String(300), nullable=False)
    message = Column(Text, nullable=True)

    # Who was involved
    from_name = Column(String(200), nullable=True)      # Who sent / initiated
    to_name = Column(String(200), nullable=True)         # Who received
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)

    # Resolution
    resolved = Column(String(20), default="open")        # open, resolved, escalated
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Audit
    logged_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site")
    employee = relationship("Employee", foreign_keys=[employee_id])

    def __repr__(self):
        return f"<CommLog {self.log_id}: {self.comm_type} - {self.subject[:30]}>"
