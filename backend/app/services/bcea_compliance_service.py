"""
BCEA (Basic Conditions of Employment Act) Compliance Service.

Implements South African labor law requirements for different employee types.
"""

from app.models.employee import Employee, EmploymentType, WorkPatternType


class BCEAComplianceService:
    """Service for BCEA compliance calculations and validation."""

    @staticmethod
    def get_max_weekly_hours(employee: Employee) -> int:
        """
        Get maximum weekly hours based on BCEA and employee type.

        BCEA Regulations:
        - Shift workers (security guards): 48 hours/week maximum ordinary time
        - Office workers: 45 hours/week maximum ordinary time
        - Part-time workers: Custom limit (max_hours_week or max_hours_month)

        Args:
            employee: Employee model instance

        Returns:
            Maximum hours per week (int)
        """
        if employee.work_pattern_type == WorkPatternType.SHIFT_BASED:
            # Security guards and shift workers
            return 48

        elif employee.work_pattern_type == WorkPatternType.OFFICE_HOURS:
            # Office staff
            return 45

        elif employee.employment_type == EmploymentType.PART_TIME:
            # Part-time workers have custom limits
            if employee.max_hours_week:
                return employee.max_hours_week
            elif employee.max_hours_month:
                # Convert monthly limit to weekly (approximate: month/4.33 weeks)
                return int(employee.max_hours_month / 4.33)
            else:
                # Default part-time limit if not specified
                return 24

        else:
            # Default to office hours limit for flexible, project-based, custom
            return 45

    @staticmethod
    def get_max_daily_hours(employee: Employee) -> int:
        """
        Get maximum daily hours based on BCEA.

        BCEA Regulations:
        - Maximum 9 hours/day for 5-day workweek
        - Maximum 8 hours/day for 6-day workweek
        - Shift workers often work 12-hour shifts (allowed with averaging)

        Args:
            employee: Employee model instance

        Returns:
            Maximum hours per day (int)
        """
        if employee.work_pattern_type == WorkPatternType.SHIFT_BASED:
            # Shift workers typically 12-hour shifts
            return 12

        else:
            # Office staff typically 9 hours max (with averaging)
            return 9

    @staticmethod
    def get_minimum_rest_hours(employee: Employee) -> int:
        """
        Get minimum rest hours between shifts per BCEA.

        BCEA Regulations:
        - Minimum 8 hours rest between shifts (Section 15)
        - 12 hours recommended for fatigue management

        Args:
            employee: Employee model instance

        Returns:
            Minimum rest hours (int)
        """
        # BCEA minimum is 8 hours, but 12 is best practice
        return 12 if employee.work_pattern_type == WorkPatternType.SHIFT_BASED else 12

    @staticmethod
    def get_max_consecutive_days(employee: Employee) -> int:
        """
        Get maximum consecutive working days per BCEA.

        BCEA Regulations:
        - Maximum 6 consecutive days without a rest day (Section 16)

        Args:
            employee: Employee model instance

        Returns:
            Maximum consecutive working days (int)
        """
        return 6  # BCEA Section 16

    @staticmethod
    def requires_meal_break(shift_duration_hours: float) -> bool:
        """
        Check if meal break is required per BCEA.

        BCEA Regulations:
        - Meal break required for shifts >5 hours (Section 14)
        - Minimum 1 hour meal break (unpaid)

        Args:
            shift_duration_hours: Shift duration in hours

        Returns:
            True if meal break required
        """
        return shift_duration_hours > 5.0

    @staticmethod
    def get_meal_break_duration_minutes(shift_duration_hours: float) -> int:
        """
        Get meal break duration per BCEA.

        BCEA Regulations:
        - Minimum 1 hour (60 minutes) for shifts >5 hours

        Args:
            shift_duration_hours: Shift duration in hours

        Returns:
            Meal break duration in minutes
        """
        if shift_duration_hours > 5.0:
            return 60  # 1 hour
        return 0

    @staticmethod
    def calculate_leave_entitlement(employee: Employee) -> float:
        """
        Calculate annual leave entitlement per BCEA.

        BCEA Regulations:
        - 15 working days per year (Section 20) - full-time
        - Pro-rata for part-time workers based on hours worked

        Args:
            employee: Employee model instance

        Returns:
            Annual leave days (float for part-time pro-rata)
        """
        base_days = 15.0  # BCEA Section 20

        if employee.employment_type == EmploymentType.PART_TIME:
            # Pro-rata calculation for part-time workers
            full_time_hours = 45 if employee.work_pattern_type == WorkPatternType.OFFICE_HOURS else 48

            if employee.max_hours_week:
                ratio = employee.max_hours_week / full_time_hours
                return base_days * ratio
            elif employee.max_hours_month:
                # Convert monthly to weekly, then calculate ratio
                weekly_hours = employee.max_hours_month / 4.33
                ratio = weekly_hours / full_time_hours
                return base_days * ratio
            else:
                # Default part-time ratio (50%)
                return base_days * 0.5

        return base_days

    @staticmethod
    def calculate_sick_leave_entitlement(employee: Employee, months_employed: int) -> float:
        """
        Calculate sick leave entitlement per BCEA.

        BCEA Regulations:
        - 30 days per 36-month cycle (Section 22)
        - Or 1 day per 26 days worked in first 6 months

        Args:
            employee: Employee model instance
            months_employed: Number of months employed

        Returns:
            Sick leave days available
        """
        if months_employed >= 6:
            # Full entitlement: 30 days per 36-month cycle
            cycles_completed = months_employed / 36
            return 30.0 * cycles_completed
        else:
            # First 6 months: 1 day per 26 days worked
            # Approximate: 1 month = 22 working days
            working_days = months_employed * 22
            return working_days / 26

    @staticmethod
    def get_sunday_premium_rate() -> float:
        """
        Get Sunday premium rate per BCEA.

        BCEA Regulations:
        - Sunday work: 1.5x base rate (Section 17)

        Returns:
            Premium multiplier (1.5)
        """
        return 1.5

    @staticmethod
    def get_public_holiday_premium_rate() -> float:
        """
        Get public holiday premium rate per BCEA.

        BCEA Regulations:
        - Public holiday work: 2.0x base rate (Section 18)

        Returns:
            Premium multiplier (2.0)
        """
        return 2.0

    @staticmethod
    def get_night_shift_premium_percentage() -> float:
        """
        Get night shift premium percentage.

        Industry Standard (not BCEA mandated):
        - Night shifts (18:00-06:00): 10% premium

        Returns:
            Premium percentage (0.10 = 10%)
        """
        return 0.10  # 10% premium

    @staticmethod
    def is_overtime(
        employee: Employee,
        hours_worked_this_week: float,
        shift_duration_hours: float
    ) -> bool:
        """
        Check if shift should be classified as overtime.

        BCEA Regulations:
        - Overtime = work beyond max weekly hours
        - Overtime pay: 1.5x base rate

        Args:
            employee: Employee model instance
            hours_worked_this_week: Hours already worked this week
            shift_duration_hours: Duration of this shift

        Returns:
            True if shift is overtime
        """
        max_hours = BCEAComplianceService.get_max_weekly_hours(employee)
        total_hours = hours_worked_this_week + shift_duration_hours
        return total_hours > max_hours

    @staticmethod
    def validate_shift_assignment(
        employee: Employee,
        shift_duration_hours: float,
        hours_worked_this_week: float,
        consecutive_days_worked: int,
        hours_since_last_shift: float
    ) -> dict:
        """
        Validate if shift assignment complies with BCEA.

        Args:
            employee: Employee model instance
            shift_duration_hours: Duration of shift in hours
            hours_worked_this_week: Hours worked this week so far
            consecutive_days_worked: Consecutive days worked
            hours_since_last_shift: Hours since end of last shift

        Returns:
            Dict with:
                - compliant: bool
                - violations: list of violation messages
                - warnings: list of warning messages
        """
        violations = []
        warnings = []

        # Check weekly hours limit
        max_weekly_hours = BCEAComplianceService.get_max_weekly_hours(employee)
        if hours_worked_this_week + shift_duration_hours > max_weekly_hours + 12:  # Allow 12h overtime
            violations.append(
                f"Would exceed max weekly hours ({max_weekly_hours}h) + overtime (12h). "
                f"Currently: {hours_worked_this_week}h, shift: {shift_duration_hours}h"
            )

        # Check rest period
        min_rest = BCEAComplianceService.get_minimum_rest_hours(employee)
        if hours_since_last_shift < min_rest:
            violations.append(
                f"Insufficient rest since last shift. "
                f"Minimum: {min_rest}h, actual: {hours_since_last_shift:.1f}h"
            )

        # Check consecutive days
        max_consecutive = BCEAComplianceService.get_max_consecutive_days(employee)
        if consecutive_days_worked >= max_consecutive:
            warnings.append(
                f"Employee has worked {consecutive_days_worked} consecutive days. "
                f"BCEA max: {max_consecutive} days. Rest day required."
            )

        # Check meal break requirement
        if BCEAComplianceService.requires_meal_break(shift_duration_hours):
            warnings.append(
                f"Shift duration ({shift_duration_hours}h) requires 1-hour meal break (BCEA Section 14)"
            )

        return {
            "compliant": len(violations) == 0,
            "violations": violations,
            "warnings": warnings
        }
