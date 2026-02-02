"""South African Payroll Deductions Service.

Implements PAYE, UIF, and SDL calculations per SARS regulations.

Tax Year: 2024/2025 (1 March 2024 - 28 February 2025)
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Tuple
from datetime import date


# =============================================================================
# PAYE TAX BRACKETS (2024/2025 Tax Year)
# Source: SARS
# =============================================================================

# Monthly tax brackets (annual / 12)
PAYE_BRACKETS_2024 = [
    # (threshold, rate, cumulative_base)
    (25_750, Decimal("0.18"), Decimal("0")),          # R1-R25,750: 18%
    (33_583, Decimal("0.26"), Decimal("4_635")),      # R25,751-R33,583: 26%
    (41_667, Decimal("0.31"), Decimal("6_671.58")),   # R33,584-R41,667: 31%
    (58_333, Decimal("0.36"), Decimal("9_177.59")),   # R41,668-R58,333: 36%
    (75_000, Decimal("0.39"), Decimal("15_177.35")),  # R58,334-R75,000: 39%
    (162_500, Decimal("0.41"), Decimal("21_677.23")), # R75,001-R162,500: 41%
    (None, Decimal("0.45"), Decimal("57_552.23")),    # R162,501+: 45%
]

# Tax rebates (monthly, for under 65)
PRIMARY_REBATE = Decimal("17_235") / 12  # R1,436.25/month
SECONDARY_REBATE = Decimal("9_444") / 12  # 65+: additional R787/month
TERTIARY_REBATE = Decimal("3_145") / 12   # 75+: additional R262.08/month

# Tax thresholds (below this, no tax payable)
TAX_THRESHOLD_UNDER_65 = Decimal("95_750") / 12  # R7,979.17/month
TAX_THRESHOLD_65_TO_74 = Decimal("148_217") / 12  # R12,351.42/month
TAX_THRESHOLD_75_PLUS = Decimal("165_689") / 12   # R13,807.42/month


# =============================================================================
# UIF (Unemployment Insurance Fund)
# =============================================================================

UIF_RATE = Decimal("0.01")  # 1% each from employee and employer
UIF_MAX_MONTHLY_EARNINGS = Decimal("17_712")  # Maximum earnings for UIF calculation
UIF_MAX_CONTRIBUTION = UIF_MAX_MONTHLY_EARNINGS * UIF_RATE  # R177.12 max


# =============================================================================
# SDL (Skills Development Levy)
# =============================================================================

SDL_RATE = Decimal("0.01")  # 1% of payroll (employer only)
SDL_THRESHOLD_ANNUAL = Decimal("500_000")  # Only if annual payroll > R500k


class SAPayrollService:
    """South African payroll deduction calculations."""

    @staticmethod
    def calculate_paye(
        gross_monthly: Decimal,
        age: int = 35,
        tax_year: int = 2024
    ) -> Dict[str, Decimal]:
        """
        Calculate PAYE (Pay As You Earn) tax.

        Args:
            gross_monthly: Gross monthly salary
            age: Employee age for rebate calculations
            tax_year: Tax year (default 2024 = 2024/2025 tax year)

        Returns:
            Dictionary with tax breakdown
        """
        gross = Decimal(str(gross_monthly))

        # Get applicable tax threshold
        if age >= 75:
            threshold = TAX_THRESHOLD_75_PLUS
            rebate = PRIMARY_REBATE + SECONDARY_REBATE + TERTIARY_REBATE
        elif age >= 65:
            threshold = TAX_THRESHOLD_65_TO_74
            rebate = PRIMARY_REBATE + SECONDARY_REBATE
        else:
            threshold = TAX_THRESHOLD_UNDER_65
            rebate = PRIMARY_REBATE

        # No tax if below threshold
        if gross <= threshold:
            return {
                "gross_income": gross.quantize(Decimal("0.01")),
                "taxable_income": Decimal("0"),
                "tax_before_rebate": Decimal("0"),
                "rebate": rebate.quantize(Decimal("0.01")),
                "paye": Decimal("0"),
                "effective_rate": Decimal("0")
            }

        # Calculate tax using brackets
        tax = Decimal("0")
        remaining = gross

        for i, (threshold_amt, rate, base) in enumerate(PAYE_BRACKETS_2024):
            prev_threshold = PAYE_BRACKETS_2024[i-1][0] if i > 0 else Decimal("0")

            if threshold_amt is None:
                # Top bracket
                tax = base + (remaining - prev_threshold) * rate
                break
            elif gross <= threshold_amt:
                tax = base + (remaining - prev_threshold) * rate
                break

        # Apply rebate
        tax_after_rebate = max(Decimal("0"), tax - rebate)

        # Effective rate
        effective_rate = (tax_after_rebate / gross * 100) if gross > 0 else Decimal("0")

        return {
            "gross_income": gross.quantize(Decimal("0.01")),
            "taxable_income": gross.quantize(Decimal("0.01")),
            "tax_before_rebate": tax.quantize(Decimal("0.01")),
            "rebate": rebate.quantize(Decimal("0.01")),
            "paye": tax_after_rebate.quantize(Decimal("0.01")),
            "effective_rate": effective_rate.quantize(Decimal("0.01"))
        }

    @staticmethod
    def calculate_uif(gross_monthly: Decimal) -> Dict[str, Decimal]:
        """
        Calculate UIF (Unemployment Insurance Fund) contributions.

        UIF is 1% from employee and 1% from employer.
        Maximum contribution based on R17,712 monthly earnings.

        Args:
            gross_monthly: Gross monthly salary

        Returns:
            Dictionary with UIF breakdown
        """
        gross = Decimal(str(gross_monthly))

        # Cap at maximum earnings
        uif_earnings = min(gross, UIF_MAX_MONTHLY_EARNINGS)

        employee_contribution = (uif_earnings * UIF_RATE).quantize(Decimal("0.01"))
        employer_contribution = (uif_earnings * UIF_RATE).quantize(Decimal("0.01"))

        return {
            "uif_earnings": uif_earnings.quantize(Decimal("0.01")),
            "employee_contribution": employee_contribution,
            "employer_contribution": employer_contribution,
            "total_contribution": (employee_contribution + employer_contribution).quantize(Decimal("0.01")),
            "max_contribution": UIF_MAX_CONTRIBUTION.quantize(Decimal("0.01"))
        }

    @staticmethod
    def calculate_sdl(
        total_monthly_payroll: Decimal,
        is_exempt: bool = False
    ) -> Dict[str, Decimal]:
        """
        Calculate SDL (Skills Development Levy).

        SDL is 1% of total payroll, payable by employer only.
        Only applicable if annual payroll exceeds R500,000.

        Args:
            total_monthly_payroll: Total monthly payroll for organization
            is_exempt: Whether organization is exempt (e.g., public benefit organizations)

        Returns:
            Dictionary with SDL breakdown
        """
        payroll = Decimal(str(total_monthly_payroll))
        annual_payroll = payroll * 12

        # Exempt organizations or below threshold
        if is_exempt or annual_payroll < SDL_THRESHOLD_ANNUAL:
            return {
                "monthly_payroll": payroll.quantize(Decimal("0.01")),
                "annual_payroll_estimate": annual_payroll.quantize(Decimal("0.01")),
                "sdl_applicable": False,
                "sdl_amount": Decimal("0"),
                "reason": "Exempt" if is_exempt else "Below R500,000 threshold"
            }

        sdl = (payroll * SDL_RATE).quantize(Decimal("0.01"))

        return {
            "monthly_payroll": payroll.quantize(Decimal("0.01")),
            "annual_payroll_estimate": annual_payroll.quantize(Decimal("0.01")),
            "sdl_applicable": True,
            "sdl_amount": sdl,
            "reason": None
        }

    @staticmethod
    def calculate_net_pay(
        gross_monthly: Decimal,
        age: int = 35,
        include_uif: bool = True,
        other_deductions: Decimal = Decimal("0")
    ) -> Dict[str, Decimal]:
        """
        Calculate complete net pay with all deductions.

        Args:
            gross_monthly: Gross monthly salary
            age: Employee age for PAYE calculations
            include_uif: Include UIF deduction
            other_deductions: Other deductions (e.g., pension, medical aid)

        Returns:
            Complete payslip breakdown
        """
        gross = Decimal(str(gross_monthly))
        other = Decimal(str(other_deductions))

        # Calculate each component
        paye = SAPayrollService.calculate_paye(gross, age)
        uif = SAPayrollService.calculate_uif(gross)

        # Total deductions (employee portion only)
        total_deductions = paye["paye"] + (uif["employee_contribution"] if include_uif else Decimal("0")) + other

        # Net pay
        net_pay = gross - total_deductions

        return {
            "gross_pay": gross.quantize(Decimal("0.01")),
            "paye": paye["paye"],
            "uif_employee": uif["employee_contribution"] if include_uif else Decimal("0"),
            "other_deductions": other.quantize(Decimal("0.01")),
            "total_deductions": total_deductions.quantize(Decimal("0.01")),
            "net_pay": net_pay.quantize(Decimal("0.01")),
            "employer_uif": uif["employer_contribution"] if include_uif else Decimal("0"),
            "effective_tax_rate": paye["effective_rate"]
        }

    @staticmethod
    def calculate_contractor_payment(
        gross_amount: Decimal,
        is_independent_contractor: bool = True
    ) -> Dict[str, Decimal]:
        """
        Calculate payment for independent contractors.

        SARS Classification:
        - Independent contractors are NOT employees
        - No PAYE withholding (they handle their own provisional tax)
        - No UIF contributions (not eligible)
        - No SDL levy (only for employees)

        Contractor is responsible for:
        - Provisional tax payments to SARS
        - Their own tax returns
        - VAT registration (if turnover > R1M)

        Args:
            gross_amount: Gross amount to pay contractor
            is_independent_contractor: Confirm contractor status

        Returns:
            Payment breakdown (no deductions for independent contractors)
        """
        gross = Decimal(str(gross_amount))

        if not is_independent_contractor:
            # Not a contractor - this shouldn't be called
            raise ValueError(
                "calculate_contractor_payment should only be used for independent contractors. "
                "Use calculate_net_pay for employees."
            )

        return {
            "gross_pay": gross.quantize(Decimal("0.01")),
            "paye": Decimal("0"),  # No PAYE withholding for contractors
            "uif_employee": Decimal("0"),  # No UIF for contractors
            "uif_employer": Decimal("0"),  # No UIF for contractors
            "sdl": Decimal("0"),  # No SDL for contractors
            "total_deductions": Decimal("0"),
            "net_pay": gross.quantize(Decimal("0.01")),  # Full amount paid to contractor
            "tax_note": (
                "Independent contractor - no tax withholding. "
                "You are responsible for provisional tax payments to SARS."
            ),
            "sars_classification": "Independent Contractor",
            "is_employee": False
        }

    @staticmethod
    def calculate_payment_with_employee_check(
        gross_amount: Decimal,
        is_independent_contractor: bool,
        age: int = 35,
        other_deductions: Decimal = Decimal("0")
    ) -> Dict[str, Decimal]:
        """
        Calculate payment with automatic employee vs contractor check.

        This is the main method to use when calculating any payment.
        It automatically routes to the correct calculation based on employment status.

        Args:
            gross_amount: Gross amount/salary
            is_independent_contractor: True for contractors, False for employees
            age: Employee age (for PAYE rebates, ignored for contractors)
            other_deductions: Other deductions (employees only)

        Returns:
            Payment breakdown with appropriate deductions
        """
        if is_independent_contractor:
            return SAPayrollService.calculate_contractor_payment(gross_amount, True)
        else:
            return SAPayrollService.calculate_net_pay(
                gross_amount,
                age=age,
                include_uif=True,
                other_deductions=other_deductions
            )

    @staticmethod
    def calculate_cost_to_company(
        gross_monthly: Decimal,
        total_monthly_payroll: Decimal = Decimal("0"),
        include_sdl: bool = True
    ) -> Dict[str, Decimal]:
        """
        Calculate total cost to company for an employee.

        Args:
            gross_monthly: Employee gross monthly salary
            total_monthly_payroll: Organization total payroll (for SDL)
            include_sdl: Include SDL in calculation

        Returns:
            Cost to company breakdown
        """
        gross = Decimal(str(gross_monthly))
        payroll = Decimal(str(total_monthly_payroll))

        # UIF employer portion
        uif = SAPayrollService.calculate_uif(gross)

        # SDL (proportional based on employee gross)
        sdl = Decimal("0")
        if include_sdl and payroll * 12 >= SDL_THRESHOLD_ANNUAL:
            # Proportional SDL based on employee's share of payroll
            sdl = (gross * SDL_RATE).quantize(Decimal("0.01"))

        total_ctc = gross + uif["employer_contribution"] + sdl

        return {
            "gross_pay": gross.quantize(Decimal("0.01")),
            "employer_uif": uif["employer_contribution"],
            "employer_sdl": sdl,
            "total_cost_to_company": total_ctc.quantize(Decimal("0.01"))
        }


# =============================================================================
# QUICK REFERENCE
# =============================================================================

def get_tax_tables_reference() -> Dict:
    """Return tax tables for reference/display."""
    return {
        "tax_year": "2024/2025",
        "effective_from": "1 March 2024",
        "brackets": [
            {"from": 1, "to": 237_100, "rate": "18%"},
            {"from": 237_101, "to": 370_500, "rate": "26%"},
            {"from": 370_501, "to": 512_800, "rate": "31%"},
            {"from": 512_801, "to": 673_000, "rate": "36%"},
            {"from": 673_001, "to": 857_900, "rate": "39%"},
            {"from": 857_901, "to": 1_817_000, "rate": "41%"},
            {"from": 1_817_001, "to": None, "rate": "45%"},
        ],
        "rebates": {
            "primary": 17_235,
            "secondary_65_plus": 9_444,
            "tertiary_75_plus": 3_145
        },
        "thresholds": {
            "under_65": 95_750,
            "65_to_74": 148_217,
            "75_plus": 165_689
        },
        "uif": {
            "rate": "1% employee + 1% employer",
            "max_earnings": 17_712,
            "max_contribution_per_party": 177.12
        },
        "sdl": {
            "rate": "1% employer",
            "threshold": 500_000
        }
    }
