"""Exchange rate API endpoints for currency conversion.

Provides real-time exchange rates with caching and currency conversion utilities.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.auth.security import get_current_org_id
from app.services.exchange_rate_service import ExchangeRateService, ExchangeRateUnavailable

router = APIRouter()


# Pydantic schemas
class ExchangeRateResponse(BaseModel):
    """Exchange rate response."""
    from_currency: str
    to_currency: str
    rate: Decimal
    fetched_at: datetime
    source: str  # "cache" or "api"

    class Config:
        from_attributes = True


class ConversionRequest(BaseModel):
    """Currency conversion request."""
    amount: Decimal = Field(..., description="Amount to convert")
    from_currency: str = Field(..., description="Source currency code (e.g., 'USD')")
    to_currency: str = Field(..., description="Target currency code (e.g., 'ZAR')")


class ConversionResponse(BaseModel):
    """Currency conversion response."""
    amount: Decimal
    from_currency: str
    to_currency: str
    converted_amount: Decimal
    exchange_rate: Decimal
    fetched_at: datetime


@router.get("/{from_currency}/{to_currency}", response_model=ExchangeRateResponse)
async def get_exchange_rate(
    from_currency: str,
    to_currency: str,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id)
):
    """
    Get current exchange rate between two currencies.

    Args:
        from_currency: Source currency code (e.g., "USD")
        to_currency: Target currency code (e.g., "ZAR")

    Returns:
        Exchange rate with timestamp and source (cache or api)

    Raises:
        HTTPException: If currencies are invalid or rate unavailable
    """
    from_curr = from_currency.upper()
    to_curr = to_currency.upper()

    # Same currency returns 1.0
    if from_curr == to_curr:
        return {
            "from_currency": from_curr,
            "to_currency": to_curr,
            "rate": Decimal("1.0"),
            "fetched_at": datetime.utcnow(),
            "source": "direct"
        }

    try:
        rate = await ExchangeRateService.get_rate(from_curr, to_curr, db)

        # Get cached record to check source and timestamp
        cached = ExchangeRateService._get_cached_rate(from_curr, to_curr, db)

        return {
            "from_currency": from_curr,
            "to_currency": to_curr,
            "rate": rate,
            "fetched_at": cached.fetched_at if cached else datetime.utcnow(),
            "source": cached.source if cached else "api"
        }
    except ExchangeRateUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch exchange rate: {str(e)}")


@router.post("/convert", response_model=ConversionResponse)
async def convert_currency(
    request: ConversionRequest,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id)
):
    """
    Convert amount from one currency to another.

    Args:
        request: Conversion request with amount and currency codes

    Returns:
        Converted amount with exchange rate used

    Raises:
        HTTPException: If currencies are invalid or conversion fails
    """
    from_curr = request.from_currency.upper()
    to_curr = request.to_currency.upper()

    # Same currency - no conversion needed
    if from_curr == to_curr:
        return {
            "amount": request.amount,
            "from_currency": from_curr,
            "to_currency": to_curr,
            "converted_amount": request.amount,
            "exchange_rate": Decimal("1.0"),
            "fetched_at": datetime.utcnow()
        }

    try:
        converted = await ExchangeRateService.convert(
            request.amount,
            from_curr,
            to_curr,
            db
        )

        # Get the rate that was used
        rate = await ExchangeRateService.get_rate(from_curr, to_curr, db)

        # Get cached record for timestamp
        cached = ExchangeRateService._get_cached_rate(from_curr, to_curr, db)

        return {
            "amount": request.amount,
            "from_currency": from_curr,
            "to_currency": to_curr,
            "converted_amount": converted,
            "exchange_rate": rate,
            "fetched_at": cached.fetched_at if cached else datetime.utcnow()
        }
    except ExchangeRateUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to convert currency: {str(e)}")


@router.get("/supported")
async def get_supported_currencies(
    org_id: int = Depends(get_current_org_id)
):
    """
    Get list of supported currencies.

    Returns:
        List of currency codes that can be used for conversion
    """
    # Common currencies supported by exchange rate APIs
    supported = [
        "USD", "EUR", "GBP", "ZAR", "NGN", "KES",
        "JPY", "CNY", "AUD", "CAD", "CHF", "INR",
        "BRL", "RUB", "MXN", "SGD", "HKD", "NZD"
    ]
    return {"currencies": supported}


@router.delete("/cache/{from_currency}/{to_currency}")
async def clear_cached_rate(
    from_currency: str,
    to_currency: str,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id)
):
    """
    Clear cached exchange rate to force fresh fetch.

    Args:
        from_currency: Source currency code
        to_currency: Target currency code

    Returns:
        Success message
    """
    from_curr = from_currency.upper()
    to_curr = to_currency.upper()

    try:
        from app.models.exchange_rate import ExchangeRate

        # Delete cached rate
        db.query(ExchangeRate).filter(
            ExchangeRate.from_currency == from_curr,
            ExchangeRate.to_currency == to_curr
        ).delete()

        db.commit()

        return {"message": f"Cleared cached rate for {from_curr}/{to_curr}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")
