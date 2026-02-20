"""Contract value model.

Track financial values, billing rates, and targets per client contract/site.
"""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class BillingFrequency(str, enum.Enum):
    MONTHLY = "monthly"
    WEEKLY = "weekly"
    FORTNIGHTLY = "fortnightly"
    ANNUALLY = "annually"


class ContractValue(Base):
    """Financial contract value record per client site."""

    __tablename__ = "contract_values"

    contract_value_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True, index=True)

    contract_number = Column(String(100), nullable=True)
    monthly_value = Column(Float, nullable=False, default=0)  # Total monthly contract value (ZAR)
    billing_frequency = Column(String(30), default="monthly")
    hourly_bill_rate = Column(Float, nullable=True)  # What we charge client per hour
    wage_budget_pct = Column(Float, nullable=True)  # Target wage-to-revenue % (e.g. 65.0)
    monthly_wage_budget = Column(Float, nullable=True)  # Max wage spend per month

    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization")
    client = relationship("Client")
    site = relationship("Site")

    def __repr__(self):
        return f"<ContractValue {self.contract_value_id}: client={self.client_id} value={self.monthly_value}>"
