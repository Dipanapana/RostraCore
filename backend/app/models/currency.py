"""Currency model for multi-currency support."""

from sqlalchemy import Column, String, Integer, Boolean
from app.database import Base


class Currency(Base):
    """Currency model storing currency metadata and formatting info."""
    __tablename__ = "currencies"

    currency_code = Column(String(3), primary_key=True)  # ISO 4217 (ZAR, USD, GBP, etc.)
    currency_name = Column(String(100), nullable=False)
    symbol = Column(String(10), nullable=False)
    decimal_places = Column(Integer, default=2, nullable=False)
    display_locale = Column(String(10), nullable=False)  # e.g., "en-ZA", "en-US"
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<Currency(code='{self.currency_code}', symbol='{self.symbol}')>"
