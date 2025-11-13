"""Marketplace commission models - Revenue tracking."""

from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import relationship
from enum import Enum
from app.database import Base


class CommissionType(str, Enum):
    """Types of commissions charged."""
    HIRE = "hire"  # R500 per successful hire
    PREMIUM_JOB = "premium_job"  # Premium job posting fee
    BULK_PACKAGE = "bulk_package"  # Bulk hiring package purchase


class CommissionStatus(str, Enum):
    """Commission payment status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"  # Deductions in progress
    PAID = "paid"
    WAIVED = "waived"  # Waived for promotional reasons
    REFUNDED = "refunded"


class DeductionMethod(str, Enum):
    """How commission is deducted from salary."""
    FULL = "full"  # Full R500 on first payroll
    SPLIT = "split"  # Split over 3 payrolls (R166.67 each)


class MarketplaceCommission(Base):
    """
    Commission deducted from hired guards for marketplace placement.

    REVISED Revenue Model:
    - Per-hire: R500 deducted from GUARD salary (not company)
    - Deduction methods:
      * FULL: R500 deducted on first payroll
      * SPLIT: R166.67 deducted over 3 payrolls
    - Premium jobs: Companies pay for featured listings
    - Bulk packages: Companies can sponsor guard fees in bulk
    """
    __tablename__ = "marketplace_commissions"

    commission_id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    commission_type = Column(String(50), nullable=False, index=True)

    # Commission details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, server_default="ZAR")
    description = Column(Text, nullable=True)

    # Related records
    job_id = Column(Integer, ForeignKey("job_postings.job_id", ondelete="SET NULL"), nullable=True)
    application_id = Column(Integer, ForeignKey("job_applications.application_id", ondelete="SET NULL"), nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)

    # Salary deduction tracking (NEW - deducted from guard's salary)
    deduction_method = Column(String(50), nullable=True)  # full or split
    installments = Column(Integer, nullable=True)  # 1 or 3
    installments_paid = Column(Integer, default=0)  # How many deductions completed
    amount_per_installment = Column(Numeric(10, 2), nullable=True)  # Amount per payroll
    next_deduction_date = Column(Date, nullable=True)  # Next scheduled deduction

    # Payment tracking
    status = Column(String(50), nullable=False, server_default="pending")
    due_date = Column(Date, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    payment_method = Column(String(50), nullable=True)
    payment_reference = Column(String(200), nullable=True)

    # Metadata
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="marketplace_commissions")
    job_posting = relationship("JobPosting", foreign_keys=[job_id])
    application = relationship("JobApplication", foreign_keys=[application_id])
    employee = relationship("Employee", foreign_keys=[employee_id])

    @property
    def amount_remaining(self):
        """Calculate remaining amount to be deducted."""
        if not self.installments or not self.amount_per_installment:
            return float(self.amount)

        paid_amount = float(self.amount_per_installment) * self.installments_paid
        return float(self.amount) - paid_amount

    @property
    def is_fully_paid(self):
        """Check if commission is fully deducted."""
        if self.status == CommissionStatus.PAID:
            return True
        if self.installments and self.installments_paid >= self.installments:
            return True
        return False


class PackageType(str, Enum):
    """Bulk hiring package types."""
    STARTER = "starter"  # 5 hires, R2000 (R400/hire, 20% discount)
    PROFESSIONAL = "professional"  # 10 hires, R3500 (R350/hire, 30% discount)
    ENTERPRISE = "enterprise"  # 25 hires, R7500 (R300/hire, 40% discount)


class PackageStatus(str, Enum):
    """Package validity status."""
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class BulkHiringPackage(Base):
    """
    Bulk hiring packages for organizations.

    Pricing:
    - Starter: 5 hires @ R2000 (R400/hire, 20% discount)
    - Professional: 10 hires @ R3500 (R350/hire, 30% discount)
    - Enterprise: 25 hires @ R7500 (R300/hire, 40% discount)
    """
    __tablename__ = "bulk_hiring_packages"

    package_id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Package details
    package_type = Column(String(50), nullable=False, index=True)
    hires_quota = Column(Integer, nullable=False)
    hires_used = Column(Integer, default=0)
    price_paid = Column(Numeric(10, 2), nullable=False)
    discount_percentage = Column(Float, nullable=True)

    # Validity
    start_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False, server_default="active")

    # Payment
    payment_status = Column(String(50), nullable=False, server_default="pending")
    paid_at = Column(DateTime(timezone=True), nullable=True)
    payment_reference = Column(String(200), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="bulk_packages")

    @property
    def hires_remaining(self):
        """Calculate remaining hires in package."""
        return max(0, self.hires_quota - self.hires_used)

    @property
    def is_valid(self):
        """Check if package is still valid."""
        if self.status != "active":
            return False
        if self.hires_remaining <= 0:
            return False
        if self.end_date and self.end_date < func.now():
            return False
        return True


class PremiumJobPosting(Base):
    """
    Premium job postings with enhanced visibility.

    Features:
    - Featured badge (gold/silver/bronze)
    - Priority ranking in search results
    - Visibility boost
    - Analytics tracking

    Pricing:
    - Bronze: R200 (7 days, 2x visibility)
    - Silver: R350 (14 days, 3x visibility)
    - Gold: R500 (30 days, 5x visibility)
    """
    __tablename__ = "premium_job_postings"

    premium_job_id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.job_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Premium features
    featured = Column(Boolean, default=True)
    priority_rank = Column(Integer, default=1)
    badge_color = Column(String(50), nullable=True)  # gold, silver, bronze
    boost_multiplier = Column(Float, default=2.0)

    # Duration
    start_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=False)
    auto_renew = Column(Boolean, default=False)

    # Pricing
    price_paid = Column(Numeric(10, 2), nullable=False)
    payment_status = Column(String(50), nullable=False, server_default="pending")
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Analytics
    views_count = Column(Integer, default=0)
    applications_count = Column(Integer, default=0)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    job_posting = relationship("JobPosting", back_populates="premium_listing")
    organization = relationship("Organization", back_populates="premium_jobs")

    @property
    def is_active(self):
        """Check if premium listing is currently active."""
        from datetime import datetime
        now = datetime.utcnow()
        return (
            self.payment_status == "paid" and
            self.start_date <= now and
            self.end_date >= now
        )
