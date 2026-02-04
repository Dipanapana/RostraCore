"""
Generic Tax Calculation Engine.

Config-driven tax engine that works for ANY country by reading tax rules
from country JSON configs. Replaces hardcoded sa_payroll_service.py.

Usage:
    from app.services.country_service import CountryService
    from app.services.tax_engine import TaxEngine

    config = CountryService.load_config("ZA")
    engine = TaxEngine(config)
    result = engine.calculate_net_pay(Decimal("25000"), age=35)
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional


class TaxEngine:
    """Generic tax calculation engine driven by country config JSON."""

    def __init__(self, country_config: dict):
        """
        Initialize tax engine with country configuration.

        Args:
            country_config: Country config dict from CountryService
        """
        self.config = country_config
        self.tax_rules = country_config.get("tax_rules", {})
        self.currency = country_config.get("currency", {})
        self.decimal_places = self.currency.get("decimal_places", 2)

    def calculate_income_tax(
        self,
        gross_annual: Decimal,
        age: int = 35,
    ) -> Dict[str, Decimal]:
        """
        Calculate income tax using bracket or flat rate config.

        Args:
            gross_annual: Annual gross income
            age: Employee age (for age-based rebates)

        Returns:
            Dict with tax breakdown (tax_before_rebate, rebate, tax, effective_rate)
        """
        tax_config = self.tax_rules.get("income_tax", {})
        tax_type = tax_config.get("type", "bracket")

        if tax_type == "bracket":
            return self._calc_bracket_tax(gross_annual, age, tax_config)
        elif tax_type == "flat":
            return self._calc_flat_tax(gross_annual, tax_config)
        else:
            raise ValueError(f"Unknown tax type: {tax_type}")

    def _calc_bracket_tax(
        self,
        gross_annual: Decimal,
        age: int,
        config: dict
    ) -> Dict[str, Decimal]:
        """Calculate progressive bracket-based income tax."""
        gross = Decimal(str(gross_annual))
        brackets = config.get("brackets", [])
        rebates = config.get("rebates", [])
        thresholds = config.get("thresholds", [])

        # Calculate rebate based on age
        # Rebates are cumulative: primary for all, then ADDITIONAL rebates for older people
        total_rebate = Decimal("0")
        for rebate_config in rebates:
            rebate_name = rebate_config.get("name", "")
            min_age = rebate_config.get("min_age", 0)

            # Primary rebate ALWAYS applies to everyone (ignore max_age for primary)
            if rebate_name == "primary":
                total_rebate += Decimal(str(rebate_config.get("amount", 0)))
            # Secondary/tertiary rebates are ADDITIONAL - only check min_age
            elif rebate_name in ["secondary", "tertiary"]:
                if age >= min_age:
                    total_rebate += Decimal(str(rebate_config.get("amount", 0)))

        # Calculate tax using brackets
        tax_before_rebate = Decimal("0")
        remaining_income = gross

        for bracket in brackets:
            from_amount = Decimal(str(bracket["from"]))
            to_amount = Decimal(str(bracket.get("to") or "999999999"))
            rate = Decimal(str(bracket["rate"]))
            base = Decimal(str(bracket.get("base", 0)))

            if remaining_income <= from_amount:
                break

            # Income in this bracket
            income_in_bracket = min(remaining_income, to_amount) - from_amount
            if income_in_bracket > 0:
                tax_before_rebate = base + (income_in_bracket * rate)

            if remaining_income <= to_amount or to_amount == Decimal("999999999"):
                break

        # Apply rebate
        tax_after_rebate = max(tax_before_rebate - total_rebate, Decimal("0"))

        # Check threshold
        applicable_threshold = Decimal("0")
        for threshold_config in thresholds:
            min_age = threshold_config.get("min_age", 0)
            max_age = threshold_config.get("max_age", 999)
            if min_age <= age <= max_age:
                applicable_threshold = Decimal(str(threshold_config.get("amount", 0)))
                break

        if gross <= applicable_threshold:
            tax_after_rebate = Decimal("0")

        # Calculate effective rate
        effective_rate = (tax_after_rebate / gross * 100) if gross > 0 else Decimal("0")

        return {
            "tax_before_rebate": tax_before_rebate.quantize(Decimal("0.01"), ROUND_HALF_UP),
            "rebate": total_rebate.quantize(Decimal("0.01"), ROUND_HALF_UP),
            "tax": tax_after_rebate.quantize(Decimal("0.01"), ROUND_HALF_UP),
            "effective_rate": effective_rate.quantize(Decimal("0.01"), ROUND_HALF_UP),
        }

    def _calc_flat_tax(self, gross_annual: Decimal, config: dict) -> Dict[str, Decimal]:
        """Calculate flat rate income tax."""
        rate = Decimal(str(config.get("rate", 0)))
        tax = gross_annual * rate

        return {
            "tax_before_rebate": tax.quantize(Decimal("0.01"), ROUND_HALF_UP),
            "rebate": Decimal("0"),
            "tax": tax.quantize(Decimal("0.01"), ROUND_HALF_UP),
            "effective_rate": (rate * 100).quantize(Decimal("0.01"), ROUND_HALF_UP),
        }

    def calculate_social_contributions(
        self,
        gross_monthly: Decimal,
        total_org_payroll_annual: Decimal = Decimal("0")
    ) -> List[Dict[str, Decimal]]:
        """
        Calculate social contributions (UIF, FICA, NI, etc.) per country config.

        Args:
            gross_monthly: Monthly gross salary
            total_org_payroll_annual: Total organization annual payroll (for threshold checks)

        Returns:
            List of contributions with employee and employer amounts
        """
        contributions = []
        social_config = self.tax_rules.get("social_contributions", [])

        for contrib_config in social_config:
            name = contrib_config.get("name", "Unknown")
            contrib_type = contrib_config.get("type", "percentage")
            employee_rate = Decimal(str(contrib_config.get("employee_rate", 0)))
            employer_rate = Decimal(str(contrib_config.get("employer_rate", 0)))

            # Check threshold (some contributions only apply above certain org payroll)
            threshold_annual = contrib_config.get("threshold_annual")
            if threshold_annual and total_org_payroll_annual > 0:
                if total_org_payroll_annual < Decimal(str(threshold_annual)):
                    continue  # Skip this contribution

            if contrib_type == "percentage":
                # Calculate based on percentage of gross
                max_earnings = contrib_config.get("max_earnings")
                capped_gross = gross_monthly

                if max_earnings:
                    capped_gross = min(gross_monthly, Decimal(str(max_earnings)))

                employee_amount = (capped_gross * employee_rate).quantize(
                    Decimal("0.01"), ROUND_HALF_UP
                )
                employer_amount = (capped_gross * employer_rate).quantize(
                    Decimal("0.01"), ROUND_HALF_UP
                )

                contributions.append({
                    "name": name,
                    "type": contrib_type,
                    "employee_amount": employee_amount,
                    "employer_amount": employer_amount,
                    "description": contrib_config.get("description", ""),
                })

            elif contrib_type == "tiered":
                # Tiered contributions (e.g., NHIF in Kenya)
                rate_table = contrib_config.get("employee_rate_table", [])
                employee_amount = Decimal("0")

                for tier in rate_table:
                    from_amount = Decimal(str(tier["from"]))
                    to_amount = Decimal(str(tier.get("to") or "999999999"))
                    if from_amount <= gross_monthly <= to_amount:
                        employee_amount = Decimal(str(tier["amount"]))
                        break

                contributions.append({
                    "name": name,
                    "type": contrib_type,
                    "employee_amount": employee_amount.quantize(Decimal("0.01"), ROUND_HALF_UP),
                    "employer_amount": Decimal("0"),
                    "description": contrib_config.get("description", ""),
                })

        return contributions

    def calculate_net_pay(
        self,
        gross_monthly: Decimal,
        age: int = 35,
        other_deductions: Decimal = Decimal("0"),
        total_org_payroll_annual: Decimal = Decimal("0")
    ) -> Dict[str, Decimal]:
        """
        Calculate net pay after all deductions.

        Args:
            gross_monthly: Monthly gross salary
            age: Employee age
            other_deductions: Other deductions (loans, garnishments, etc.)
            total_org_payroll_annual: Total organization payroll for threshold checks

        Returns:
            Dict with comprehensive payroll breakdown
        """
        gross = Decimal(str(gross_monthly))

        # Calculate annual income tax
        gross_annual = gross * 12
        tax_result = self.calculate_income_tax(gross_annual, age)
        income_tax_monthly = (tax_result["tax"] / 12).quantize(
            Decimal("0.01"), ROUND_HALF_UP
        )

        # Calculate social contributions
        social_contributions = self.calculate_social_contributions(
            gross, total_org_payroll_annual
        )

        # Sum employee deductions
        total_social_employee = sum(
            c["employee_amount"] for c in social_contributions
        )

        # Calculate net pay
        total_deductions = income_tax_monthly + total_social_employee + other_deductions
        net_pay = (gross - total_deductions).quantize(Decimal("0.01"), ROUND_HALF_UP)

        return {
            "gross_pay": gross.quantize(Decimal("0.01"), ROUND_HALF_UP),
            "income_tax": income_tax_monthly,
            "social_contributions": social_contributions,
            "total_social_employee": total_social_employee.quantize(Decimal("0.01"), ROUND_HALF_UP),
            "other_deductions": other_deductions.quantize(Decimal("0.01"), ROUND_HALF_UP),
            "total_deductions": total_deductions.quantize(Decimal("0.01"), ROUND_HALF_UP),
            "net_pay": net_pay,
        }

    def calculate_cost_to_company(
        self,
        gross_monthly: Decimal,
        total_org_payroll_annual: Decimal = Decimal("0")
    ) -> Dict[str, Decimal]:
        """
        Calculate cost to company (gross + employer contributions).

        Args:
            gross_monthly: Monthly gross salary
            total_org_payroll_annual: Total organization payroll for threshold checks

        Returns:
            Dict with CTC breakdown
        """
        gross = Decimal(str(gross_monthly))

        # Calculate social contributions
        social_contributions = self.calculate_social_contributions(
            gross, total_org_payroll_annual
        )

        # Sum employer contributions
        total_employer_contributions = sum(
            c["employer_amount"] for c in social_contributions
        ).quantize(Decimal("0.01"), ROUND_HALF_UP)

        # CTC = gross + employer contributions
        ctc = (gross + total_employer_contributions).quantize(
            Decimal("0.01"), ROUND_HALF_UP
        )

        return {
            "gross_pay": gross.quantize(Decimal("0.01"), ROUND_HALF_UP),
            "employer_contributions": total_employer_contributions,
            "ctc": ctc,
        }
