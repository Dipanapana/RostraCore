"""Subscription plan model - SaaS pricing tiers."""

from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, Text, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from app.database import Base
from typing import Dict, Any


class SubscriptionPlan(Base):
    """
    SaaS subscription plans for organizations.

    Configurable from superadmin dashboard.
    """
    __tablename__ = "subscription_plans"

    plan_id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String(100), nullable=False, unique=True, index=True)
    display_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Pricing
    monthly_price = Column(Numeric(10, 2), nullable=False)
    annual_price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, server_default="ZAR")

    # Feature limits
    max_employees = Column(Integer, nullable=True)  # NULL = unlimited
    max_sites = Column(Integer, nullable=True)
    max_clients = Column(Integer, nullable=True)
    max_supervisors = Column(Integer, nullable=True)

    # Features enabled
    features = Column(JSON, nullable=False, server_default="{}")

    # Status
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Note: Organizations reference subscription tiers by string (not FK relationship)
    # The subscription_tier column in organizations table stores tier names directly

    def has_feature(self, feature_name: str) -> bool:
        """Check if plan has a specific feature."""
        if not self.features:
            return False
        return self.features.get(feature_name, False)

    @property
    def annual_savings(self) -> float:
        """Calculate annual savings compared to monthly."""
        monthly_annual_cost = float(self.monthly_price) * 12
        annual_cost = float(self.annual_price)
        return monthly_annual_cost - annual_cost

    @property
    def annual_discount_percent(self) -> float:
        """Calculate annual discount percentage."""
        monthly_annual_cost = float(self.monthly_price) * 12
        if monthly_annual_cost == 0:
            return 0
        return (self.annual_savings / monthly_annual_cost) * 100
