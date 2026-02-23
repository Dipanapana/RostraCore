"""Biometric template model for employee identity enrolment."""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from app.database import Base
from datetime import datetime


class BiometricTemplate(Base):
    """Stored biometric reference template for employee verification."""

    __tablename__ = "biometric_templates"

    template_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(
        Integer,
        ForeignKey("organizations.org_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id = Column(
        Integer,
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Template data
    template_type = Column(String(30), nullable=False)  # face, fingerprint, voice
    storage_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=False)  # SHA-256 for integrity

    # Enrolment tracking
    enrolled_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    enrolled_by = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    # Lifecycle
    is_active = Column(Boolean, nullable=False, default=True)
    deactivated_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return (
            f"<BiometricTemplate(template_id={self.template_id}, employee_id={self.employee_id}, "
            f"type={self.template_type}, active={self.is_active})>"
        )
