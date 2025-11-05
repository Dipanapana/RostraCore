"""Organization (tenant) model for multi-tenancy."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
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
    subscription_status = Column(String(20), nullable=False, default="active")
    # Status: active, trial, suspended, cancelled

    # Limits based on subscription tier
    max_employees = Column(Integer, nullable=True)  # None = unlimited
    max_sites = Column(Integer, nullable=True)
    max_shifts_per_month = Column(Integer, nullable=True)

    # Feature flags (JSON)
    features_enabled = Column(JSON, nullable=True)
    # Example: {"gps_tracking": true, "client_portal": true, "api_access": false}

    # Billing
    billing_email = Column(String(255), nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

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
