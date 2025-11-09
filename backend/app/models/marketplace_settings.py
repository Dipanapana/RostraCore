"""Marketplace settings model - Configurable pricing and features."""

from sqlalchemy import Column, Integer, String, DateTime, Text, func
from sqlalchemy.dialects.postgresql import JSON
from app.database import Base
from typing import Dict, Any


class MarketplaceSettings(Base):
    """
    Configurable marketplace settings.

    All pricing and feature settings managed from superadmin dashboard.
    No hardcoded prices in application code.
    """
    __tablename__ = "marketplace_settings"

    setting_id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(100), nullable=False, unique=True, index=True)
    setting_value = Column(JSON, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True)  # pricing, features, limits
    updated_by = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    @staticmethod
    def get_setting(db, key: str, default: Any = None) -> Any:
        """Get a setting value by key."""
        setting = db.query(MarketplaceSettings).filter(
            MarketplaceSettings.setting_key == key
        ).first()

        if setting:
            return setting.setting_value
        return default

    @staticmethod
    def get_cv_price(db) -> float:
        """Get CV generation price."""
        setting = MarketplaceSettings.get_setting(db, 'cv_generation_price', {'amount': 60})
        return float(setting.get('amount', 60))

    @staticmethod
    def get_commission_settings(db) -> Dict[str, Any]:
        """Get marketplace commission settings."""
        return MarketplaceSettings.get_setting(db, 'marketplace_commission', {
            'amount': 500,
            'currency': 'ZAR',
            'deduction_method': 'split',
            'installments': 3
        })

    @staticmethod
    def get_premium_job_pricing(db, tier: str) -> Dict[str, Any]:
        """Get premium job pricing for a tier (bronze, silver, gold)."""
        key = f'premium_job_{tier.lower()}'
        defaults = {
            'bronze': {'price': 200, 'duration_days': 7, 'boost_multiplier': 2.0, 'priority_rank': 3},
            'silver': {'price': 350, 'duration_days': 14, 'boost_multiplier': 3.0, 'priority_rank': 2},
            'gold': {'price': 500, 'duration_days': 30, 'boost_multiplier': 5.0, 'priority_rank': 1}
        }
        return MarketplaceSettings.get_setting(db, key, defaults.get(tier.lower(), {}))

    @staticmethod
    def get_bulk_package_pricing(db, package_type: str) -> Dict[str, Any]:
        """Get bulk package pricing (starter, professional, enterprise)."""
        key = f'bulk_package_{package_type.lower()}'
        defaults = {
            'starter': {'hires': 5, 'price': 2000, 'price_per_hire': 400, 'discount_percent': 20},
            'professional': {'hires': 10, 'price': 3500, 'price_per_hire': 350, 'discount_percent': 30},
            'enterprise': {'hires': 25, 'price': 7500, 'price_per_hire': 300, 'discount_percent': 40}
        }
        return MarketplaceSettings.get_setting(db, key, defaults.get(package_type.lower(), {}))

    @staticmethod
    def update_setting(db, key: str, value: Dict[str, Any], updated_by: int = None) -> 'MarketplaceSettings':
        """Update or create a setting."""
        setting = db.query(MarketplaceSettings).filter(
            MarketplaceSettings.setting_key == key
        ).first()

        if setting:
            setting.setting_value = value
            setting.updated_by = updated_by
        else:
            setting = MarketplaceSettings(
                setting_key=key,
                setting_value=value,
                updated_by=updated_by,
                category='pricing'
            )
            db.add(setting)

        db.commit()
        db.refresh(setting)
        return setting
