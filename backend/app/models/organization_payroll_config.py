"""Organization payroll configuration model."""

from sqlalchemy import Column, Integer, Numeric, ForeignKey, DateTime
from app.database import Base
from datetime import datetime


class OrganizationPayrollConfig(Base):
    """Per-organization payroll configuration for deductions and allowances."""

    __tablename__ = "organization_payroll_configs"

    config_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(
        Integer,
        ForeignKey("organizations.org_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Standard deductions
    psira_deduction = Column(Numeric(10, 2), nullable=False, default=50)
    bargaining_council = Column(Numeric(10, 2), nullable=False, default=25)
    provident_fund_pct = Column(Numeric(5, 4), nullable=False, default=0.05)
    nucaaw = Column(Numeric(10, 2), nullable=False, default=0)
    hospital_cover = Column(Numeric(10, 2), nullable=False, default=0)

    # Allowances
    supervisor_allowance = Column(Numeric(10, 2), nullable=False, default=500)

    # Rate floor
    min_hourly_rate = Column(Numeric(10, 2), nullable=True)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<OrganizationPayrollConfig(config_id={self.config_id}, org_id={self.org_id})>"
