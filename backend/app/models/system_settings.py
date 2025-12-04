"""System settings model for platform-wide configuration.

These settings are configurable by superadmin and override environment defaults.
"""

from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class SystemSettings(Base):
    """
    Platform-wide system settings configurable by superadmin.

    Uses a key-value pattern with typed columns for different data types.
    Only one row exists per setting_key (singleton pattern per setting).
    """
    __tablename__ = "system_settings"

    setting_id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(100), unique=True, nullable=False, index=True)

    # Typed value columns (use the appropriate one based on setting type)
    value_string = Column(String(500), nullable=True)
    value_numeric = Column(Numeric(10, 2), nullable=True)
    value_boolean = Column(Boolean, nullable=True)
    value_text = Column(Text, nullable=True)  # For JSON or longer values

    # Metadata
    description = Column(String(500), nullable=True)
    category = Column(String(50), default="general")  # billing, features, etc.
    is_public = Column(Boolean, default=False)  # Can be fetched without auth?

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, nullable=True)  # User ID who last updated

    def __repr__(self):
        return f"<SystemSettings {self.setting_key}>"


# Pre-defined setting keys for pricing
class SettingKeys:
    """Predefined setting keys for type safety."""

    # Billing/Pricing
    MONTHLY_RATE_PER_GUARD = "billing.monthly_rate_per_guard"
    FREE_TRIAL_DAYS = "billing.free_trial_days"
    CURRENCY = "billing.currency"
    VAT_PERCENTAGE = "billing.vat_percentage"

    # Features
    ROSTER_MAX_DAYS = "features.roster_max_days"
    MAX_GUARDS_PER_SHIFT = "features.max_guards_per_shift"

    # Branding
    PLATFORM_NAME = "branding.platform_name"
    SUPPORT_EMAIL = "branding.support_email"


# Default values for settings
DEFAULT_SETTINGS = {
    SettingKeys.MONTHLY_RATE_PER_GUARD: {
        "value_numeric": 29.00,
        "description": "Monthly rate per active guard in ZAR",
        "category": "billing",
        "is_public": True
    },
    SettingKeys.FREE_TRIAL_DAYS: {
        "value_numeric": 14,
        "description": "Number of free trial days for new organizations",
        "category": "billing",
        "is_public": True
    },
    SettingKeys.CURRENCY: {
        "value_string": "ZAR",
        "description": "Default currency code",
        "category": "billing",
        "is_public": True
    },
    SettingKeys.VAT_PERCENTAGE: {
        "value_numeric": 15.00,
        "description": "VAT percentage for invoices",
        "category": "billing",
        "is_public": True
    },
    SettingKeys.PLATFORM_NAME: {
        "value_string": "GuardianOS",
        "description": "Platform display name",
        "category": "branding",
        "is_public": True
    },
    SettingKeys.SUPPORT_EMAIL: {
        "value_string": "support@guardianos.co.za",
        "description": "Support email address",
        "category": "branding",
        "is_public": True
    }
}
