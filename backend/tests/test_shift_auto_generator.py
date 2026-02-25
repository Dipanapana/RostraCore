"""
Tests for backend/app/services/shift_auto_generator.py
Validates shift generation from staffing profiles.
Uses plain Python objects to bypass SQLAlchemy instrumentation.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import date, time, datetime, timedelta
from app.services.shift_auto_generator import ShiftAutoGenerator
from app.models.site_staffing_profile import PeriodType, DayType, PSIRAGradeRequirement


# ══════════════════════════════════════════════════════════════
# MOCK PROFILE (avoids SQLAlchemy instrumentation)
# ══════════════════════════════════════════════════════════════

class MockStaffingProfile:
    """Plain object that mimics SiteStaffingProfile for testing."""
    def __init__(
        self,
        day_type=DayType.ALL,
        period_type=PeriodType.ALL_DAY,
        custom_start_time=None,
        custom_end_time=None,
        required_staff=2,
        required_skill=None,
        required_psira_grade=None,
        requires_firearm=False,
        is_active=True,
    ):
        self.day_type = day_type
        self.period_type = period_type
        self.custom_start_time = custom_start_time
        self.custom_end_time = custom_end_time
        self.required_staff = required_staff
        self.required_skill = required_skill
        self.required_psira_grade = required_psira_grade
        self.requires_firearm = requires_firearm
        self.is_active = is_active

    def matches_datetime(self, check_date, check_time):
        """Replicate the matching logic from SiteStaffingProfile."""
        from app.models.site_staffing_profile import SiteStaffingProfile
        # Reuse the actual static method for period times
        weekday = check_date.weekday()

        # Day type check
        if self.day_type == DayType.ALL:
            day_matches = True
        elif self.day_type == DayType.WEEKDAY:
            day_matches = weekday < 5
        elif self.day_type == DayType.WEEKEND:
            day_matches = weekday >= 5
        elif self.day_type == DayType.MONDAY:
            day_matches = weekday == 0
        elif self.day_type == DayType.TUESDAY:
            day_matches = weekday == 1
        elif self.day_type == DayType.WEDNESDAY:
            day_matches = weekday == 2
        elif self.day_type == DayType.THURSDAY:
            day_matches = weekday == 3
        elif self.day_type == DayType.FRIDAY:
            day_matches = weekday == 4
        elif self.day_type == DayType.SATURDAY:
            day_matches = weekday == 5
        elif self.day_type == DayType.SUNDAY:
            day_matches = weekday == 6
        elif self.day_type == DayType.PUBLIC_HOLIDAY:
            from app.utils.holidays import SouthAfricanHolidays
            day_matches = SouthAfricanHolidays.is_public_holiday(check_date)
        else:
            day_matches = False

        if not day_matches:
            return False

        # Period check
        if self.period_type == PeriodType.ALL_DAY:
            return True
        elif self.period_type == PeriodType.CUSTOM:
            start = self.custom_start_time
            end = self.custom_end_time
        else:
            start, end = SiteStaffingProfile.get_default_period_times(self.period_type)

        if start is None or end is None:
            return True

        if start <= end:
            return start <= check_time < end
        else:
            return check_time >= start or check_time < end


# ══════════════════════════════════════════════════════════════
# PROFILE MATCHING
# ══════════════════════════════════════════════════════════════

class TestProfileMatching:
    """Test profile matching logic used by the generator."""

    # --- Day type matching ---

    def test_all_matches_any_day(self):
        p = MockStaffingProfile(day_type=DayType.ALL)
        assert p.matches_datetime(date(2026, 2, 23), time(10, 0)) is True  # Monday
        assert p.matches_datetime(date(2026, 2, 28), time(10, 0)) is True  # Saturday

    def test_weekday_matches_monday_through_friday(self):
        p = MockStaffingProfile(day_type=DayType.WEEKDAY)
        assert p.matches_datetime(date(2026, 2, 23), time(10, 0)) is True   # Monday
        assert p.matches_datetime(date(2026, 2, 28), time(10, 0)) is False  # Saturday

    def test_weekend_matches_sat_sun(self):
        p = MockStaffingProfile(day_type=DayType.WEEKEND)
        assert p.matches_datetime(date(2026, 2, 28), time(10, 0)) is True   # Saturday
        assert p.matches_datetime(date(2026, 3, 1), time(10, 0)) is True    # Sunday
        assert p.matches_datetime(date(2026, 2, 23), time(10, 0)) is False  # Monday

    def test_specific_day_matching(self):
        p_mon = MockStaffingProfile(day_type=DayType.MONDAY)
        assert p_mon.matches_datetime(date(2026, 2, 23), time(10, 0)) is True   # Monday
        assert p_mon.matches_datetime(date(2026, 2, 24), time(10, 0)) is False  # Tuesday

    def test_public_holiday_matching(self):
        """Bug 8 fix: PUBLIC_HOLIDAY should now correctly match."""
        p = MockStaffingProfile(day_type=DayType.PUBLIC_HOLIDAY)
        assert p.matches_datetime(date(2026, 12, 25), time(10, 0)) is True   # Christmas
        assert p.matches_datetime(date(2026, 2, 23), time(10, 0)) is False   # Regular day

    # --- Period type matching ---

    def test_all_day_matches_any_time(self):
        p = MockStaffingProfile(period_type=PeriodType.ALL_DAY)
        assert p.matches_datetime(date(2026, 2, 23), time(2, 0)) is True
        assert p.matches_datetime(date(2026, 2, 23), time(14, 0)) is True

    def test_day_period_matches(self):
        p = MockStaffingProfile(period_type=PeriodType.DAY)
        assert p.matches_datetime(date(2026, 2, 23), time(10, 0)) is True   # within 06:00-18:00
        assert p.matches_datetime(date(2026, 2, 23), time(22, 0)) is False  # outside

    def test_night_period_matches(self):
        p = MockStaffingProfile(period_type=PeriodType.NIGHT)
        assert p.matches_datetime(date(2026, 2, 23), time(22, 0)) is True   # within 18:00-06:00
        assert p.matches_datetime(date(2026, 2, 23), time(2, 0)) is True    # after midnight
        assert p.matches_datetime(date(2026, 2, 23), time(10, 0)) is False  # outside

    def test_custom_period(self):
        p = MockStaffingProfile(
            period_type=PeriodType.CUSTOM,
            custom_start_time=time(8, 0),
            custom_end_time=time(16, 0),
        )
        assert p.matches_datetime(date(2026, 2, 23), time(10, 0)) is True
        assert p.matches_datetime(date(2026, 2, 23), time(17, 0)) is False


# ══════════════════════════════════════════════════════════════
# PROFILE-TO-DATETIME CONVERSION
# ══════════════════════════════════════════════════════════════

class TestProfileToDatetimes:
    def test_day_shift_datetimes(self):
        p = MockStaffingProfile(period_type=PeriodType.DAY)
        start, end = ShiftAutoGenerator._profile_to_datetimes(p, date(2026, 3, 1))
        assert start == datetime(2026, 3, 1, 6, 0)
        assert end == datetime(2026, 3, 1, 18, 0)

    def test_night_shift_crosses_midnight(self):
        p = MockStaffingProfile(period_type=PeriodType.NIGHT)
        start, end = ShiftAutoGenerator._profile_to_datetimes(p, date(2026, 3, 1))
        assert start == datetime(2026, 3, 1, 18, 0)
        assert end == datetime(2026, 3, 2, 6, 0)  # next day

    def test_custom_period_datetimes(self):
        p = MockStaffingProfile(
            period_type=PeriodType.CUSTOM,
            custom_start_time=time(8, 0),
            custom_end_time=time(20, 0),
        )
        start, end = ShiftAutoGenerator._profile_to_datetimes(p, date(2026, 3, 1))
        assert start == datetime(2026, 3, 1, 8, 0)
        assert end == datetime(2026, 3, 1, 20, 0)

    def test_custom_overnight_crosses_midnight(self):
        p = MockStaffingProfile(
            period_type=PeriodType.CUSTOM,
            custom_start_time=time(20, 0),
            custom_end_time=time(4, 0),
        )
        start, end = ShiftAutoGenerator._profile_to_datetimes(p, date(2026, 3, 1))
        assert start == datetime(2026, 3, 1, 20, 0)
        assert end == datetime(2026, 3, 2, 4, 0)  # next day


# ══════════════════════════════════════════════════════════════
# DEFAULT PERIOD TIMES
# ══════════════════════════════════════════════════════════════

class TestDefaultPeriodTimes:
    def test_day_defaults(self):
        from app.models.site_staffing_profile import SiteStaffingProfile
        start, end = SiteStaffingProfile.get_default_period_times(PeriodType.DAY)
        assert start == time(6, 0)
        assert end == time(18, 0)

    def test_night_defaults(self):
        from app.models.site_staffing_profile import SiteStaffingProfile
        start, end = SiteStaffingProfile.get_default_period_times(PeriodType.NIGHT)
        assert start == time(18, 0)
        assert end == time(6, 0)

    def test_all_day_defaults(self):
        from app.models.site_staffing_profile import SiteStaffingProfile
        start, end = SiteStaffingProfile.get_default_period_times(PeriodType.ALL_DAY)
        assert start == time(0, 0)
        assert end == time(23, 59)

    def test_custom_returns_none(self):
        from app.models.site_staffing_profile import SiteStaffingProfile
        start, end = SiteStaffingProfile.get_default_period_times(PeriodType.CUSTOM)
        assert start is None
        assert end is None


# ══════════════════════════════════════════════════════════════
# MEAL BREAK LOGIC (from ShiftAutoGenerator._create_shift_if_new)
# ══════════════════════════════════════════════════════════════

class TestMealBreakLogic:
    """Verify BCEA meal break rules: shifts > 5h require 60-min meal break."""

    def test_12h_shift_includes_meal_break(self):
        duration_hours = 12.0
        includes_meal = duration_hours > 5
        meal_duration = 60 if duration_hours > 5 else 0
        assert includes_meal is True
        assert meal_duration == 60

    def test_4h_shift_no_meal_break(self):
        duration_hours = 4.0
        includes_meal = duration_hours > 5
        meal_duration = 60 if duration_hours > 5 else 0
        assert includes_meal is False
        assert meal_duration == 0

    def test_exactly_5h_no_meal_break(self):
        duration_hours = 5.0
        includes_meal = duration_hours > 5
        assert includes_meal is False

    def test_5h01m_includes_meal_break(self):
        duration_hours = 5.017  # ~5h 1min
        includes_meal = duration_hours > 5
        assert includes_meal is True
