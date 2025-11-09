"""CV Generation models."""

from sqlalchemy import Column, Integer, String, DateTime, Numeric, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from enum import Enum


class PaymentStatus(str, Enum):
    """Payment status enum."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    """Payment method enum."""
    CARD = "card"
    EFT = "eft"
    CASH = "cash"
    VOUCHER = "voucher"


class CVTemplate(str, Enum):
    """CV template types."""
    PROFESSIONAL = "professional"
    MODERN = "modern"
    CLASSIC = "classic"


class CVFormat(str, Enum):
    """CV format types."""
    PDF = "pdf"
    DOCX = "docx"


class CVPurchase(Base):
    """CV Purchase model - R60 CV generation payment."""

    __tablename__ = "cv_purchases"

    purchase_id = Column(Integer, primary_key=True, index=True)
    applicant_id = Column(Integer, ForeignKey("guard_applicants.applicant_id", ondelete="CASCADE"), nullable=False, index=True)

    # Payment Details
    amount = Column(Numeric(10, 2), nullable=False, server_default='60.00')
    payment_method = Column(String(50), nullable=False)
    payment_reference = Column(String(200), nullable=True)
    payment_status = Column(String(50), nullable=False, server_default='pending')
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    applicant = relationship("GuardApplicant", back_populates="cv_purchases")
    generated_cvs = relationship("GeneratedCV", back_populates="purchase")

    def __repr__(self):
        return f"<CVPurchase {self.purchase_id}: R{self.amount} - {self.payment_status}>"


class GeneratedCV(Base):
    """Generated CV model - Tracks all generated CVs."""

    __tablename__ = "generated_cvs"

    cv_id = Column(Integer, primary_key=True, index=True)
    applicant_id = Column(Integer, ForeignKey("guard_applicants.applicant_id", ondelete="CASCADE"), nullable=False, index=True)
    purchase_id = Column(Integer, ForeignKey("cv_purchases.purchase_id", ondelete="SET NULL"), nullable=True)

    # CV Details
    template_name = Column(String(50), nullable=False, index=True)
    format = Column(String(10), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)

    # CV Content (stored for regeneration)
    cv_data = Column(JSON, nullable=True)

    # Download tracking
    download_count = Column(Integer, default=0)
    last_downloaded = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    applicant = relationship("GuardApplicant", back_populates="generated_cvs")
    purchase = relationship("CVPurchase", back_populates="generated_cvs")

    def __repr__(self):
        return f"<GeneratedCV {self.cv_id}: {self.template_name} - {self.format}>"
