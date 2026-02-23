"""POPIA compliance models -- consent management and data subject requests."""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SQLEnum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ConsentType(str, enum.Enum):
    EMPLOYMENT = "employment"
    BIOMETRIC = "biometric"
    MARKETING = "marketing"
    CCTV = "cctv"
    GPS_TRACKING = "gps_tracking"


class RequestType(str, enum.Enum):
    ACCESS = "access"
    RECTIFICATION = "rectification"
    ERASURE = "erasure"
    PORTABILITY = "portability"
    OBJECTION = "objection"


class RequestStatus(str, enum.Enum):
    RECEIVED = "received"
    PROCESSING = "processing"
    COMPLETED = "completed"
    DENIED = "denied"


class POPIAConsent(Base):
    """POPIA consent record for an individual."""

    __tablename__ = "popia_consents"

    consent_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True, index=True)

    consent_type = Column(SQLEnum(ConsentType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    purpose = Column(Text, nullable=False)
    lawful_basis = Column(String(100), nullable=False)  # consent, contract, legal_obligation, legitimate_interest
    data_categories = Column(String(500), nullable=True)  # comma-separated

    granted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    withdrawn_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Integer, nullable=False, default=1)  # 1=active, 0=withdrawn

    # Relationships
    employee = relationship("Employee")


class DataSubjectRequest(Base):
    """POPIA data subject access/rectification/erasure request."""

    __tablename__ = "data_subject_requests"

    request_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    requestor_name = Column(String(200), nullable=False)
    requestor_email = Column(String(200), nullable=False)
    request_type = Column(SQLEnum(RequestType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    description = Column(Text, nullable=False)

    status = Column(SQLEnum(RequestStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=RequestStatus.RECEIVED, index=True)
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    response_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    handled_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    handled_by = relationship("User", foreign_keys=[handled_by_user_id])
