"""Exchange rate model for multi-currency conversions."""

from sqlalchemy import Column, String, Integer, DateTime, Numeric
from sqlalchemy.sql import func
from app.database import Base


class ExchangeRate(Base):
    """Exchange rate model storing currency conversion rates."""
    __tablename__ = "exchange_rates"

    rate_id = Column(Integer, primary_key=True, index=True)
    base_currency = Column(String(3), nullable=False, index=True)
    target_currency = Column(String(3), nullable=False, index=True)
    rate = Column(Numeric(18, 8), nullable=False)  # High precision for exchange rates
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    source = Column(String(50), nullable=False)  # e.g., "open_exchange_rates", "frankfurter", "manual"

    def __repr__(self):
        return f"<ExchangeRate({self.base_currency} -> {self.target_currency}: {self.rate})>"
