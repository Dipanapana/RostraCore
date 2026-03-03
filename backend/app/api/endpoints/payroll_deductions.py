"""SA Payroll Deductions API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.auth.security import get_current_user, require_finance_access
from app.models.user import User
from app.services.sa_payroll_service import SAPayrollService, get_tax_tables_reference


router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class PayeCalculation(BaseModel):
    gross_income: float
    taxable_income: float
    tax_before_rebate: float
    rebate: float
    paye: float
    effective_rate: float


class UifCalculation(BaseModel):
    uif_earnings: float
    employee_contribution: float
    employer_contribution: float
    total_contribution: float
    max_contribution: float


class SdlCalculation(BaseModel):
    monthly_payroll: float
    annual_payroll_estimate: float
    sdl_applicable: bool
    sdl_amount: float
    reason: Optional[str]


class NetPayCalculation(BaseModel):
    gross_pay: float
    paye: float
    uif_employee: float
    other_deductions: float
    total_deductions: float
    net_pay: float
    employer_uif: float
    effective_tax_rate: float


class CostToCompanyCalculation(BaseModel):
    gross_pay: float
    employer_uif: float
    employer_sdl: float
    total_cost_to_company: float


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/paye", response_model=PayeCalculation)
async def calculate_paye(
    gross_monthly: float = Query(..., description="Gross monthly salary in ZAR"),
    age: int = Query(default=35, ge=18, le=100, description="Employee age for rebate calculation"),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate PAYE (Pay As You Earn) tax.

    Uses 2024/2025 SA tax brackets and rebates.

    **Tax Brackets:**
    - R0-R237,100: 18%
    - R237,101-R370,500: 26%
    - R370,501-R512,800: 31%
    - R512,801-R673,000: 36%
    - R673,001-R857,900: 39%
    - R857,901-R1,817,000: 41%
    - R1,817,001+: 45%

    **Rebates:**
    - Primary (all taxpayers): R17,235
    - Secondary (65+): Additional R9,444
    - Tertiary (75+): Additional R3,145
    """
    result = SAPayrollService.calculate_paye(Decimal(str(gross_monthly)), age)
    return PayeCalculation(
        gross_income=float(result["gross_income"]),
        taxable_income=float(result["taxable_income"]),
        tax_before_rebate=float(result["tax_before_rebate"]),
        rebate=float(result["rebate"]),
        paye=float(result["paye"]),
        effective_rate=float(result["effective_rate"])
    )


