"""
Exchange Rate Service.

Fetches exchange rates from free APIs, caches in database, provides fallback.
"""

import httpx
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.exchange_rate import ExchangeRate
import logging

logger = logging.getLogger(__name__)


class ExchangeRateUnavailable(Exception):
    """Raised when no exchange rate is available."""
    pass


class ExchangeRateService:
    """Fetch, cache, and provide exchange rates."""

    CACHE_DURATION_HOURS = 4  # Refresh cached rates every 4 hours

    # Free APIs, no API key needed
    PRIMARY_API = "https://open.er-api.com/v6/latest/{base}"
    FALLBACK_API = "https://api.frankfurter.app/latest?from={base}&to={target}"

    @classmethod
    async def get_rate(
        cls,
        from_currency: str,
        to_currency: str,
        db: Session
    ) -> Decimal:
        """
        Get exchange rate with caching and fallback.

        Strategy:
        1. Check DB cache (if fresh enough, return cached)
        2. Try primary API (ExchangeRate-API)
        3. Try fallback API (Frankfurter)
        4. Return stale cached rate if all APIs fail
        5. Raise if no rate available at all

        Args:
            from_currency: Source currency code (e.g., "ZAR")
            to_currency: Target currency code (e.g., "USD")
            db: Database session

        Returns:
            Exchange rate as Decimal

        Raises:
            ExchangeRateUnavailable: If no rate available anywhere
        """
        if from_currency == to_currency:
            return Decimal("1")

        # Check cache
        cached = cls._get_cached_rate(from_currency, to_currency, db)
        if cached and not cls._is_stale(cached):
            logger.info(f"Using cached rate {from_currency}->{to_currency}: {cached.rate}")
            return Decimal(str(cached.rate))

        # Try primary API
        rate = None
        try:
            rate = await cls._fetch_from_primary(from_currency, to_currency)
            logger.info(f"Fetched rate from primary API {from_currency}->{to_currency}: {rate}")
        except Exception as e:
            logger.warning(f"Primary API failed for {from_currency}->{to_currency}: {e}")

        # Try fallback API if primary failed
        if rate is None:
            try:
                rate = await cls._fetch_from_fallback(from_currency, to_currency)
                logger.info(f"Fetched rate from fallback API {from_currency}->{to_currency}: {rate}")
            except Exception as e:
                logger.warning(f"Fallback API failed for {from_currency}->{to_currency}: {e}")

        # Use API rate if available
        if rate is not None:
            cls._cache_rate(from_currency, to_currency, rate, "api", db)
            return rate

        # Return stale cache if available
        if cached:
            logger.warning(
                f"Using stale rate for {from_currency}->{to_currency} "
                f"(fetched {cached.fetched_at})"
            )
            return Decimal(str(cached.rate))

        raise ExchangeRateUnavailable(
            f"No exchange rate available for {from_currency} -> {to_currency}"
        )

    @classmethod
    async def convert(
        cls,
        amount: Decimal,
        from_currency: str,
        to_currency: str,
        db: Session
    ) -> tuple[Decimal, Decimal]:
        """
        Convert amount between currencies.

        Args:
            amount: Amount to convert
            from_currency: Source currency
            to_currency: Target currency
            db: Database session

        Returns:
            Tuple of (converted_amount, rate_used)
        """
        rate = await cls.get_rate(from_currency, to_currency, db)
        converted = (amount * rate).quantize(Decimal("0.01"), ROUND_HALF_UP)
        return converted, rate

    @classmethod
    def _get_cached_rate(
        cls,
        from_currency: str,
        to_currency: str,
        db: Session
    ) -> ExchangeRate | None:
        """Get cached exchange rate from database."""
        return db.query(ExchangeRate).filter(
            and_(
                ExchangeRate.base_currency == from_currency,
                ExchangeRate.target_currency == to_currency
            )
        ).order_by(ExchangeRate.fetched_at.desc()).first()

    @classmethod
    def _is_stale(cls, exchange_rate: ExchangeRate) -> bool:
        """Check if cached rate is stale (older than CACHE_DURATION_HOURS)."""
        if exchange_rate.fetched_at is None:
            return True

        age = datetime.now(timezone.utc) - exchange_rate.fetched_at.replace(tzinfo=timezone.utc)
        return age > timedelta(hours=cls.CACHE_DURATION_HOURS)

    @classmethod
    async def _fetch_from_primary(cls, from_currency: str, to_currency: str) -> Decimal | None:
        """Fetch rate from primary API (ExchangeRate-API)."""
        url = cls.PRIMARY_API.format(base=from_currency)

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            if data.get("result") == "success" and "rates" in data:
                rate = data["rates"].get(to_currency)
                if rate:
                    return Decimal(str(rate))

        return None

    @classmethod
    async def _fetch_from_fallback(cls, from_currency: str, to_currency: str) -> Decimal | None:
        """Fetch rate from fallback API (Frankfurter)."""
        url = cls.FALLBACK_API.format(base=from_currency, target=to_currency)

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            if "rates" in data:
                rate = data["rates"].get(to_currency)
                if rate:
                    return Decimal(str(rate))

        return None

    @classmethod
    def _cache_rate(
        cls,
        from_currency: str,
        to_currency: str,
        rate: Decimal,
        source: str,
        db: Session
    ):
        """Cache exchange rate in database."""
        exchange_rate = ExchangeRate(
            base_currency=from_currency,
            target_currency=to_currency,
            rate=rate,
            source=source,
            fetched_at=datetime.now(timezone.utc)
        )
        db.add(exchange_rate)
        db.commit()
        logger.info(f"Cached rate {from_currency}->{to_currency}: {rate} (source: {source})")


class CurrencyService:
    """Currency formatting and conversion utilities."""

    @staticmethod
    def format_amount(
        amount: Decimal,
        currency_code: str,
        locale: str | None = None
    ) -> str:
        """
        Format amount with currency symbol.

        Note: For actual Intl.NumberFormat formatting, use frontend currency.ts.
        This is a simple backend formatter for API responses.

        Args:
            amount: Amount to format
            currency_code: ISO 4217 currency code
            locale: Optional locale (not used in backend, included for API compat)

        Returns:
            Formatted string like "ZAR 1,234.56" or "$1,234.56"
        """
        # Simple backend formatting - frontend uses Intl.NumberFormat
        symbol_map = {
            "ZAR": "R",
            "USD": "$",
            "GBP": "£",
            "EUR": "€",
            "NGN": "₦",
            "KES": "KSh",
        }

        symbol = symbol_map.get(currency_code, currency_code)
        formatted = f"{amount:,.2f}"

        # ZAR uses space after symbol
        if currency_code == "ZAR":
            return f"{symbol} {formatted}"

        return f"{symbol}{formatted}"
