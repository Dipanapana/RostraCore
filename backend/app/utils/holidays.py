"""
South African Public Holidays and Premium Rate Calculator.

This module provides utilities for:
- Identifying South African public holidays
- Calculating Sunday premium rates (1.5x)
- Calculating public holiday premium rates (2.0x)
- BCEA compliance for premium pay
"""

from datetime import date, datetime, timedelta
from typing import Optional


class SouthAfricanHolidays:
    """
    South African public holidays calendar.

    Based on Public Holidays Act, 1994 (Act No. 36 of 1994).
    Includes all 12 official public holidays in South Africa.
    """

    # Fixed date holidays
    FIXED_HOLIDAYS = {
        (1, 1): "New Year's Day",
        (3, 21): "Human Rights Day",
        (4, 27): "Freedom Day",
        (5, 1): "Workers' Day",
        (6, 16): "Youth Day",
        (8, 9): "National Women's Day",
        (9, 24): "Heritage Day",
        (12, 16): "Day of Reconciliation",
        (12, 25): "Christmas Day",
        (12, 26): "Day of Goodwill",
    }

    @classmethod
    def get_easter_sunday(cls, year: int) -> date:
        """
        Calculate Easter Sunday using Butcher's Algorithm.

        Args:
            year: Year to calculate Easter for

        Returns:
            Date of Easter Sunday
        """
        a = year % 19
        b = year // 100
        c = year % 100
        d = b // 4
        e = b % 4
        f = (b + 8) // 25
        g = (b - f + 1) // 3
        h = (19 * a + b - d - g + 15) % 30
        i = c // 4
        k = c % 4
        l = (32 + 2 * e + 2 * i - h - k) % 7
        m = (a + 11 * h + 22 * l) // 451
        month = (h + l - 7 * m + 114) // 31
        day = ((h + l - 7 * m + 114) % 31) + 1

        return date(year, month, day)

    @classmethod
    def get_public_holidays(cls, year: int) -> dict[date, str]:
        """
        Get all South African public holidays for a given year.

        Args:
            year: Year to get holidays for

        Returns:
            Dictionary mapping date to holiday name
        """
        holidays = {}

        # Add fixed date holidays
        for (month, day), name in cls.FIXED_HOLIDAYS.items():
            holiday_date = date(year, month, day)
            holidays[holiday_date] = name

            # If holiday falls on Sunday, Monday is also a public holiday
            if holiday_date.weekday() == 6:  # Sunday
                monday_date = holiday_date + timedelta(days=1)
                holidays[monday_date] = f"{name} (observed)"

        # Add Easter-based holidays
        easter = cls.get_easter_sunday(year)

        # Good Friday (2 days before Easter)
        good_friday = easter - timedelta(days=2)
        holidays[good_friday] = "Good Friday"

        # Family Day (Monday after Easter)
        family_day = easter + timedelta(days=1)
        holidays[family_day] = "Family Day"

        return holidays

    @classmethod
    def is_public_holiday(cls, check_date: date) -> bool:
        """
        Check if a date is a South African public holiday.

        Args:
            check_date: Date to check

        Returns:
            True if date is a public holiday
        """
        if isinstance(check_date, datetime):
            check_date = check_date.date()

        holidays = cls.get_public_holidays(check_date.year)
        return check_date in holidays

    @classmethod
    def get_holiday_name(cls, check_date: date) -> Optional[str]:
        """
        Get the name of the holiday if the date is a public holiday.

        Args:
            check_date: Date to check

        Returns:
            Holiday name or None if not a holiday
        """
        if isinstance(check_date, datetime):
            check_date = check_date.date()

        holidays = cls.get_public_holidays(check_date.year)
        return holidays.get(check_date)

    @classmethod
    def is_sunday(cls, check_date: date) -> bool:
        """
        Check if a date is a Sunday.

        Args:
            check_date: Date to check

        Returns:
            True if date is Sunday
        """
        if isinstance(check_date, datetime):
            check_date = check_date.date()

        return check_date.weekday() == 6


class PremiumRateCalculator:
    """
    Calculate premium rates for shifts based on BCEA regulations.

    BCEA Premium Rates:
    - Sunday work: 1.5x normal rate (150%)
    - Public holiday work: 2.0x normal rate (200%)
    """

    SUNDAY_MULTIPLIER = 1.5
    HOLIDAY_MULTIPLIER = 2.0

    @classmethod
    def calculate_shift_cost(
        cls,
        base_hourly_rate: float,
        hours: float,
        shift_date: date,
        include_premiums: bool = True
    ) -> tuple[float, float, str]:
        """
        Calculate total cost for a shift including premiums.

        Args:
            base_hourly_rate: Employee's base hourly rate
            hours: Number of hours worked
            shift_date: Date of the shift
            include_premiums: Whether to include premium calculations

        Returns:
            Tuple of (total_cost, premium_amount, premium_type)
        """
        if isinstance(shift_date, datetime):
            shift_date = shift_date.date()

        if not include_premiums:
            base_cost = base_hourly_rate * hours
            return (base_cost, 0.0, "none")

        # Check if public holiday (takes precedence over Sunday)
        if SouthAfricanHolidays.is_public_holiday(shift_date):
            multiplier = cls.HOLIDAY_MULTIPLIER
            total_cost = base_hourly_rate * hours * multiplier
            premium_amount = base_hourly_rate * hours * (multiplier - 1.0)
            holiday_name = SouthAfricanHolidays.get_holiday_name(shift_date)
            return (total_cost, premium_amount, f"holiday:{holiday_name}")

        # Check if Sunday
        if SouthAfricanHolidays.is_sunday(shift_date):
            multiplier = cls.SUNDAY_MULTIPLIER
            total_cost = base_hourly_rate * hours * multiplier
            premium_amount = base_hourly_rate * hours * (multiplier - 1.0)
            return (total_cost, premium_amount, "sunday")

        # Regular day
        base_cost = base_hourly_rate * hours
        return (base_cost, 0.0, "regular")

    @classmethod
    def get_premium_multiplier(cls, shift_date: date) -> float:
        """
        Get the premium multiplier for a given date.

        Args:
            shift_date: Date to check

        Returns:
            Premium multiplier (1.0 for regular, 1.5 for Sunday, 2.0 for holiday)
        """
        if isinstance(shift_date, datetime):
            shift_date = shift_date.date()

        if SouthAfricanHolidays.is_public_holiday(shift_date):
            return cls.HOLIDAY_MULTIPLIER

        if SouthAfricanHolidays.is_sunday(shift_date):
            return cls.SUNDAY_MULTIPLIER

        return 1.0
