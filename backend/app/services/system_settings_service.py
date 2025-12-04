"""Service for managing system settings."""

from typing import Dict, Optional, Any
from sqlalchemy.orm import Session
from decimal import Decimal
from app.models.system_settings import SystemSettings, SettingKeys, DEFAULT_SETTINGS
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class SystemSettingsService:
    """Service for system settings CRUD operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_setting(self, key: str) -> Optional[Any]:
        """
        Get a setting value by key.

        Returns the value from database if exists, otherwise returns default.
        """
        setting = self.db.query(SystemSettings).filter(
            SystemSettings.setting_key == key
        ).first()

        if setting:
            # Return the appropriate typed value
            if setting.value_numeric is not None:
                return float(setting.value_numeric)
            elif setting.value_string is not None:
                return setting.value_string
            elif setting.value_boolean is not None:
                return setting.value_boolean
            elif setting.value_text is not None:
                return setting.value_text

        # Return default from DEFAULT_SETTINGS or environment
        if key in DEFAULT_SETTINGS:
            defaults = DEFAULT_SETTINGS[key]
            if "value_numeric" in defaults:
                return float(defaults["value_numeric"])
            elif "value_string" in defaults:
                return defaults["value_string"]
            elif "value_boolean" in defaults:
                return defaults["value_boolean"]

        # Final fallback to environment settings
        if key == SettingKeys.MONTHLY_RATE_PER_GUARD:
            return float(settings.MVP_MONTHLY_RATE_PER_GUARD)
        elif key == SettingKeys.FREE_TRIAL_DAYS:
            return settings.FREE_TRIAL_DAYS
        elif key == SettingKeys.CURRENCY:
            return settings.MVP_CURRENCY

        return None

    def set_setting(
        self,
        key: str,
        value: Any,
        description: str = None,
        category: str = None,
        is_public: bool = None,
        updated_by: int = None
    ) -> SystemSettings:
        """
        Set a setting value.

        Creates the setting if it doesn't exist, updates if it does.
        """
        setting = self.db.query(SystemSettings).filter(
            SystemSettings.setting_key == key
        ).first()

        if not setting:
            # Create new setting
            setting = SystemSettings(
                setting_key=key,
                description=description or DEFAULT_SETTINGS.get(key, {}).get("description"),
                category=category or DEFAULT_SETTINGS.get(key, {}).get("category", "general"),
                is_public=is_public if is_public is not None else DEFAULT_SETTINGS.get(key, {}).get("is_public", False),
                updated_by=updated_by
            )
            self.db.add(setting)

        # Set the appropriate typed value
        if isinstance(value, bool):
            setting.value_boolean = value
            setting.value_string = None
            setting.value_numeric = None
        elif isinstance(value, (int, float, Decimal)):
            setting.value_numeric = Decimal(str(value))
            setting.value_string = None
            setting.value_boolean = None
        else:
            setting.value_string = str(value)
            setting.value_numeric = None
            setting.value_boolean = None

        if description:
            setting.description = description
        if category:
            setting.category = category
        if is_public is not None:
            setting.is_public = is_public
        if updated_by:
            setting.updated_by = updated_by

        self.db.commit()
        self.db.refresh(setting)

        logger.info(f"System setting updated: {key} = {value}")
        return setting

    def get_all_settings(self, category: str = None) -> Dict[str, Any]:
        """
        Get all settings as a dictionary.

        Args:
            category: Optional category filter

        Returns:
            Dict of setting_key -> value
        """
        query = self.db.query(SystemSettings)
        if category:
            query = query.filter(SystemSettings.category == category)

        db_settings = query.all()

        # Start with defaults
        result = {}
        for key, defaults in DEFAULT_SETTINGS.items():
            if category and defaults.get("category") != category:
                continue

            if "value_numeric" in defaults:
                result[key] = float(defaults["value_numeric"])
            elif "value_string" in defaults:
                result[key] = defaults["value_string"]
            elif "value_boolean" in defaults:
                result[key] = defaults["value_boolean"]

        # Override with database values
        for setting in db_settings:
            if setting.value_numeric is not None:
                result[setting.setting_key] = float(setting.value_numeric)
            elif setting.value_string is not None:
                result[setting.setting_key] = setting.value_string
            elif setting.value_boolean is not None:
                result[setting.setting_key] = setting.value_boolean

        return result

    def get_public_settings(self) -> Dict[str, Any]:
        """Get only public settings (safe for unauthenticated requests)."""
        all_settings = self.get_all_settings()
        public_keys = [
            key for key, defaults in DEFAULT_SETTINGS.items()
            if defaults.get("is_public", False)
        ]

        # Also check database for any settings marked as public
        db_public = self.db.query(SystemSettings).filter(
            SystemSettings.is_public == True
        ).all()
        for setting in db_public:
            if setting.setting_key not in public_keys:
                public_keys.append(setting.setting_key)

        return {k: v for k, v in all_settings.items() if k in public_keys}

    def get_pricing_config(self) -> Dict[str, Any]:
        """
        Get pricing configuration for frontend.

        Returns a simplified object with pricing info.
        """
        return {
            "monthly_rate_per_guard": self.get_setting(SettingKeys.MONTHLY_RATE_PER_GUARD),
            "free_trial_days": int(self.get_setting(SettingKeys.FREE_TRIAL_DAYS) or 14),
            "currency": self.get_setting(SettingKeys.CURRENCY) or "ZAR",
            "vat_percentage": self.get_setting(SettingKeys.VAT_PERCENTAGE) or 15.0,
            "platform_name": self.get_setting(SettingKeys.PLATFORM_NAME) or "GuardianOS"
        }

    def delete_setting(self, key: str) -> bool:
        """Delete a setting (resets to default)."""
        setting = self.db.query(SystemSettings).filter(
            SystemSettings.setting_key == key
        ).first()

        if setting:
            self.db.delete(setting)
            self.db.commit()
            logger.info(f"System setting deleted: {key}")
            return True
        return False

    def initialize_defaults(self) -> int:
        """
        Initialize default settings in database if they don't exist.

        Returns number of settings created.
        """
        created = 0
        for key, defaults in DEFAULT_SETTINGS.items():
            existing = self.db.query(SystemSettings).filter(
                SystemSettings.setting_key == key
            ).first()

            if not existing:
                setting = SystemSettings(
                    setting_key=key,
                    description=defaults.get("description"),
                    category=defaults.get("category", "general"),
                    is_public=defaults.get("is_public", False)
                )

                if "value_numeric" in defaults:
                    setting.value_numeric = Decimal(str(defaults["value_numeric"]))
                elif "value_string" in defaults:
                    setting.value_string = defaults["value_string"]
                elif "value_boolean" in defaults:
                    setting.value_boolean = defaults["value_boolean"]

                self.db.add(setting)
                created += 1

        if created > 0:
            self.db.commit()
            logger.info(f"Initialized {created} default system settings")

        return created
