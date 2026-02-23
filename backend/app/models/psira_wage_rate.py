"""PSIRA minimum wage rate model for South African security industry compliance."""

from sqlalchemy import Column, Integer, String, Float, Date
from app.database import Base


class PSIRAWageRate(Base):
    """PSIRA/NBC minimum hourly wage rates by grade and area."""

    __tablename__ = "psira_wage_rates"

    rate_id = Column(Integer, primary_key=True, index=True)

    # Period
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=False)

    # Guard classification
    grade = Column(String(2), nullable=False, index=True)  # A, B, C, D, E
    area = Column(Integer, nullable=False, index=True)     # 1, 2, 3

    # Rate type
    rate_type = Column(String(20), nullable=False, index=True)  # normal, overtime, sunday, public_holiday, night

    # Amounts
    hourly_rate = Column(Float, nullable=False)
    monthly_minimum = Column(Float, nullable=True)
