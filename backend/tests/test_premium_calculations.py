"""
Tests for backend/app/utils/holidays.py
Validates South African public holiday detection and premium rate calculations.
Pure function tests — no database required.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import date, datetime, timedelta
from app.utils.holidays import SouthAfricanHolidays, PremiumRateCalculator


# ══════════════════════════════════════════════════════════════
# EASTER CALCULATION
# ══════════════════════════════════════════════════════════════

class TestEasterCalculation:
    def test_easter_2026(self):
        # Easter 2026 is April 5
        easter = SouthAfricanHolidays.get_easter_sunday(2026)
        assert easter == date(2026, 4, 5)

    def test_easter_2025(self):
        # Easter 2025 is April 20
        easter = SouthAfricanHolidays.get_easter_sunday(2025)
        assert easter == date(2025, 4, 20)

    def test_easter_2024(self):
        # Easter 2024 is March 31
        easter = SouthAfricanHolidays.get_easter_sunday(2024)
        assert easter == date(2024, 3, 31)


# ══════════════════════════════════════════════════════════════
# PUBLIC HOLIDAY DETECTION — 12 Official SA Holidays
# ══════════════════════════════════════════════════════════════

class TestPublicHolidays:
    def test_new_years_day(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 1, 1)) is True

    def test_human_rights_day(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 3, 21)) is True

    def test_good_friday(self):
        # 2026: Easter = April 5, so Good Friday = April 3
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 4, 3)) is True

    def test_family_day(self):
        # 2026: Easter = April 5, so Family Day = April 6 (Monday)
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 4, 6)) is True

    def test_freedom_day(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 4, 27)) is True

    def test_workers_day(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 5, 1)) is True

    def test_youth_day(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 6, 16)) is True

    def test_national_womens_day(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 8, 9)) is True

    def test_heritage_day(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 9, 24)) is True

    def test_day_of_reconciliation(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 12, 16)) is True

    def test_christmas_day(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 12, 25)) is True

    def test_day_of_goodwill(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 12, 26)) is True

    def test_regular_day_not_holiday(self):
        assert SouthAfricanHolidays.is_public_holiday(date(2026, 2, 15)) is False

    def test_total_holiday_count_2026(self):
        holidays = SouthAfricanHolidays.get_public_holidays(2026)
        # 10 fixed + 2 Easter-based = 12 base
        # Plus any Sunday-falls-on observed Mondays
        assert len(holidays) >= 12

    def test_sunday_observed_monday(self):
        # When a fixed holiday falls on Sunday, Monday is also a holiday.
        # Find a year where Jan 1 falls on Sunday: 2023
        holidays = SouthAfricanHolidays.get_public_holidays(2023)
        # Jan 1, 2023 is a Sunday
        assert date(2023, 1, 1) in holidays
        assert date(2023, 1, 2) in holidays  # Observed Monday

    def test_accepts_datetime(self):
        # Should accept datetime objects too
        dt = datetime(2026, 12, 25, 10, 0, 0)
        assert SouthAfricanHolidays.is_public_holiday(dt) is True


# ══════════════════════════════════════════════════════════════
# HOLIDAY NAME LOOKUP
# ══════════════════════════════════════════════════════════════

class TestHolidayName:
    def test_christmas_name(self):
        name = SouthAfricanHolidays.get_holiday_name(date(2026, 12, 25))
        assert name == "Christmas Day"

    def test_regular_day_returns_none(self):
        name = SouthAfricanHolidays.get_holiday_name(date(2026, 2, 15))
        assert name is None

    def test_workers_day_name(self):
        name = SouthAfricanHolidays.get_holiday_name(date(2026, 5, 1))
        assert name == "Workers' Day"


# ══════════════════════════════════════════════════════════════
# SUNDAY DETECTION
# ══════════════════════════════════════════════════════════════

class TestSundayDetection:
    def test_sunday(self):
        # Feb 22, 2026 is a Sunday
        assert SouthAfricanHolidays.is_sunday(date(2026, 2, 22)) is True

    def test_not_sunday(self):
        # Feb 23, 2026 is a Monday
        assert SouthAfricanHolidays.is_sunday(date(2026, 2, 23)) is False

    def test_accepts_datetime(self):
        dt = datetime(2026, 2, 22, 10, 0, 0)
        assert SouthAfricanHolidays.is_sunday(dt) is True


# ══════════════════════════════════════════════════════════════
# PREMIUM RATE CALCULATOR — Shift Cost
# ══════════════════════════════════════════════════════════════

class TestPremiumRateCalculator:
    def test_regular_weekday(self):
        # Monday Feb 23, 2026
        cost, premium, ptype = PremiumRateCalculator.calculate_shift_cost(
            base_hourly_rate=50.0, hours=12.0, shift_date=date(2026, 2, 23)
        )
        assert cost == 600.0  # 50 * 12 = 600
        assert premium == 0.0
        assert ptype == "regular"

    def test_sunday_premium(self):
        # Sunday Feb 22, 2026
        cost, premium, ptype = PremiumRateCalculator.calculate_shift_cost(
            base_hourly_rate=50.0, hours=12.0, shift_date=date(2026, 2, 22)
        )
        assert cost == 900.0  # 50 * 12 * 1.5 = 900
        assert premium == 300.0  # 50 * 12 * 0.5 = 300
        assert ptype == "sunday"

    def test_holiday_premium(self):
        # Christmas Day 2026
        cost, premium, ptype = PremiumRateCalculator.calculate_shift_cost(
            base_hourly_rate=50.0, hours=12.0, shift_date=date(2026, 12, 25)
        )
        assert cost == 1200.0  # 50 * 12 * 2.0 = 1200
        assert premium == 600.0  # 50 * 12 * 1.0 = 600
        assert "holiday" in ptype
        assert "Christmas" in ptype

    def test_holiday_takes_precedence_over_sunday(self):
        # Find a holiday that falls on Sunday
        # Jan 1, 2023 is a Sunday AND a public holiday
        cost, premium, ptype = PremiumRateCalculator.calculate_shift_cost(
            base_hourly_rate=100.0, hours=8.0, shift_date=date(2023, 1, 1)
        )
        # Holiday (2.0x) should take precedence over Sunday (1.5x)
        assert cost == 1600.0  # 100 * 8 * 2.0
        assert "holiday" in ptype

    def test_premiums_disabled(self):
        # Sunday but premiums disabled
        cost, premium, ptype = PremiumRateCalculator.calculate_shift_cost(
            base_hourly_rate=50.0, hours=12.0, shift_date=date(2026, 2, 22),
            include_premiums=False
        )
        assert cost == 600.0  # 50 * 12 = 600, no Sunday multiplier
        assert premium == 0.0
        assert ptype == "none"

    def test_accepts_datetime_shift_date(self):
        cost, premium, ptype = PremiumRateCalculator.calculate_shift_cost(
            base_hourly_rate=50.0, hours=12.0,
            shift_date=datetime(2026, 12, 25, 6, 0, 0)
        )
        assert cost == 1200.0  # Holiday rate


# ══════════════════════════════════════════════════════════════
# PREMIUM RATE MULTIPLIER
# ══════════════════════════════════════════════════════════════

class TestPremiumMultiplier:
    def test_regular_day(self):
        assert PremiumRateCalculator.get_premium_multiplier(date(2026, 2, 23)) == 1.0

    def test_sunday_multiplier(self):
        assert PremiumRateCalculator.get_premium_multiplier(date(2026, 2, 22)) == 1.5

    def test_holiday_multiplier(self):
        assert PremiumRateCalculator.get_premium_multiplier(date(2026, 12, 25)) == 2.0

    def test_accepts_datetime(self):
        mult = PremiumRateCalculator.get_premium_multiplier(
            datetime(2026, 2, 22, 10, 0)
        )
        assert mult == 1.5
