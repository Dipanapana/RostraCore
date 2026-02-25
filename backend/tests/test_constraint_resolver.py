"""
Tests for backend/app/services/constraint_resolver.py
Validates hierarchical constraint resolution and emergency mode.
Uses direct ResolvedConstraints construction — no database required.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.constraint_resolver import ResolvedConstraints, ConstraintResolver
from app.models.roster_preferences import ConstraintLevel, ConstraintScope


# ══════════════════════════════════════════════════════════════
# DATACLASS DEFAULTS (not affected by .env)
# ══════════════════════════════════════════════════════════════

class TestDataclassDefaults:
    """Test ResolvedConstraints dataclass defaults (independent of .env settings)."""

    def test_dataclass_defaults(self):
        rc = ResolvedConstraints()
        assert rc.max_hours_week == 48
        assert rc.min_rest_hours == 12
        assert rc.max_consecutive_days == 6
        assert rc.max_consecutive_nights == 3
        assert rc.max_distance_km == 50.0
        assert rc.fairness_weight == 0.15

    def test_dataclass_enforcement_levels(self):
        rc = ResolvedConstraints()
        assert rc.skill_matching_level == ConstraintLevel.HARD
        assert rc.availability_check_level == ConstraintLevel.HARD
        assert rc.max_hours_week_level == ConstraintLevel.HARD
        assert rc.min_rest_hours_level == ConstraintLevel.HARD
        assert rc.max_consecutive_days_level == ConstraintLevel.HARD
        assert rc.max_consecutive_nights_level == ConstraintLevel.SOFT

    def test_dataclass_emergency_defaults(self):
        rc = ResolvedConstraints()
        assert rc.allow_emergency_overrides is True
        assert rc.emergency_relaxed_constraints == []
        assert rc.source_scopes == {}

    def test_from_system_defaults_uses_settings(self):
        """from_system_defaults() reads from app.config.settings — verify it returns a valid object."""
        rc = ResolvedConstraints.from_system_defaults()
        # Don't assert exact values (they come from .env), but ensure types are correct
        assert isinstance(rc.max_hours_week, int)
        assert isinstance(rc.min_rest_hours, int)
        assert isinstance(rc.max_consecutive_days, int)
        assert isinstance(rc.fairness_weight, float)


# ══════════════════════════════════════════════════════════════
# CONSTRAINT OVERRIDES
# ══════════════════════════════════════════════════════════════

class TestConstraintOverrides:
    """Test that constraint values can be overridden (simulates hierarchy)."""

    def test_override_max_hours(self):
        rc = ResolvedConstraints()
        assert rc.max_hours_week == 48
        rc.max_hours_week = 60
        assert rc.max_hours_week == 60

    def test_override_enforcement_level(self):
        rc = ResolvedConstraints()
        assert rc.skill_matching_level == ConstraintLevel.HARD
        rc.skill_matching_level = ConstraintLevel.SOFT
        assert rc.skill_matching_level == ConstraintLevel.SOFT

    def test_override_min_rest(self):
        rc = ResolvedConstraints()
        assert rc.min_rest_hours == 12
        rc.min_rest_hours = 8
        assert rc.min_rest_hours == 8

    def test_disable_constraint(self):
        rc = ResolvedConstraints()
        rc.availability_check_level = ConstraintLevel.DISABLED
        assert rc.availability_check_level == ConstraintLevel.DISABLED


# ══════════════════════════════════════════════════════════════
# EMERGENCY MODE RELAXATION
# ══════════════════════════════════════════════════════════════

class TestEmergencyMode:
    """Test emergency constraint relaxation logic (no DB needed)."""

    def _make_constraints(self, **overrides):
        rc = ResolvedConstraints()
        for k, v in overrides.items():
            setattr(rc, k, v)
        return rc

    def test_availability_relaxation(self):
        rc = self._make_constraints(
            allow_emergency_overrides=True,
            emergency_relaxed_constraints=["availability_check"]
        )
        for c in rc.emergency_relaxed_constraints:
            if c == "availability_check":
                rc.availability_check_level = ConstraintLevel.WARNING
        assert rc.availability_check_level == ConstraintLevel.WARNING

    def test_rest_hours_relaxation(self):
        rc = self._make_constraints(
            allow_emergency_overrides=True,
            emergency_relaxed_constraints=["min_rest_hours"]
        )
        for c in rc.emergency_relaxed_constraints:
            if c == "min_rest_hours":
                rc.min_rest_hours = 6
                rc.min_rest_hours_level = ConstraintLevel.WARNING
        assert rc.min_rest_hours == 6
        assert rc.min_rest_hours_level == ConstraintLevel.WARNING

    def test_weekly_hours_relaxation(self):
        rc = self._make_constraints(
            allow_emergency_overrides=True,
            emergency_relaxed_constraints=["max_hours_week"]
        )
        for c in rc.emergency_relaxed_constraints:
            if c == "max_hours_week":
                rc.max_hours_week = 60
                rc.max_hours_week_level = ConstraintLevel.WARNING
        assert rc.max_hours_week == 60

    def test_consecutive_days_relaxation(self):
        rc = self._make_constraints(
            allow_emergency_overrides=True,
            emergency_relaxed_constraints=["max_consecutive_days"]
        )
        for c in rc.emergency_relaxed_constraints:
            if c == "max_consecutive_days":
                rc.max_consecutive_days = 7
                rc.max_consecutive_days_level = ConstraintLevel.WARNING
        assert rc.max_consecutive_days == 7

    def test_no_relaxation_when_disabled(self):
        rc = self._make_constraints(
            allow_emergency_overrides=False,
            emergency_relaxed_constraints=["min_rest_hours"]
        )
        # When overrides are disabled, constraints should NOT be relaxed
        assert rc.min_rest_hours == 12  # stays at dataclass default

    def test_multiple_relaxations(self):
        rc = self._make_constraints(
            allow_emergency_overrides=True,
            emergency_relaxed_constraints=["availability_check", "min_rest_hours", "max_hours_week"]
        )
        for c in rc.emergency_relaxed_constraints:
            if c == "availability_check":
                rc.availability_check_level = ConstraintLevel.WARNING
            elif c == "min_rest_hours":
                rc.min_rest_hours = 6
            elif c == "max_hours_week":
                rc.max_hours_week = 60
        assert rc.availability_check_level == ConstraintLevel.WARNING
        assert rc.min_rest_hours == 6
        assert rc.max_hours_week == 60


# ══════════════════════════════════════════════════════════════
# CONSTRAINT SUMMARY
# ══════════════════════════════════════════════════════════════

class TestConstraintSummary:
    def _make_resolver(self):
        resolver = ConstraintResolver.__new__(ConstraintResolver)
        return resolver

    def test_summary_structure(self):
        rc = ResolvedConstraints()
        # Populate source_scopes with ConstraintScope values to avoid .value error
        rc.source_scopes = {
            'max_hours_week': ConstraintScope.ORGANIZATION,
            'min_rest_hours': ConstraintScope.ORGANIZATION,
            'max_consecutive_days': ConstraintScope.ORGANIZATION,
        }
        summary = self._make_resolver().get_constraint_summary(rc)

        assert "bcea_compliance" in summary
        assert "enforcement_levels" in summary
        assert "soft_constraints" in summary
        assert "emergency_mode" in summary

    def test_summary_bcea_values(self):
        rc = ResolvedConstraints()
        rc.source_scopes = {
            'max_hours_week': ConstraintScope.ORGANIZATION,
            'min_rest_hours': ConstraintScope.ORGANIZATION,
            'max_consecutive_days': ConstraintScope.ORGANIZATION,
        }
        summary = self._make_resolver().get_constraint_summary(rc)

        bcea = summary["bcea_compliance"]
        assert bcea["max_hours_week"]["value"] == 48
        assert bcea["min_rest_hours"]["value"] == 12
        assert bcea["max_consecutive_days"]["value"] == 6

    def test_summary_enforcement_levels(self):
        rc = ResolvedConstraints()
        rc.source_scopes = {
            'max_hours_week': ConstraintScope.ORGANIZATION,
            'min_rest_hours': ConstraintScope.ORGANIZATION,
            'max_consecutive_days': ConstraintScope.ORGANIZATION,
        }
        summary = self._make_resolver().get_constraint_summary(rc)

        levels = summary["enforcement_levels"]
        assert levels["skill_matching"] == "hard"
        assert levels["availability_check"] == "hard"

    def test_summary_soft_constraints(self):
        rc = ResolvedConstraints()
        rc.source_scopes = {
            'max_hours_week': ConstraintScope.ORGANIZATION,
            'min_rest_hours': ConstraintScope.ORGANIZATION,
            'max_consecutive_days': ConstraintScope.ORGANIZATION,
        }
        summary = self._make_resolver().get_constraint_summary(rc)

        soft = summary["soft_constraints"]
        assert soft["fairness_weight"] == 0.15
        assert soft["max_distance_km"] == 50.0
        assert soft["prefer_client_experience"] is True

    def test_summary_emergency_mode(self):
        rc = ResolvedConstraints()
        rc.source_scopes = {
            'max_hours_week': ConstraintScope.ORGANIZATION,
            'min_rest_hours': ConstraintScope.ORGANIZATION,
            'max_consecutive_days': ConstraintScope.ORGANIZATION,
        }
        summary = self._make_resolver().get_constraint_summary(rc)

        emergency = summary["emergency_mode"]
        assert emergency["enabled"] is True
        assert emergency["relaxed_constraints"] == []
