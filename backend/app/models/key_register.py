"""Key holding / access management model."""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class KeyStatus(str, enum.Enum):
    AVAILABLE = "available"
    ISSUED = "issued"
    LOST = "lost"
    DECOMMISSIONED = "decommissioned"


class KeyRegister(Base):
    """Tracks keys/access cards for secured sites."""

    __tablename__ = "key_register"

    key_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)

    key_number = Column(String(50), nullable=False)       # Physical key label / number
    key_type = Column(String(50), nullable=False)          # master, gate, office, access_card, remote, padlock
    description = Column(String(200), nullable=True)       # e.g. "Main entrance gate key"
    status = Column(String(20), nullable=False, default=KeyStatus.AVAILABLE.value)

    # Current holder
    issued_to_employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    issued_at = Column(DateTime, nullable=True)
    issued_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site")
    holder = relationship("Employee", foreign_keys=[issued_to_employee_id])

    def __repr__(self):
        return f"<KeyRegister {self.key_id}: {self.key_number} @ site {self.site_id}>"


class KeyLog(Base):
    """Audit log for key issue/return actions."""

    __tablename__ = "key_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    key_id = Column(Integer, ForeignKey("key_register.key_id", ondelete="CASCADE"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)

    action = Column(String(20), nullable=False)  # issued, returned, lost, decommissioned
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    performed_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    key = relationship("KeyRegister")
    employee = relationship("Employee", foreign_keys=[employee_id])

    def __repr__(self):
        return f"<KeyLog {self.log_id}: key={self.key_id} action={self.action}>"
