"""Country configuration model for multi-country support."""

from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class CountryConfig(Base):
    """Country configuration model storing tax rules, labor laws, and regional settings."""
    __tablename__ = "country_configs"

    config_id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String(2), unique=True, nullable=False, index=True)  # ISO 3166-1 alpha-2 (ZA, US, GB, etc.)
    country_name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    config_json = Column(JSONB, nullable=False)  # Full country config: tax rules, labor laws, public holidays
    config_version = Column(String(20), default="1.0", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<CountryConfig(country_code='{self.country_code}', name='{self.country_name}')>"
