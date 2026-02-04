"""Country API endpoints for multi-country support.

Provides access to country configurations including tax rules, labor laws,
currency information, and public holidays.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.auth.security import get_current_org_id
from app.services.country_service import CountryService
from app.models.country import Country

router = APIRouter()


# Pydantic schemas
class CountryResponse(BaseModel):
    """Country configuration response."""
    country_code: str
    name: str
    currency_code: str
    currency_symbol: str
    currency_decimal_places: int
    display_locale: str
    is_active: bool

    class Config:
        from_attributes = True


class CurrencyInfo(BaseModel):
    """Currency information response."""
    code: str
    symbol: str
    decimal_places: int
    display_locale: str
    name: str


class CountryConfigResponse(BaseModel):
    """Full country configuration response."""
    country_code: str
    name: str
    currency: dict
    tax_rules: dict
    labor_laws: dict
    public_holidays: List[dict]


@router.get("/", response_model=List[CountryResponse])
def list_countries(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id)
):
    """
    List all available countries with basic information.

    Returns:
        List of countries with currency and active status
    """
    countries = db.query(Country).order_by(Country.name).all()
    return countries


@router.get("/available", response_model=List[str])
def list_available_country_codes(
    org_id: int = Depends(get_current_org_id)
):
    """
    List all country codes that have configuration files available.

    Returns:
        List of country codes (e.g., ["ZA", "US", "GB", "NG", "KE"])
    """
    try:
        country_codes = CountryService.list_available_countries()
        return country_codes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list countries: {str(e)}")


@router.get("/{country_code}", response_model=CountryConfigResponse)
def get_country_config(
    country_code: str,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id)
):
    """
    Get complete configuration for a specific country.

    Args:
        country_code: Two-letter country code (e.g., "ZA", "US")

    Returns:
        Complete country configuration including tax rules, labor laws, holidays

    Raises:
        HTTPException: If country not found or config invalid
    """
    try:
        config = CountryService.load_config(country_code.upper())

        return {
            "country_code": config["country_code"],
            "name": config["name"],
            "currency": config["currency"],
            "tax_rules": config["tax_rules"],
            "labor_laws": config["labor_laws"],
            "public_holidays": config.get("public_holidays", [])
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Country {country_code} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load country config: {str(e)}")


@router.get("/{country_code}/currency", response_model=CurrencyInfo)
def get_country_currency(
    country_code: str,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id)
):
    """
    Get currency information for a specific country.

    Args:
        country_code: Two-letter country code (e.g., "ZA", "US")

    Returns:
        Currency information (code, symbol, decimal places, locale)

    Raises:
        HTTPException: If country not found
    """
    try:
        config = CountryService.load_config(country_code.upper())
        currency = config["currency"]

        return {
            "code": currency["code"],
            "symbol": currency["symbol"],
            "decimal_places": currency["decimal_places"],
            "display_locale": currency["display_locale"],
            "name": currency.get("name", currency["code"])
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Country {country_code} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load currency info: {str(e)}")


@router.get("/{country_code}/tax-rules")
def get_country_tax_rules(
    country_code: str,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id)
):
    """
    Get tax rules for a specific country.

    Args:
        country_code: Two-letter country code

    Returns:
        Tax rules including brackets, rebates, thresholds, social contributions
    """
    try:
        config = CountryService.load_config(country_code.upper())
        return config["tax_rules"]
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Country {country_code} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load tax rules: {str(e)}")


@router.get("/{country_code}/labor-laws")
def get_country_labor_laws(
    country_code: str,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id)
):
    """
    Get labor law rules for a specific country.

    Args:
        country_code: Two-letter country code

    Returns:
        Labor law rules including max hours, rest requirements, overtime multipliers
    """
    try:
        config = CountryService.load_config(country_code.upper())
        return config["labor_laws"]
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Country {country_code} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load labor laws: {str(e)}")


@router.get("/{country_code}/public-holidays")
def get_country_public_holidays(
    country_code: str,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id)
):
    """
    Get public holidays for a specific country.

    Args:
        country_code: Two-letter country code

    Returns:
        List of public holidays with dates and names
    """
    try:
        config = CountryService.load_config(country_code.upper())
        return config.get("public_holidays", [])
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Country {country_code} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load public holidays: {str(e)}")