@router.get("/uif", response_model=UifCalculation)
async def calculate_uif(
    gross_monthly: float = Query(..., description="Gross monthly salary in ZAR"),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate UIF (Unemployment Insurance Fund) contributions.

    **UIF Rules:**
    - 1% from employee
    - 1% from employer
    - Maximum earnings for calculation: R17,712/month
    - Maximum contribution per party: R177.12/month
    """
    result = SAPayrollService.calculate_uif(Decimal(str(gross_monthly)))
    return UifCalculation(
        uif_earnings=float(result["uif_earnings"]),
        employee_contribution=float(result["employee_contribution"]),
        employer_contribution=float(result["employer_contribution"]),
        total_contribution=float(result["total_contribution"]),
        max_contribution=float(result["max_contribution"])
    )


@router.get("/sdl", response_model=SdlCalculation)
async def calculate_sdl(
    total_monthly_payroll: float = Query(..., description="Total monthly payroll for organization in ZAR"),
    is_exempt: bool = Query(default=False, description="Whether organization is exempt (e.g., PBO)"),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate SDL (Skills Development Levy).

    **SDL Rules:**
    - 1% of total payroll (employer only)
    - Only applicable if annual payroll exceeds R500,000
    - Exempt: Public benefit organizations, religious institutions
    """
    result = SAPayrollService.calculate_sdl(Decimal(str(total_monthly_payroll)), is_exempt)
    return SdlCalculation(
        monthly_payroll=float(result["monthly_payroll"]),
        annual_payroll_estimate=float(result["annual_payroll_estimate"]),
        sdl_applicable=result["sdl_applicable"],
        sdl_amount=float(result["sdl_amount"]),
        reason=result["reason"]
    )


@router.get("/net-pay", response_model=NetPayCalculation)
async def calculate_net_pay(
    gross_monthly: float = Query(..., description="Gross monthly salary in ZAR"),
    age: int = Query(default=35, ge=18, le=100, description="Employee age"),
    other_deductions: float = Query(default=0, description="Other deductions (pension, medical aid)"),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate complete net pay with all statutory deductions.

    Returns a full payslip breakdown including:
    - PAYE tax
    - UIF contribution
    - Other deductions
    - Net pay
    """
    result = SAPayrollService.calculate_net_pay(
        Decimal(str(gross_monthly)),
        age,
        include_uif=True,
        other_deductions=Decimal(str(other_deductions))
    )
    return NetPayCalculation(
        gross_pay=float(result["gross_pay"]),
        paye=float(result["paye"]),
        uif_employee=float(result["uif_employee"]),
        other_deductions=float(result["other_deductions"]),
        total_deductions=float(result["total_deductions"]),
        net_pay=float(result["net_pay"]),
        employer_uif=float(result["employer_uif"]),
        effective_tax_rate=float(result["effective_tax_rate"])
    )


@router.get("/cost-to-company", response_model=CostToCompanyCalculation)
async def calculate_cost_to_company(
    gross_monthly: float = Query(..., description="Employee gross monthly salary in ZAR"),
    total_monthly_payroll: float = Query(default=0, description="Organization total monthly payroll"),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate total cost to company for an employee.

    Includes:
    - Gross salary
    - Employer UIF contribution (1%)
    - Employer SDL contribution (1% if applicable)
    """
    result = SAPayrollService.calculate_cost_to_company(
        Decimal(str(gross_monthly)),
        Decimal(str(total_monthly_payroll))
    )
    return CostToCompanyCalculation(
        gross_pay=float(result["gross_pay"]),
        employer_uif=float(result["employer_uif"]),
        employer_sdl=float(result["employer_sdl"]),
        total_cost_to_company=float(result["total_cost_to_company"])
    )


@router.get("/tax-tables")
async def get_tax_tables(current_user: User = Depends(get_current_user)):
    """
    Get SA tax tables reference for 2024/2025.

    Returns all tax brackets, rebates, thresholds, and rates.
    """
    return get_tax_tables_reference()


@router.get("/config")
async def get_payroll_config(
    db: Session = Depends(get_db),
    current_user=Depends(require_finance_access)
):
    """Get organization payroll deduction configuration."""
    from app.models.organization_payroll_config import OrganizationPayrollConfig

    config = db.query(OrganizationPayrollConfig).filter(
        OrganizationPayrollConfig.org_id == current_user.org_id
    ).first()

    if not config:
        # Create default config
        config = OrganizationPayrollConfig(org_id=current_user.org_id)
        db.add(config)
        db.commit()
        db.refresh(config)

    return {
        "config_id": config.config_id,
        "org_id": config.org_id,
        "psira_deduction": float(config.psira_deduction),
        "bargaining_council": float(config.bargaining_council),
        "provident_fund_pct": float(config.provident_fund_pct),
        "nucaaw": float(config.nucaaw),
        "hospital_cover": float(config.hospital_cover),
        "supervisor_allowance": float(config.supervisor_allowance),
        "min_hourly_rate": float(config.min_hourly_rate) if config.min_hourly_rate else None,
    }


@router.put("/config")
async def update_payroll_config(
    config_data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_finance_access)
):
    """Update organization payroll deduction configuration."""
    from app.models.organization_payroll_config import OrganizationPayrollConfig
    from decimal import Decimal

    config = db.query(OrganizationPayrollConfig).filter(
        OrganizationPayrollConfig.org_id == current_user.org_id
    ).first()

    if not config:
        config = OrganizationPayrollConfig(org_id=current_user.org_id)
        db.add(config)

    # Update fields if provided
    field_map = {
        "psira_deduction": "psira_deduction",
        "bargaining_council": "bargaining_council",
        "provident_fund_pct": "provident_fund_pct",
        "nucaaw": "nucaaw",
        "hospital_cover": "hospital_cover",
        "supervisor_allowance": "supervisor_allowance",
        "min_hourly_rate": "min_hourly_rate",
    }

    for key, attr in field_map.items():
        if key in config_data:
            value = config_data[key]
            setattr(config, attr, Decimal(str(value)) if value is not None else None)

    db.commit()
    db.refresh(config)

    return {
        "status": "success",
        "message": "Payroll configuration updated",
        "config_id": config.config_id,
    }
