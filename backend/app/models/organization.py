"""Organization (tenant) model for multi-tenancy."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Numeric, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class SubscriptionTier(str, enum.Enum):
    """Subscription tier enum."""
    STARTER = "starter"
    PROFESSIONAL = "professional"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    """Subscription status enum."""
    ACTIVE = "active"
    TRIAL = "trial"
    PAST_DUE = "past_due"  # Payment failed but still active (grace period)
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class Organization(Base):
    """Organization entity representing a security company tenant."""
    __tablename__ = "organizations"

    org_id = Column(Integer, primary_key=True, index=True)
    org_code = Column(String(20), unique=True, nullable=False, index=True)
    company_name = Column(String(200), nullable=False)
    psira_company_registration = Column(String(50), nullable=True)

    # Subscription details
    subscription_tier = Column(String(20), nullable=False, default="starter")
    # Tiers: starter, professional, business, enterprise
    subscription_status = Column(String(20), nullable=False, default="trial")
    # Status: active, trial, suspended, cancelled

    # Trial tracking (14-day free trial)
    trial_start_date = Column(DateTime, nullable=True)  # When trial began
    trial_end_date = Column(DateTime, nullable=True)    # When trial expires (auto-set to start + 14 days)

    # Organization approval workflow (auto-approved for MVP)
    approval_status = Column(String(20), nullable=False, default="approved")
    # Status: pending_approval, approved, rejected (default to approved for immediate access)
    approved_by = Column(Integer, nullable=True)  # user_id of superadmin who approved
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String(500), nullable=True)

    # Limits based on subscription tier
    max_employees = Column(Integer, nullable=True)  # None = unlimited
    max_sites = Column(Integer, nullable=True)
    max_shifts_per_month = Column(Integer, nullable=True)

    # Feature flags (JSON)
    features_enabled = Column(JSON, nullable=True)
    # Example: {"gps_tracking": true, "client_portal": true, "api_access": false}

    # Company profile (for payslips, invoices, compliance)
    logo_url = Column(String(500), nullable=True)  # S3-stored company logo
    address_line1 = Column(String(200), nullable=True)
    address_line2 = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    vat_number = Column(String(20), nullable=True)
    registration_number = Column(String(50), nullable=True)  # CIPC registration
    payslip_template = Column(String(50), default='professional', nullable=False)  # professional, modern, classic

    # Billing
    billing_email = Column(String(255), nullable=True)

    # Per-guard billing (MVP - R29/guard/month)
    active_guard_count = Column(Integer, default=0, nullable=False)  # Auto-calculated
    monthly_rate_per_guard = Column(Numeric(10, 2), default=29.00, nullable=False)  # R29/month
    current_month_cost = Column(Numeric(10, 2), default=0.00, nullable=False)  # Auto-calculated
    last_billing_calculation = Column(DateTime, nullable=True)

    # PayFast Subscription Integration (Legacy/Backup)
    payfast_subscription_token = Column(String(100), nullable=True)  # PayFast subscription token
    payfast_subscription_status = Column(String(20), nullable=True)  # active, paused, cancelled
    subscription_started_at = Column(DateTime, nullable=True)
    subscription_next_billing_date = Column(DateTime, nullable=True)
    payment_method_last_four = Column(String(4), nullable=True)  # Last 4 digits of card
    payment_failures = Column(Integer, default=0, nullable=False)  # Track consecutive failures

    # Yoco Payment Integration (Primary - monthly one-time payments)
    yoco_last_checkout_id = Column(String(100), nullable=True)  # Last Yoco checkout ID
    last_payment_date = Column(DateTime, nullable=True)  # When last payment was made
    last_payment_amount = Column(Numeric(10, 2), nullable=True)  # Amount of last payment
    last_payment_period = Column(String(10), nullable=True)  # e.g., "2024-01" for billing period

    # Client Management Settings
    client_management_mode = Column(String(20), default='all', nullable=False)  # 'all' or 'selected'
    managed_client_ids = Column(ARRAY(Integer), nullable=True)  # Array of client IDs when mode='selected'

    # Metadata
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships (MVP core only)
    users = relationship("User", back_populates="organization")
    employees = relationship("Employee", back_populates="organization")
    clients = relationship("Client", back_populates="organization")
    sites = relationship("Site", back_populates="organization")
    shifts = relationship("Shift", back_populates="organization")
    rosters = relationship("Roster", back_populates="organization")
    roster_preferences = relationship("RosterPreferences", back_populates="organization", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Organization(org_id={self.org_id}, company_name='{self.company_name}', tier='{self.subscription_tier}')>"

    def check_limit(self, resource: str, current_count: int) -> tuple[bool, str]:
        """
        Check if adding a new resource would exceed subscription limits.

        Args:
            resource: 'employees', 'sites', or 'shifts'
            current_count: Current count of resource

        Returns:
            (allowed: bool, message: str)
        """
        limits = {
            'employees': self.max_employees,
            'sites': self.max_sites,
            'shifts': self.max_shifts_per_month
        }

        max_allowed = limits.get(resource)
        if max_allowed is None:
            return True, "Unlimited"

        if current_count >= max_allowed:
            return False, f"Subscription limit reached: {max_allowed} {resource} maximum"

        return True, f"{current_count + 1} of {max_allowed} {resource}"

    def has_feature(self, feature_name: str) -> bool:
        """Check if organization has access to a specific feature."""
        if not self.features_enabled:
            return False
        return self.features_enabled.get(feature_name, False)

    def get_accessible_client_ids(self) -> list[int] | None:
        """
        Returns list of client IDs this org can access, or None for all clients.

        Returns:
            list[int]: List of accessible client IDs when mode='selected'
            None: When mode='all', indicating access to all clients
        """
        if self.client_management_mode == 'all':
            return None  # All clients accessible
        return self.managed_client_ids or []

    @staticmethod
    def get_tier_limits(tier: str) -> dict:
        """Get default limits for a subscription tier."""
        tiers = {
            "starter": {
                "max_employees": 30,
                "max_sites": 5,
                "max_shifts_per_month": 500,
                "features": {
                    "gps_tracking": False,
                    "client_portal": False,
                    "api_access": False,
                    "advanced_analytics": False,
                    "white_label": False
                }
            },
            "professional": {
                "max_employees": 100,
                "max_sites": 15,
                "max_shifts_per_month": 2000,
                "features": {
                    "gps_tracking": True,
                    "client_portal": True,
                    "api_access": False,
                    "advanced_analytics": False,
                    "white_label": False
                }
            },
            "business": {
                "max_employees": 250,
                "max_sites": 40,
                "max_shifts_per_month": 5000,
                "features": {
                    "gps_tracking": True,
                    "client_portal": True,
                    "api_access": True,
                    "advanced_analytics": True,
                    "white_label": False
                }
            },
            "enterprise": {
                "max_employees": None,  # Unlimited
                "max_sites": None,
                "max_shifts_per_month": None,
                "features": {
                    "gps_tracking": True,
                    "client_portal": True,
                    "api_access": True,
                    "advanced_analytics": True,
                    "white_label": True
                }
            }
        }
        return tiers.get(tier, tiers["starter"])
