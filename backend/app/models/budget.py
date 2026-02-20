"""Budget allocation model — tracks budgets per site/department."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from app.database import Base


class Budget(Base):
    """Monthly/quarterly budget allocation per site or department."""

    __tablename__ = "budgets"

    budget_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=True)  # wages, equipment, training, operations, other
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True)

    period_month = Column(Integer, nullable=True)  # 1-12, null for annual
    period_year = Column(Integer, nullable=False)

    allocated_amount = Column(Integer, nullable=False, default=0)  # cents
    spent_amount = Column(Integer, nullable=False, default=0)  # cents

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site")

    def __repr__(self):
        return f"<Budget {self.budget_id}: {self.name}>"
