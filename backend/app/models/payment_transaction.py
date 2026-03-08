"""Payment transaction model for tracking individual payments."""

from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PaymentGateway(str, enum.Enum):
    """Payment gateway enum."""
    YOCO = "yoco"
    PAYFAST = "payfast"


class TransactionStatus(str, enum.Enum):
    """Transaction status enum."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentTransaction(Base):
    """Individual payment transaction record."""
    __tablename__ = "payment_transactions"

    transaction_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    # Gateway details
    gateway = Column(String(20), nullable=False)  # "yoco" or "payfast"
    gateway_transaction_id = Column(String(200), nullable=True, index=True)
    gateway_status = Column(String(50), nullable=True)  # Raw status from gateway

    # Transaction details
    status = Column(String(20), nullable=False, default="pending")
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="ZAR")
    billing_period = Column(String(10), nullable=True)  # e.g. "2026-03"
    guard_count = Column(Integer, nullable=True)

    # Metadata
    description = Column(String(500), nullable=True)
    metadata_json = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), nullable=True)

    # Relationships
    organization = relationship("Organization", backref="payment_transactions")

    def __repr__(self):
        return f"<PaymentTransaction(id={self.transaction_id}, gateway={self.gateway}, status={self.status}, amount={self.amount})>"
