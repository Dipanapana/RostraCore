"""Payroll summary model."""

from sqlalchemy import Column, Integer, Float, Date, ForeignKey, String, Numeric
from sqlalchemy.orm import relationship
from app.database import Base


class PayrollSummary(Base):
    """Weekly/monthly payroll totals model."""

    __tablename__ = "payroll_summary"

    payroll_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    period_start = Column(Date, nullable=False, index=True)
    period_end = Column(Date, nullable=False)
    total_hours = Column(Numeric(10, 2), default=0.0)
    overtime_hours = Column(Numeric(10, 2), default=0.0)
    gross_pay = Column(Numeric(12, 2), default=0.0)
    expenses_total = Column(Numeric(12, 2), default=0.0)
    net_pay = Column(Numeric(12, 2), default=0.0)

    # Currency tracking
    currency_code = Column(String(3), nullable=False, server_default='ZAR')
    exchange_rate_used = Column(Numeric(18, 8), nullable=True)  # Null = no conversion
    original_currency = Column(String(3), nullable=True)  # Null = same as currency_code
    original_gross_pay = Column(Numeric(12, 2), nullable=True)  # Null = no conversion

    # Relationships
    employee = relationship("Employee", back_populates="payroll_summary")

    def __repr__(self):
        return f"<PayrollSummary {self.payroll_id}: Employee {self.employee_id} {self.period_start} to {self.period_end}>"
