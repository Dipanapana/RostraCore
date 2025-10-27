"""Expense model."""

from sqlalchemy import Column, Integer, String, Float, Date, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ExpenseType(str, enum.Enum):
    """Expense type enum."""
    FUEL = "fuel"
    MEAL = "meal"
    ALLOWANCE = "allowance"
    UNIFORM = "uniform"
    VEHICLE = "vehicle"
    OTHER = "other"


class Expense(Base):
    """Variable or recurring cost items model."""

    __tablename__ = "expenses"

    expense_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=True, index=True)
    type = Column(SQLEnum(ExpenseType), nullable=False)
    amount = Column(Float, nullable=False)
    date_incurred = Column(Date, nullable=False, index=True)
    approved = Column(Boolean, default=False)
    description = Column(String(500))
    receipt_url = Column(String(500))

    # Relationships
    employee = relationship("Employee", back_populates="expenses")
    site = relationship("Site", back_populates="expenses")

    def __repr__(self):
        return f"<Expense {self.expense_id}: {self.type} ${self.amount}>"
