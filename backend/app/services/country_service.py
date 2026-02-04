"""Country Configuration Service.

Loads and validates country-specific configurations for tax, labor laws, and currency.
Configurations are stored as JSON files in backend/app/country_configs/.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional

from sqlalchemy.orm import Session
from app.models.country import CountryConfig

logger = logging.getLogger(__name__)


class CountryService:
    """Service for managing country configurations."""

    CONFIG_DIR = Path(__file__).parent.parent / "country_configs"

    @classmethod
    def load_config(cls, country_code: str) -> dict:
        """Load country config from JSON file.

        Args:
            country_code: ISO 3166-1 alpha-2 country code (e.g., 'ZA', 'US')

        Returns:
            Dictionary containing country configuration

        Raises:
            FileNotFoundError: If config file doesn't exist
            json.JSONDecodeError: If config file is invalid JSON
        """
        config_path = cls.CONFIG_DIR / f"{country_code}.json"

        if not config_path.exists():
            raise FileNotFoundError(
                f"Country config not found for '{country_code}'. "
                f"Expected: {config_path}"
            )

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)

            # Validate required top-level keys
            is_valid, errors = cls.validate_config(config)
            if not is_valid:
                logger.warning(
                    f"Country config '{country_code}' validation warnings: {errors}"
                )

            return config

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in {config_path}: {e}")
            raise

    @classmethod
    def list_available_countries(cls) -> List[dict]:
        """List all available country configs.

        Returns:
            List of dictionaries with country_code, country_name, and currency info
        """
        countries = []

        if not cls.CONFIG_DIR.exists():
            logger.warning(f"Country configs directory not found: {cls.CONFIG_DIR}")
            return countries

        for config_file in cls.CONFIG_DIR.glob("*.json"):
            if config_file.stem == "__init__":
                continue

            try:
                config = cls.load_config(config_file.stem)
                countries.append({
                    "country_code": config.get("country_code"),
                    "country_name": config.get("country_name"),
                    "currency": config.get("currency", {}).get("code"),
                    "currency_symbol": config.get("currency", {}).get("symbol"),
                })
            except (FileNotFoundError, json.JSONDecodeError) as e:
                logger.warning(f"Skipping invalid config file {config_file}: {e}")
                continue

        return sorted(countries, key=lambda x: x["country_name"])

    @classmethod
    def validate_config(cls, config: dict) -> Tuple[bool, List[str]]:
        """Validate country config JSON structure.

        Args:
            config: Country configuration dictionary

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        # Required top-level keys
        required_keys = ["country_code", "country_name", "currency", "tax_rules", "labor_laws"]
        for key in required_keys:
            if key not in config:
                errors.append(f"Missing required key: {key}")

        # Validate country_code format
        if "country_code" in config:
            if not isinstance(config["country_code"], str) or len(config["country_code"]) != 2:
                errors.append("country_code must be 2-character ISO 3166-1 alpha-2 code")

        # Validate currency block
        if "currency" in config:
            currency = config["currency"]
            required_currency_keys = ["code", "symbol", "decimal_places", "display_locale"]
            for key in required_currency_keys:
                if key not in currency:
                    errors.append(f"Missing currency.{key}")

        # Validate tax_rules block
        if "tax_rules" in config:
            tax_rules = config["tax_rules"]
            if "income_tax" not in tax_rules:
                errors.append("Missing tax_rules.income_tax")
            if "social_contributions" not in tax_rules:
                errors.append("Missing tax_rules.social_contributions")

        # Validate labor_laws block
        if "labor_laws" in config:
            labor_laws = config["labor_laws"]
            if "source" not in labor_laws:
                errors.append("Missing labor_laws.source")
            if "public_holidays" not in labor_laws:
                errors.append("Missing labor_laws.public_holidays")

        is_valid = len(errors) == 0
        return is_valid, errors

    @classmethod
    def get_currency_info(cls, country_code: str) -> dict:
        """Get currency info for a country.

        Args:
            country_code: ISO 3166-1 alpha-2 country code

        Returns:
            Dictionary with currency code, symbol, decimal_places, display_locale
        """
        config = cls.load_config(country_code)
        return config.get("currency", {})

    @classmethod
    async def sync_config_to_db(
        cls,
        country_code: str,
        db: Session
    ) -> CountryConfig:
        """Sync JSON config to database (for runtime queries).

        Loads the JSON config file and creates/updates the CountryConfig record.

        Args:
            country_code: ISO 3166-1 alpha-2 country code
            db: Database session

        Returns:
            CountryConfig model instance
        """
        config = cls.load_config(country_code)

        # Check if config exists
        existing = db.query(CountryConfig).filter(
            CountryConfig.country_code == country_code
        ).first()

        if existing:
            # Update existing config
            existing.country_name = config["country_name"]
            existing.config_json = config
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            logger.info(f"Updated country config in DB: {country_code}")
            return existing
        else:
            # Create new config
            new_config = CountryConfig(
                country_code=country_code,
                country_name=config["country_name"],
                config_json=config,
                is_active=True,
                config_version="1.0"
            )
            db.add(new_config)
            db.commit()
            db.refresh(new_config)
            logger.info(f"Created country config in DB: {country_code}")
            return new_config
