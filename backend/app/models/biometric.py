"""Biometric authentication models."""

from sqlalchemy import Column, Integer, String, LargeBinary, Numeric, Boolean, DateTime, Date, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TemplateType(str, enum.Enum):
    """Biometric template types."""
    FACIAL_FACENET512 = "facial_facenet512"
    FINGERPRINT_WEBAUTHN = "fingerprint_webauthn"


class EnrollmentStatus(str, enum.Enum):
    """Enrollment session status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class VerificationStatus(str, enum.Enum):
    """Verification attempt status."""
    SUCCESS = "success"
    SUCCESS_WITH_WARNING = "success_with_warning"
    FAILED = "failed"


class BiometricTemplate(Base):
    """Biometric template storage with encrypted face embeddings."""

    __tablename__ = "biometric_templates"

    template_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Employee relationship
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    # Template details
    template_type = Column(String(50), nullable=False)  # facial_facenet512, fingerprint_webauthn
    encrypted_template = Column(LargeBinary, nullable=False)  # pgcrypto-encrypted 512-d vector as JSON
    embedding_dimensions = Column(Integer, nullable=False)  # e.g., 512 for FaceNet512
    quality_score = Column(Numeric(5, 2), nullable=True)  # 0-100 enrollment quality

    # Enrollment metadata
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    enrolled_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)  # HR user

    # Status
    is_active = Column(Boolean, default=True)

    # Constraints
    __table_args__ = (
        UniqueConstraint('employee_id', 'template_type', name='uq_employee_template_type'),
    )

    # Relationships
    employee = relationship("Employee")
    enrolled_by_user = relationship("User", foreign_keys=[enrolled_by])

    def __repr__(self):
        return f"<BiometricTemplate {self.template_id}: Employee {self.employee_id}, Type {self.template_type}>"


class EnrollmentSession(Base):
    """Enrollment session tracking for biometric capture."""

    __tablename__ = "enrollment_sessions"

    session_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Employee relationship
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    # Session metadata
    initiated_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)  # HR user
    status = Column(String(20), nullable=False, default="pending")  # pending, in_progress, completed, failed
    template_type = Column(String(50), nullable=False)

    # Attempt tracking
    attempts = Column(Integer, default=0)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    quality_feedback = Column(Text, nullable=True)  # JSON string of quality check results

    # Grace period
    grace_period_end = Column(Date, nullable=True)  # When manual clock-ins stop being allowed

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("Employee")
    initiated_by_user = relationship("User", foreign_keys=[initiated_by])

    def __repr__(self):
        return f"<EnrollmentSession {self.session_id}: Employee {self.employee_id}, Status {self.status}>"


class VerificationAttempt(Base):
    """Biometric verification attempt logging."""

    __tablename__ = "verification_attempts"

    attempt_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Employee relationship
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    # Verification details
    template_type = Column(String(50), nullable=False)
    confidence = Column(Numeric(5, 2), nullable=False)  # 0-100 percentage
    threshold_used = Column(Numeric(5, 2), nullable=False)  # What threshold was applied
    status = Column(String(20), nullable=False)  # success, success_with_warning, failed
    requires_hr_review = Column(Boolean, default=False)

    # GPS data
    gps_lat = Column(Numeric(10, 7), nullable=True)
    gps_lng = Column(Numeric(10, 7), nullable=True)
    gps_accuracy = Column(Numeric(8, 2), nullable=True)  # meters

    # Device information
    device_type = Column(String(50), nullable=True)  # phone, desktop, hardware_terminal

    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Indexes for adaptive threshold queries
    __table_args__ = (
        Index('ix_verification_employee_created', 'employee_id', 'created_at'),
    )

    # Relationships
    employee = relationship("Employee")

    def __repr__(self):
        return f"<VerificationAttempt {self.attempt_id}: Employee {self.employee_id}, Confidence {self.confidence}>"
