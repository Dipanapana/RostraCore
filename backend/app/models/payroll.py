"""Payroll summary model."""

from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class PayrollSummary(Base):
    """Weekly/monthly payroll totals model."""

    __tablename__ = "payroll_summary"

    payroll_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    period_start = Column(Date, nullable=False, index=True)
    period_end = Column(Date, nullable=False)
    total_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    gross_pay = Column(Float, default=0.0)
    expenses_total = Column(Float, default=0.0)
    net_pay = Column(Float, default=0.0)

    # SA Tax deductions
    uif_employee = Column(Float, default=0.0)
    paye = Column(Float, default=0.0)
    uif_employer = Column(Float, default=0.0)
    sdl = Column(Float, default=0.0)
    provident_fund = Column(Float, default=0.0)
    medical_aid = Column(Float, default=0.0)
    other_deductions = Column(Float, default=0.0)
    total_deductions = Column(Float, default=0.0)
    total_employer_contributions = Column(Float, default=0.0)
    cost_to_company = Column(Float, default=0.0)
    annual_taxable_income = Column(Float, nullable=True)
    tax_bracket = Column(String(50), nullable=True)
    effective_tax_rate = Column(Float, nullable=True)
    currency_code = Column(String(10), default="ZAR")
    exchange_rate_used = Column(Float, nullable=True)
    original_currency = Column(String(10), nullable=True)
    original_gross_pay = Column(Float, nullable=True)

    # Status workflow: draft -> approved -> paid
    status = Column(String(20), default="draft", nullable=False, index=True)
    approved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="payroll_summary")

    def __repr__(self):
        return f"<PayrollSummary {self.payroll_id}: Employee {self.employee_id} {self.period_start} to {self.period_end}>"
