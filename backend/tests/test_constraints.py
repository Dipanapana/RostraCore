"""
Tests for backend/app/algorithms/constraints.py
Pure function tests — no database required.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, date, time, timedelta
from app.algorithms.constraints import (
    check_skill_match,
    check_certification_validity,
    check_availability_overlap,
    check_rest_period,
    check_weekly_hours,
    check_distance_constraint,
    calculate_haversine_distance,
    calculate_overtime_cost,
)


# ══════════════════════════════════════════════════════════════
# SKILL MATCHING
# ══════════════════════════════════════════════════════════════

class TestSkillMatch:
    def test_exact_match(self):
        assert check_skill_match(["armed"], "armed") is True

    def test_case_insensitive(self):
        assert check_skill_match(["Armed"], "armed") is True
        assert check_skill_match(["ARMED"], "armed") is True

    def test_multiple_skills(self):
        assert check_skill_match(["unarmed", "armed", "supervisor"], "armed") is True

    def test_no_required_skill(self):
        assert check_skill_match([], "") is True
        assert check_skill_match([], None) is True

    def test_mismatch(self):
        assert check_skill_match(["unarmed"], "armed") is False

    def test_empty_employee_skills(self):
        assert check_skill_match([], "armed") is False


# ══════════════════════════════════════════════════════════════
# CERTIFICATION VALIDITY
# ══════════════════════════════════════════════════════════════

class TestCertificationValidity:
    def _cert(self, cert_type="PSIRA", expiry_date=None, verified=True):
        return {
            "cert_type": cert_type,
            "expiry_date": expiry_date or (date.today() + timedelta(days=365)),
            "verified": verified,
        }

    def test_valid_cert(self):
        certs = [self._cert()]
        assert check_certification_validity(certs, datetime.now()) is True

    def test_expired_cert(self):
        certs = [self._cert(expiry_date=date(2020, 1, 1))]
        assert check_certification_validity(certs, datetime.now()) is False

    def test_unverified_cert_specific_type(self):
        certs = [self._cert(verified=False)]
        assert check_certification_validity(certs, datetime.now(), required_cert_type="PSIRA") is False

    def test_no_certs(self):
        assert check_certification_validity([], datetime.now()) is False

    def test_specific_cert_type_required(self):
        certs = [self._cert(cert_type="First Aid")]
        assert check_certification_validity(certs, datetime.now(), required_cert_type="PSIRA") is False

    def test_specific_cert_type_present(self):
        certs = [self._cert(cert_type="PSIRA")]
        assert check_certification_validity(certs, datetime.now(), required_cert_type="PSIRA") is True

    def test_skip_check(self):
        assert check_certification_validity([], datetime.now(), skip_check=True) is True

    def test_future_expiry_valid(self):
        certs = [self._cert(expiry_date=date.today() + timedelta(days=1))]
        assert check_certification_validity(certs, datetime.now()) is True

    def test_today_expiry_invalid(self):
        # expiry_date > shift_date required (not >=)
        certs = [self._cert(expiry_date=date.today())]
        assert check_certification_validity(certs, datetime.now()) is False


# ══════════════════════════════════════════════════════════════
# AVAILABILITY OVERLAP
# ══════════════════════════════════════════════════════════════

class TestAvailabilityOverlap:
    def _avail(self, available=True, start_time=time(6, 0), end_time=time(18, 0)):
        return {
            "date": date.today(),
            "available": available,
            "start_time": start_time,
            "end_time": end_time,
        }

    def test_fully_within_window(self):
        avails = [self._avail()]
        shift_start = datetime.combine(date.today(), time(8, 0))
        shift_end = datetime.combine(date.today(), time(16, 0))
        assert check_availability_overlap(avails, shift_start, shift_end) is True

    def test_shift_exceeds_window(self):
        avails = [self._avail(end_time=time(14, 0))]
        shift_start = datetime.combine(date.today(), time(8, 0))
        shift_end = datetime.combine(date.today(), time(16, 0))
        assert check_availability_overlap(avails, shift_start, shift_end) is False

    def test_no_availability(self):
        shift_start = datetime.combine(date.today(), time(8, 0))
        shift_end = datetime.combine(date.today(), time(16, 0))
        assert check_availability_overlap([], shift_start, shift_end) is False

    def test_marked_unavailable(self):
        avails = [self._avail(available=False)]
        shift_start = datetime.combine(date.today(), time(8, 0))
        shift_end = datetime.combine(date.today(), time(16, 0))
        assert check_availability_overlap(avails, shift_start, shift_end) is False


# ══════════════════════════════════════════════════════════════
# REST PERIOD
# ══════════════════════════════════════════════════════════════

class TestRestPeriod:
    def test_sufficient_rest(self):
        last_end = datetime(2026, 3, 1, 18, 0)
        next_start = datetime(2026, 3, 2, 6, 0)  # 12h gap
        assert check_rest_period(last_end, next_start, min_rest_hours=12) is True

    def test_insufficient_rest(self):
        last_end = datetime(2026, 3, 1, 22, 0)
        next_start = datetime(2026, 3, 2, 6, 0)  # 8h gap
        assert check_rest_period(last_end, next_start, min_rest_hours=12) is False

    def test_no_previous_shift(self):
        next_start = datetime(2026, 3, 2, 6, 0)
        assert check_rest_period(None, next_start) is True

    def test_exactly_minimum_rest(self):
        last_end = datetime(2026, 3, 1, 18, 0)
        next_start = datetime(2026, 3, 2, 6, 0)  # exactly 12h
        assert check_rest_period(last_end, next_start, min_rest_hours=12) is True

    def test_default_min_rest_is_8h(self):
        last_end = datetime(2026, 3, 1, 22, 0)
        next_start = datetime(2026, 3, 2, 6, 0)  # 8h
        assert check_rest_period(last_end, next_start) is True


# ══════════════════════════════════════════════════════════════
# WEEKLY HOURS
# ══════════════════════════════════════════════════════════════

class TestWeeklyHours:
    def test_within_limit(self):
        assert check_weekly_hours(30, 12, max_hours_week=48) is True

    def test_at_limit(self):
        assert check_weekly_hours(36, 12, max_hours_week=48) is True

    def test_exceeds_limit(self):
        assert check_weekly_hours(40, 12, max_hours_week=48) is False

    def test_default_48h_limit(self):
        assert check_weekly_hours(40, 8) is True   # 48 = 48
        assert check_weekly_hours(40, 9) is False   # 49 > 48


# ══════════════════════════════════════════════════════════════
# DISTANCE
# ══════════════════════════════════════════════════════════════

class TestDistanceConstraint:
    def test_within_range(self):
        emp = {"lat": -25.7461, "lng": 28.1881}  # Pretoria
        site = {"lat": -25.7800, "lng": 28.2500}  # Nearby
        assert check_distance_constraint(emp, site, max_distance_km=50.0) is True

    def test_exceeds_range(self):
        emp = {"lat": -25.7461, "lng": 28.1881}  # Pretoria
        site = {"lat": -33.9249, "lng": 18.4241}  # Cape Town ~1250km
        assert check_distance_constraint(emp, site, max_distance_km=50.0) is False

    def test_missing_employee_coords(self):
        emp = {"lat": None, "lng": None}
        site = {"lat": -25.7, "lng": 28.1}
        assert check_distance_constraint(emp, site) is True

    def test_missing_site_coords(self):
        emp = {"lat": -25.7, "lng": 28.1}
        site = {"lat": None, "lng": None}
        assert check_distance_constraint(emp, site) is True


class TestHaversineDistance:
    def test_joburg_to_pretoria(self):
        # ~58 km
        dist = calculate_haversine_distance(-26.2041, 28.0473, -25.7461, 28.1881)
        assert 50 < dist < 65

    def test_same_point(self):
        dist = calculate_haversine_distance(-26.0, 28.0, -26.0, 28.0)
        assert dist < 0.01


# ══════════════════════════════════════════════════════════════
# OVERTIME COST — BCEA 45h threshold (after Bug 1 fix)
# ══════════════════════════════════════════════════════════════

class TestOvertimeCost:
    def test_no_overtime(self):
        result = calculate_overtime_cost(40, 50.0)
        assert result["regular_hours"] == 40
        assert result["overtime_hours"] == 0
        assert result["total_cost"] == 2000.0

    def test_with_overtime(self):
        result = calculate_overtime_cost(50, 50.0)
        assert result["regular_hours"] == 45  # BCEA threshold
        assert result["overtime_hours"] == 5
        assert result["regular_cost"] == 2250.0  # 45 * 50
        assert result["overtime_cost"] == 375.0   # 5 * 50 * 1.5
        assert result["total_cost"] == 2625.0

    def test_bcea_threshold_is_45h(self):
        """After bug fix, overtime starts at hour 46, not 41."""
        result = calculate_overtime_cost(45, 100.0)
        assert result["overtime_hours"] == 0
        assert result["regular_hours"] == 45

        result = calculate_overtime_cost(46, 100.0)
        assert result["overtime_hours"] == 1
        assert result["regular_hours"] == 45

    def test_custom_threshold(self):
        result = calculate_overtime_cost(50, 50.0, max_regular_hours=48)
        assert result["regular_hours"] == 48
        assert result["overtime_hours"] == 2

    def test_multiplier(self):
        result = calculate_overtime_cost(50, 100.0, ot_multiplier=2.0)
        assert result["overtime_cost"] == 5 * 100.0 * 2.0
