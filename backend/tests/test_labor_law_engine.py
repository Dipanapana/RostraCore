"""
Test suite for LaborLawEngine - Generic labor law validation engine.

Tests labor law compliance for multiple countries using config-driven approach.
Expected to FAIL initially (RED phase) - implementation comes after.
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from app.services.country_service import CountryService
from app.services.labor_law_engine import LaborLawEngine


class TestSouthAfricaLaborLaw:
    """Test SA BCEA (Basic Conditions of Employment Act) compliance."""

    @pytest.fixture
    def za_config(self):
        return CountryService.load_config("ZA")

    @pytest.fixture
    def za_engine(self, za_config):
        return LaborLawEngine(za_config)

    def test_max_weekly_hours_shift_worker(self, za_engine):
        """Shift workers: 48h max weekly."""
        max_hours = za_engine.get_max_weekly_hours("shift_based")
        assert max_hours == 48

    def test_max_weekly_hours_office_worker(self, za_engine):
        """Office workers: 45h max weekly."""
        max_hours = za_engine.get_max_weekly_hours("office")
        assert max_hours == 45

    def test_weekly_hours_violation(self, za_engine):
        """50h week for shift worker should trigger BLOCK violation."""
        result = za_engine.validate_weekly_hours(
            hours_worked=50,
            work_pattern="shift_based"
        )
        assert not result["compliant"]
        assert len(result["violations"]) > 0
        assert result["violations"][0]["severity"] == "block"

    def test_min_rest_between_shifts(self, za_engine):
        """Minimum 12h rest between shifts required."""
        result = za_engine.validate_rest_period(
            hours_since_last_shift=11
        )
        assert not result["compliant"]
        assert len(result["violations"]) > 0
        assert result["violations"][0]["severity"] == "block"

    def test_adequate_rest_passes(self, za_engine):
        """12+ hours rest should pass."""
        result = za_engine.validate_rest_period(
            hours_since_last_shift=12
        )
        assert result["compliant"]
        assert len(result["violations"]) == 0

    def test_max_consecutive_days(self, za_engine):
        """7 consecutive days should trigger WARNING."""
        result = za_engine.validate_consecutive_days(
            consecutive_days=7
        )
        assert not result["compliant"]
        assert len(result["warnings"]) > 0
        assert result["warnings"][0]["severity"] == "warn"

    def test_meal_break_required(self, za_engine):
        """6h shift without meal break should trigger WARNING."""
        result = za_engine.validate_meal_break(
            shift_duration_hours=6,
            meal_break_provided=False
        )
        assert not result["compliant"]
        assert len(result["warnings"]) > 0

    def test_overtime_classification(self, za_engine):
        """49h in week for shift worker should be overtime."""
        is_ot = za_engine.is_overtime(
            hours_worked_this_week=49,
            work_pattern="shift_based"
        )
        assert is_ot is True

    def test_overtime_multiplier(self, za_engine):
        """SA overtime multiplier should be 1.5x."""
        multiplier = za_engine.get_overtime_multiplier()
        assert multiplier == Decimal("1.5")

    def test_public_holiday_multiplier(self, za_engine):
        """SA public holiday multiplier should be 2.0x."""
        multiplier = za_engine.get_public_holiday_multiplier()
        assert multiplier == Decimal("2.0")


class TestUSLaborLaw:
    """Test US FLSA (Fair Labor Standards Act) compliance."""

    @pytest.fixture
    def us_config(self):
        return CountryService.load_config("US")

    @pytest.fixture
    def us_engine(self, us_config):
        return LaborLawEngine(us_config)

    def test_max_weekly_hours(self, us_engine):
        """US has 40h standard workweek."""
        max_hours = us_engine.get_max_weekly_hours()
        assert max_hours == 40

    def test_overtime_after_40h(self, us_engine):
        """41h should be overtime (but INFO severity, not BLOCK)."""
        result = us_engine.validate_weekly_hours(
            hours_worked=41,
            work_pattern="office"
        )
        # US doesn't block overtime, just flags it as info
        assert len(result["info"]) > 0

    def test_no_meal_break_requirement(self, us_engine):
        """US federal law has no meal break requirement."""
        result = us_engine.validate_meal_break(
            shift_duration_hours=8,
            meal_break_provided=False
        )
        # Should pass (no federal requirement)
        assert result["compliant"]

    def test_overtime_multiplier(self, us_engine):
        """FLSA overtime multiplier is 1.5x."""
        multiplier = us_engine.get_overtime_multiplier()
        assert multiplier == Decimal("1.5")


class TestUKLaborLaw:
    """Test UK Working Time Directive compliance."""

    @pytest.fixture
    def gb_config(self):
        return CountryService.load_config("GB")

    @pytest.fixture
    def gb_engine(self, gb_config):
        return LaborLawEngine(gb_config)

    def test_max_weekly_hours(self, gb_engine):
        """UK Working Time Directive: 48h max (with opt-out)."""
        max_hours = gb_engine.get_max_weekly_hours()
        assert max_hours == 48

    def test_min_rest_between_shifts(self, gb_engine):
        """UK requires 11h rest between shifts."""
        result = gb_engine.validate_rest_period(
            hours_since_last_shift=10
        )
        assert not result["compliant"]
        assert len(result["violations"]) > 0

    def test_meal_break_after_6h(self, gb_engine):
        """UK requires 20min break after 6h work."""
        result = gb_engine.validate_meal_break(
            shift_duration_hours=7,
            meal_break_provided=False
        )
        assert not result["compliant"]

    def test_annual_leave_entitlement(self, gb_engine):
        """UK workers entitled to 28 days annual leave."""
        leave_days = gb_engine.get_annual_leave_days()
        assert leave_days == 28


class TestSeverityLevels:
    """Test that severity levels from config are respected."""

    def test_za_severity_levels(self):
        """ZA config has block/warn/info severities correctly mapped."""
        engine = LaborLawEngine(CountryService.load_config("ZA"))

        # max_weekly should be "block"
        result = engine.validate_weekly_hours(50, "shift_based")
        assert any(v["severity"] == "block" for v in result.get("violations", []))

        # max_consecutive should be "warn"
        result = engine.validate_consecutive_days(7)
        assert any(w["severity"] == "warn" for w in result.get("warnings", []))

    def test_us_severity_levels(self):
        """US overtime is info, not block."""
        engine = LaborLawEngine(CountryService.load_config("US"))

        result = engine.validate_weekly_hours(41, "office")
        # Should be info, not violation
        assert len(result.get("info", [])) > 0
        assert len(result.get("violations", [])) == 0


class TestConfigDrivenBehavior:
    """Test that engines are truly config-driven with no hardcoded logic."""

    def test_different_countries_different_rules(self):
        """Verify each country uses its own config values."""
        za_engine = LaborLawEngine(CountryService.load_config("ZA"))
        us_engine = LaborLawEngine(CountryService.load_config("US"))
        gb_engine = LaborLawEngine(CountryService.load_config("GB"))

        # Different max weekly hours
        assert za_engine.get_max_weekly_hours("shift_based") == 48  # ZA shift
        assert za_engine.get_max_weekly_hours("office") == 45  # ZA office
        assert us_engine.get_max_weekly_hours() == 40  # US
        assert gb_engine.get_max_weekly_hours() == 48  # UK

    def test_public_holiday_multipliers_differ(self):
        """Different countries have different public holiday rates."""
        za_engine = LaborLawEngine(CountryService.load_config("ZA"))
        us_engine = LaborLawEngine(CountryService.load_config("US"))

        # ZA: 2.0x for public holidays
        assert za_engine.get_public_holiday_multiplier() == Decimal("2.0")

        # US: 1.0x (no federal requirement for premium pay)
        assert us_engine.get_public_holiday_multiplier() == Decimal("1.0")
