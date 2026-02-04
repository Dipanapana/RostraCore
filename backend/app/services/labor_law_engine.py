"""
Generic Labor Law Validation Engine.

Config-driven labor law engine that works for ANY country by reading labor law rules
from country JSON configs. Replaces hardcoded bcea_compliance_service.py.

Usage:
    from app.services.country_service import CountryService
    from app.services.labor_law_engine import LaborLawEngine

    config = CountryService.load_config("ZA")
    engine = LaborLawEngine(config)
    result = engine.validate_weekly_hours(50, "shift_based")
"""

from decimal import Decimal
from typing import Dict, List, Optional


class LaborLawEngine:
    """Generic labor law validation engine driven by country config JSON."""

    def __init__(self, country_config: dict):
        """
        Initialize labor law engine with country configuration.

        Args:
            country_config: Country config dict from CountryService
        """
        self.config = country_config
        self.laws = country_config.get("labor_laws", {})
        self.rules = {r["id"]: r for r in self.laws.get("rules", [])}

    def get_max_weekly_hours(self, work_pattern: str = "shift_based") -> int:
        """
        Get maximum weekly hours for work pattern type.

        Args:
            work_pattern: "shift_based" or "office" or other work pattern

        Returns:
            Maximum weekly hours allowed
        """
        hours_config = self.laws.get("max_weekly_hours", {})

        if isinstance(hours_config, dict):
            return hours_config.get(work_pattern, hours_config.get("shift_based", 48))
        return int(hours_config)  # Single value for all patterns

    def get_max_daily_hours(self, work_pattern: str = "shift_based") -> Optional[int]:
        """Get maximum daily hours for work pattern type."""
        hours_config = self.laws.get("max_daily_hours", {})

        if isinstance(hours_config, dict):
            return hours_config.get(work_pattern)
        return hours_config

    def get_min_rest_hours(self) -> Optional[int]:
        """Get minimum rest hours between shifts."""
        return self.laws.get("min_rest_hours_between_shifts")

    def get_max_consecutive_days(self) -> Optional[int]:
        """Get maximum consecutive working days."""
        return self.laws.get("max_consecutive_days")

    def get_meal_break_threshold(self) -> Optional[int]:
        """Get hours after which meal break is required."""
        return self.laws.get("meal_break_required_after_hours")

    def get_overtime_multiplier(self) -> Decimal:
        """Get overtime pay multiplier."""
        multiplier = self.laws.get("overtime_multiplier", 1.5)
        return Decimal(str(multiplier))

    def get_sunday_multiplier(self) -> Decimal:
        """Get Sunday work pay multiplier."""
        multiplier = self.laws.get("sunday_multiplier", 1.0)
        return Decimal(str(multiplier))

    def get_public_holiday_multiplier(self) -> Decimal:
        """Get public holiday pay multiplier."""
        multiplier = self.laws.get("public_holiday_multiplier", 1.0)
        return Decimal(str(multiplier))

    def get_annual_leave_days(self) -> int:
        """Get annual leave entitlement in days."""
        return self.laws.get("annual_leave_days", 0)

    def is_overtime(
        self,
        hours_worked_this_week: float,
        work_pattern: str = "shift_based"
    ) -> bool:
        """
        Check if hours worked constitute overtime.

        Args:
            hours_worked_this_week: Total hours worked in the week
            work_pattern: Work pattern type

        Returns:
            True if overtime, False otherwise
        """
        max_hours = self.get_max_weekly_hours(work_pattern)
        return hours_worked_this_week > max_hours

    def validate_weekly_hours(
        self,
        hours_worked: float,
        work_pattern: str = "shift_based"
    ) -> Dict[str, any]:
        """
        Validate weekly hours against maximum.

        Args:
            hours_worked: Total hours worked in the week
            work_pattern: Work pattern type

        Returns:
            Dict with compliance status and violations
        """
        max_hours = self.get_max_weekly_hours(work_pattern)
        violations = []
        warnings = []
        info = []

        if hours_worked > max_hours:
            rule = self.rules.get("max_weekly", {})
            severity = rule.get("severity", "block")
            description = rule.get("description", "Maximum weekly hours exceeded")

            violation = {
                "rule_id": "max_weekly",
                "severity": severity,
                "description": description,
                "actual": hours_worked,
                "limit": max_hours,
            }

            if severity == "block":
                violations.append(violation)
            elif severity == "warn":
                warnings.append(violation)
            else:
                info.append(violation)

        return {
            "compliant": len(violations) == 0,
            "violations": violations,
            "warnings": warnings,
            "info": info,
        }

    def validate_rest_period(self, hours_since_last_shift: float) -> Dict[str, any]:
        """
        Validate rest period between shifts.

        Args:
            hours_since_last_shift: Hours since last shift ended

        Returns:
            Dict with compliance status and violations
        """
        min_rest = self.get_min_rest_hours()
        violations = []
        warnings = []
        info = []

        if min_rest and hours_since_last_shift < min_rest:
            rule = self.rules.get("min_rest", {})
            severity = rule.get("severity", "block")
            description = rule.get("description", "Insufficient rest between shifts")

            violation = {
                "rule_id": "min_rest",
                "severity": severity,
                "description": description,
                "actual": hours_since_last_shift,
                "required": min_rest,
            }

            if severity == "block":
                violations.append(violation)
            elif severity == "warn":
                warnings.append(violation)
            else:
                info.append(violation)

        return {
            "compliant": len(violations) == 0,
            "violations": violations,
            "warnings": warnings,
            "info": info,
        }

    def validate_consecutive_days(self, consecutive_days: int) -> Dict[str, any]:
        """
        Validate consecutive working days.

        Args:
            consecutive_days: Number of consecutive days worked

        Returns:
            Dict with compliance status and violations
        """
        max_consecutive = self.get_max_consecutive_days()
        violations = []
        warnings = []
        info = []

        if max_consecutive and consecutive_days > max_consecutive:
            rule = self.rules.get("max_consecutive", {})
            severity = rule.get("severity", "warn")
            description = rule.get("description", "Maximum consecutive days exceeded")

            violation = {
                "rule_id": "max_consecutive",
                "severity": severity,
                "description": description,
                "actual": consecutive_days,
                "limit": max_consecutive,
            }

            if severity == "block":
                violations.append(violation)
            elif severity == "warn":
                warnings.append(violation)
            else:
                info.append(violation)

        return {
            "compliant": len(violations) == 0,
            "violations": violations,
            "warnings": warnings,
            "info": info,
        }

    def validate_meal_break(
        self,
        shift_duration_hours: float,
        meal_break_provided: bool
    ) -> Dict[str, any]:
        """
        Validate meal break requirement.

        Args:
            shift_duration_hours: Duration of shift in hours
            meal_break_provided: Whether meal break was provided

        Returns:
            Dict with compliance status and violations
        """
        meal_threshold = self.get_meal_break_threshold()
        violations = []
        warnings = []
        info = []

        if meal_threshold and shift_duration_hours >= meal_threshold and not meal_break_provided:
            rule = self.rules.get("meal_break", {})
            severity = rule.get("severity", "warn")
            description = rule.get("description", "Meal break required")

            violation = {
                "rule_id": "meal_break",
                "severity": severity,
                "description": description,
                "shift_duration": shift_duration_hours,
                "threshold": meal_threshold,
            }

            if severity == "block":
                violations.append(violation)
            elif severity == "warn":
                warnings.append(violation)
            else:
                info.append(violation)

        return {
            "compliant": len(violations) == 0,
            "violations": violations,
            "warnings": warnings,
            "info": info,
        }

    def validate_shift(
        self,
        shift_duration_hours: float,
        hours_worked_this_week: float,
        hours_since_last_shift: Optional[float] = None,
        consecutive_days: Optional[int] = None,
        meal_break_provided: bool = True,
        work_pattern: str = "shift_based"
    ) -> Dict[str, any]:
        """
        Validate entire shift assignment against all labor laws.

        Args:
            shift_duration_hours: Duration of this shift in hours
            hours_worked_this_week: Total hours already worked this week
            hours_since_last_shift: Hours since last shift (None if first shift)
            consecutive_days: Consecutive days worked (None to skip check)
            meal_break_provided: Whether meal break will be provided
            work_pattern: Work pattern type

        Returns:
            Dict with comprehensive compliance status
        """
        all_violations = []
        all_warnings = []
        all_info = []

        # Check weekly hours (including this shift)
        total_hours = hours_worked_this_week + shift_duration_hours
        weekly_result = self.validate_weekly_hours(total_hours, work_pattern)
        all_violations.extend(weekly_result["violations"])
        all_warnings.extend(weekly_result["warnings"])
        all_info.extend(weekly_result["info"])

        # Check rest period
        if hours_since_last_shift is not None:
            rest_result = self.validate_rest_period(hours_since_last_shift)
            all_violations.extend(rest_result["violations"])
            all_warnings.extend(rest_result["warnings"])
            all_info.extend(rest_result["info"])

        # Check consecutive days
        if consecutive_days is not None:
            consecutive_result = self.validate_consecutive_days(consecutive_days)
            all_violations.extend(consecutive_result["violations"])
            all_warnings.extend(consecutive_result["warnings"])
            all_info.extend(consecutive_result["info"])

        # Check meal break
        meal_result = self.validate_meal_break(shift_duration_hours, meal_break_provided)
        all_violations.extend(meal_result["violations"])
        all_warnings.extend(meal_result["warnings"])
        all_info.extend(meal_result["info"])

        return {
            "compliant": len(all_violations) == 0,
            "violations": all_violations,
            "warnings": all_warnings,
            "info": all_info,
        }
