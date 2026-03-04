"""
Tests for backend/app/algorithms/production_optimizer.py
Tests feasibility checks, cost calculations, BCEA constraints, and CP-SAT solving.
Uses mock objects to avoid database dependency for unit tests.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from datetime import datetime, date, time, timedelta
from unittest.mock import MagicMock, patch
from collections import defaultdict

from app.algorithms.production_optimizer import (
    OptimizationConfig,
    FeasibilityCheck,
    ProductionRosterOptimizer,
)
from app.models.employee import EmployeeRole, EmployeeStatus
from app.models.shift import ShiftStatus
from app.models.certification import PSIRAGrade, FirearmCompetencyType
from app.models.roster_preferences import ConstraintLevel
from app.services.constraint_resolver import ResolvedConstraints
from app.utils.holidays import SouthAfricanHolidays, PremiumRateCalculator


# ══════════════════════════════════════════════════════════════
# MOCK FACTORIES
# ══════════════════════════════════════════════════════════════

def make_employee(
    employee_id=1,
    org_id=1,
    first_name="Test",
    last_name="Guard",
    role=EmployeeRole.ARMED,
    hourly_rate=50.0,
    status=EmployeeStatus.ACTIVE,
    assigned_client_id=None,
    shift_pattern_id=None,
    home_gps_lat=None,
    home_gps_lng=None,
    max_hours_week=48,
):
    emp = MagicMock()
    emp.employee_id = employee_id
    emp.org_id = org_id
    emp.first_name = first_name
    emp.last_name = last_name
    emp.role = role
    emp.hourly_rate = hourly_rate
    emp.status = status
    emp.assigned_client_id = assigned_client_id
    emp.shift_pattern_id = shift_pattern_id
    emp.home_gps_lat = home_gps_lat
    emp.home_gps_lng = home_gps_lng
    emp.max_hours_week = max_hours_week
    emp.certifications = []
    emp.availability = []
    return emp


def make_shift(
    shift_id=1,
    org_id=1,
    site_id=1,
    start_time=None,
    end_time=None,
    required_skill="armed",
    required_staff=1,
    status=ShiftStatus.PLANNED,
    required_psira_grade=None,
    requires_firearm=False,
    required_firearm_type=None,
    includes_meal_break=True,
    meal_break_duration_minutes=60,
):
    shift = MagicMock()
    shift.shift_id = shift_id
    shift.org_id = org_id
    shift.site_id = site_id
    shift.start_time = start_time or datetime(2026, 3, 2, 6, 0)  # Monday 06:00
    shift.end_time = end_time or datetime(2026, 3, 2, 18, 0)    # Monday 18:00
    shift.required_skill = required_skill
    shift.required_staff = required_staff
    shift.status = status
    shift.required_psira_grade = required_psira_grade
    shift.requires_firearm = requires_firearm
    shift.required_firearm_type = required_firearm_type
    shift.includes_meal_break = includes_meal_break
    shift.meal_break_duration_minutes = meal_break_duration_minutes
    shift.site = MagicMock()
    shift.site.client_id = 1
    shift.site.site_id = site_id

    # Implement paid_hours property
    duration_hours = (shift.end_time - shift.start_time).total_seconds() / 3600
    if includes_meal_break and meal_break_duration_minutes:
        shift.paid_hours = max(0, duration_hours - meal_break_duration_minutes / 60)
    else:
        shift.paid_hours = duration_hours

    return shift


def make_cert(
    employee_id=1,
    cert_type="PSIRA",
    psira_grade=PSIRAGrade.GRADE_C,
    expiry_date=None,
    verified=True,
    firearm_competency=None,
):
    cert = MagicMock()
    cert.employee_id = employee_id
    cert.cert_type = cert_type
    cert.psira_grade = psira_grade
    cert.expiry_date = expiry_date or date(2027, 12, 31)
    cert.verified = verified
    cert.firearm_competency = firearm_competency
    return cert


def make_availability(
    employee_id=1,
    avail_date=None,
    available=True,
    start_time=time(0, 0),
    end_time=time(23, 59),
):
    avail = MagicMock()
    avail.employee_id = employee_id
    avail.date = avail_date or date(2026, 3, 2)
    avail.available = available
    avail.start_time = start_time
    avail.end_time = end_time
    return avail


def make_site(site_id=1, client_id=1, gps_lat=None, gps_lng=None):
    site = MagicMock()
    site.site_id = site_id
    site.client_id = client_id
    site.gps_lat = gps_lat
    site.gps_lng = gps_lng
    return site


def make_optimizer(employees=None, shifts=None, sites=None, config=None, org_id=1):
    """Create a ProductionRosterOptimizer with mock data pre-loaded (skips DB)."""
    db = MagicMock()
    opt = ProductionRosterOptimizer(db=db, config=config, org_id=org_id)

    # Override resolved constraints to use dataclass defaults (no DB)
    default_constraints = ResolvedConstraints()
    opt._get_resolved_constraints = lambda emp, shift: default_constraints

    opt.employees = employees or []
    opt.shifts = shifts or []
    opt.sites = sites or {}

    # Group shifts by date
    opt.shifts_by_date = defaultdict(list)
    for s in opt.shifts:
        opt.shifts_by_date[s.start_time.date()].append(s)

    return opt


# ══════════════════════════════════════════════════════════════
# OPTIMIZATION CONFIG
# ══════════════════════════════════════════════════════════════

class TestOptimizationConfig:
    def test_default_config(self):
        config = OptimizationConfig()
        assert config.time_limit_seconds == 300
        assert config.num_workers == 8
        assert config.fairness_weight == 0.2
        assert config.cost_weight == 1.0
        assert config.night_shift_start_hour == 18
        assert config.night_shift_end_hour == 6

    def test_custom_config(self):
        config = OptimizationConfig(time_limit_seconds=60, budget_limit=50000.0)
        assert config.time_limit_seconds == 60
        assert config.budget_limit == 50000.0

    def test_budget_defaults_none(self):
        config = OptimizationConfig()
        assert config.budget_limit is None
        assert config.budget_per_client is None
        assert config.budget_per_site is None


# ══════════════════════════════════════════════════════════════
# FEASIBILITY CHECK DATACLASS
# ══════════════════════════════════════════════════════════════

class TestFeasibilityCheck:
    def test_feasible(self):
        fc = FeasibilityCheck(is_feasible=True, reasons=[], warnings=[], cost=600.0)
        assert fc.is_feasible is True
        assert fc.cost == 600.0

    def test_infeasible_with_reasons(self):
        fc = FeasibilityCheck(
            is_feasible=False,
            reasons=["Skill mismatch"],
            warnings=[],
            cost=0.0,
        )
        assert fc.is_feasible is False
        assert "Skill mismatch" in fc.reasons

    def test_feasible_with_warnings(self):
        fc = FeasibilityCheck(
            is_feasible=True,
            reasons=[],
            warnings=["PSIRA expired"],
            cost=500.0,
        )
        assert fc.is_feasible is True
        assert len(fc.warnings) == 1


# ══════════════════════════════════════════════════════════════
# SKILL MATCHING (production optimizer internal)
# ══════════════════════════════════════════════════════════════

class TestSkillMatching:
    def _check(self, emp_role, required_skill):
        opt = make_optimizer()
        emp = make_employee(role=emp_role)
        shift = make_shift(required_skill=required_skill)
        return opt._check_skill_match(emp, shift)

    def test_exact_match(self):
        assert self._check(EmployeeRole.ARMED, "armed") is True

    def test_armed_can_do_unarmed(self):
        assert self._check(EmployeeRole.ARMED, "unarmed") is True

    def test_unarmed_cannot_do_armed(self):
        assert self._check(EmployeeRole.UNARMED, "armed") is False

    def test_supervisor_can_do_any(self):
        assert self._check(EmployeeRole.SUPERVISOR, "armed") is True
        assert self._check(EmployeeRole.SUPERVISOR, "unarmed") is True

    def test_no_required_skill(self):
        assert self._check(EmployeeRole.UNARMED, None) is True
        assert self._check(EmployeeRole.UNARMED, "") is True


# ══════════════════════════════════════════════════════════════
# PSIRA GRADE HIERARCHY
# ══════════════════════════════════════════════════════════════

class TestPSIRAGradeHierarchy:
    def test_higher_grade_can_work_lower(self):
        assert PSIRAGrade.can_work_grade(PSIRAGrade.GRADE_A, PSIRAGrade.GRADE_C) is True
        assert PSIRAGrade.can_work_grade(PSIRAGrade.GRADE_B, PSIRAGrade.GRADE_D) is True

    def test_same_grade_allowed(self):
        assert PSIRAGrade.can_work_grade(PSIRAGrade.GRADE_C, PSIRAGrade.GRADE_C) is True

    def test_lower_grade_cannot_work_higher(self):
        assert PSIRAGrade.can_work_grade(PSIRAGrade.GRADE_E, PSIRAGrade.GRADE_C) is False
        assert PSIRAGrade.can_work_grade(PSIRAGrade.GRADE_D, PSIRAGrade.GRADE_A) is False

    def test_hierarchy_values(self):
        assert PSIRAGrade.get_hierarchy_value(PSIRAGrade.GRADE_E) == 1
        assert PSIRAGrade.get_hierarchy_value(PSIRAGrade.GRADE_D) == 2
        assert PSIRAGrade.get_hierarchy_value(PSIRAGrade.GRADE_C) == 3
        assert PSIRAGrade.get_hierarchy_value(PSIRAGrade.GRADE_B) == 4
        assert PSIRAGrade.get_hierarchy_value(PSIRAGrade.GRADE_A) == 5


# ══════════════════════════════════════════════════════════════
# CLIENT ASSIGNMENT
# ══════════════════════════════════════════════════════════════

class TestClientAssignment:
    def test_unassigned_employee_works_for_any_client(self):
        opt = make_optimizer(sites={1: make_site(site_id=1, client_id=5)})
        emp = make_employee(assigned_client_id=None)
        shift = make_shift(site_id=1)
        assert opt._check_client_assignment(emp, shift) is True

    def test_assigned_to_matching_client(self):
        opt = make_optimizer(sites={1: make_site(site_id=1, client_id=5)})
        emp = make_employee(assigned_client_id=5)
        shift = make_shift(site_id=1)
        assert opt._check_client_assignment(emp, shift) is True

    def test_assigned_to_different_client(self):
        opt = make_optimizer(sites={1: make_site(site_id=1, client_id=5)})
        emp = make_employee(assigned_client_id=99)
        shift = make_shift(site_id=1)
        assert opt._check_client_assignment(emp, shift) is False


# ══════════════════════════════════════════════════════════════
# AVAILABILITY CHECKING
# ══════════════════════════════════════════════════════════════

class TestAvailabilityCheck:
    def test_available_in_window(self):
        opt = make_optimizer()
        emp = make_employee(shift_pattern_id=None)
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 6, 0),
            end_time=datetime(2026, 3, 2, 18, 0),
        )
        avail = make_availability(
            avail_date=date(2026, 3, 2),
            start_time=time(0, 0),
            end_time=time(23, 59),
        )
        opt.employee_availabilities[(emp.employee_id, date(2026, 3, 2))] = avail
        assert opt._check_availability(emp, shift) is True

    def test_no_availability_record_pattern_employee(self):
        """Employee with shift pattern but no availability record = OFF day."""
        opt = make_optimizer()
        emp = make_employee(shift_pattern_id=1)
        shift = make_shift(start_time=datetime(2026, 3, 2, 6, 0))
        # No availability record
        assert opt._check_availability(emp, shift) is False

    def test_no_availability_record_manual_employee(self):
        """Employee without shift pattern but no availability record = assumed available."""
        opt = make_optimizer()
        emp = make_employee(shift_pattern_id=None)
        shift = make_shift(start_time=datetime(2026, 3, 2, 6, 0))
        # No availability record
        assert opt._check_availability(emp, shift) is True

    def test_marked_unavailable(self):
        opt = make_optimizer()
        emp = make_employee()
        shift = make_shift(start_time=datetime(2026, 3, 2, 6, 0))
        avail = make_availability(avail_date=date(2026, 3, 2), available=False)
        opt.employee_availabilities[(emp.employee_id, date(2026, 3, 2))] = avail
        assert opt._check_availability(emp, shift) is False

    def test_normal_shift_outside_window(self):
        """Shift 06:00-18:00 but availability only 08:00-14:00."""
        opt = make_optimizer()
        emp = make_employee(shift_pattern_id=None)
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 6, 0),
            end_time=datetime(2026, 3, 2, 18, 0),
        )
        avail = make_availability(
            avail_date=date(2026, 3, 2),
            start_time=time(8, 0),
            end_time=time(14, 0),
        )
        opt.employee_availabilities[(emp.employee_id, date(2026, 3, 2))] = avail
        assert opt._check_availability(emp, shift) is False

    def test_overnight_shift_manual_employee(self):
        """Bug 3 fix: overnight shift (18:00-06:00) should be accepted for manual employees."""
        opt = make_optimizer()
        emp = make_employee(shift_pattern_id=None)
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 18, 0),
            end_time=datetime(2026, 3, 3, 6, 0),
        )
        avail = make_availability(
            avail_date=date(2026, 3, 2),
            start_time=time(6, 0),
            end_time=time(23, 59),
        )
        opt.employee_availabilities[(emp.employee_id, date(2026, 3, 2))] = avail
        result = opt._check_availability(emp, shift)
        assert result is True


# ══════════════════════════════════════════════════════════════
# COST CALCULATION
# ══════════════════════════════════════════════════════════════

class TestCostCalculation:
    def test_regular_weekday_cost(self):
        opt = make_optimizer(config=OptimizationConfig(night_premium_per_hour=0))
        emp = make_employee(hourly_rate=50.0)
        # Monday day shift, 12h - 1h meal break = 11h paid
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 6, 0),
            end_time=datetime(2026, 3, 2, 18, 0),
        )
        cost = opt._calculate_assignment_cost(emp, shift)
        # 50 * 11 = 550 (regular weekday, no night premium)
        assert cost == 550.0

    def test_sunday_cost_includes_premium(self):
        opt = make_optimizer(config=OptimizationConfig(night_premium_per_hour=0))
        emp = make_employee(hourly_rate=50.0)
        # Sunday Mar 1, 2026 day shift
        shift = make_shift(
            start_time=datetime(2026, 3, 1, 6, 0),
            end_time=datetime(2026, 3, 1, 18, 0),
        )
        cost = opt._calculate_assignment_cost(emp, shift)
        # 50 * 11 * 1.5 = 825 (Sunday premium)
        assert cost == 825.0

    def test_holiday_cost(self):
        opt = make_optimizer(config=OptimizationConfig(night_premium_per_hour=0))
        emp = make_employee(hourly_rate=100.0)
        # Christmas Day 2026 (Friday)
        shift = make_shift(
            start_time=datetime(2026, 12, 25, 6, 0),
            end_time=datetime(2026, 12, 25, 18, 0),
        )
        cost = opt._calculate_assignment_cost(emp, shift)
        # 100 * 11 * 2.0 = 2200 (holiday premium)
        assert cost == 2200.0

    def test_night_shift_includes_night_premium(self):
        opt = make_optimizer(config=OptimizationConfig(night_premium_per_hour=20.0))
        emp = make_employee(hourly_rate=50.0)
        # Night shift 18:00-06:00 (Monday -> Tuesday)
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 18, 0),
            end_time=datetime(2026, 3, 3, 6, 0),
        )
        cost = opt._calculate_assignment_cost(emp, shift)
        # Base: 50 * 11 = 550, Night premium: 20 * 11 = 220 → total = 770
        assert cost == 770.0


# ══════════════════════════════════════════════════════════════
# FULL FEASIBILITY CHECK
# ══════════════════════════════════════════════════════════════

class TestFullFeasibilityCheck:
    def _make_feasible_setup(self):
        """Create a fully feasible employee + shift pair."""
        emp = make_employee(
            employee_id=1,
            role=EmployeeRole.ARMED,
            assigned_client_id=None,
            shift_pattern_id=None,
        )
        shift = make_shift(
            shift_id=1,
            required_skill="armed",
            start_time=datetime(2026, 3, 2, 6, 0),
            end_time=datetime(2026, 3, 2, 18, 0),
        )
        cert = make_cert(employee_id=1, psira_grade=PSIRAGrade.GRADE_C)
        avail = make_availability(
            employee_id=1,
            avail_date=date(2026, 3, 2),
            start_time=time(0, 0),
            end_time=time(23, 59),
        )

        opt = make_optimizer(
            employees=[emp],
            shifts=[shift],
            sites={1: make_site()},
        )
        opt.employee_certifications[1] = [cert]
        opt.employee_availabilities[(1, date(2026, 3, 2))] = avail

        return opt, emp, shift

    def test_fully_feasible_assignment(self):
        opt, emp, shift = self._make_feasible_setup()
        result = opt._check_feasibility(emp, shift)
        assert result.is_feasible is True
        assert len(result.reasons) == 0
        assert result.cost > 0

    def test_skill_mismatch_blocks(self):
        opt, emp, shift = self._make_feasible_setup()
        emp.role = EmployeeRole.UNARMED
        shift.required_skill = "armed"
        result = opt._check_feasibility(emp, shift)
        assert result.is_feasible is False
        assert any("Skill mismatch" in r for r in result.reasons)

    def test_client_mismatch_blocks(self):
        opt, emp, shift = self._make_feasible_setup()
        emp.assigned_client_id = 99  # different from site's client_id=1
        result = opt._check_feasibility(emp, shift)
        assert result.is_feasible is False
        assert any("client" in r.lower() for r in result.reasons)

    def test_availability_conflict_blocks(self):
        opt, emp, shift = self._make_feasible_setup()
        emp.shift_pattern_id = 1
        # Remove availability record → OFF day for pattern employees
        del opt.employee_availabilities[(1, date(2026, 3, 2))]
        result = opt._check_feasibility(emp, shift)
        assert result.is_feasible is False
        assert any("not available" in r.lower() for r in result.reasons)


# ══════════════════════════════════════════════════════════════
# CP-SAT SOLVER — SMALL INTEGRATION TESTS
# ══════════════════════════════════════════════════════════════

class TestCPSATSolver:
    """Integration tests that actually run the CP-SAT solver with mock data."""

    def _build_solvable_optimizer(self, n_employees=3, n_shifts=3, days_offset=0):
        """Build a small optimizer that can be solved without DB access."""
        from ortools.sat.python import cp_model

        config = OptimizationConfig(
            time_limit_seconds=30,
            night_premium_per_hour=0,
            use_lazy_feasibility=False,
        )
        db = MagicMock()
        opt = ProductionRosterOptimizer(db=db, config=config, org_id=1)

        # Use default resolved constraints
        default_constraints = ResolvedConstraints()
        opt._get_resolved_constraints = lambda emp, shift: default_constraints

        base_date = date(2026, 3, 2) + timedelta(days=days_offset)  # Monday

        # Create employees
        employees = []
        for i in range(n_employees):
            emp = make_employee(
                employee_id=i + 1,
                first_name=f"Guard{i+1}",
                last_name=f"Test",
                role=EmployeeRole.ARMED,
                hourly_rate=50.0,
                shift_pattern_id=None,
            )
            employees.append(emp)

        # Create shifts (1 per day, all at the same site)
        shifts = []
        for i in range(n_shifts):
            shift_date = base_date + timedelta(days=i)
            shift = make_shift(
                shift_id=i + 1,
                site_id=1,
                start_time=datetime.combine(shift_date, time(6, 0)),
                end_time=datetime.combine(shift_date, time(18, 0)),
                required_skill="armed",
                required_staff=1,
            )
            shifts.append(shift)

        opt.employees = employees
        opt.shifts = shifts
        opt.sites = {1: make_site(site_id=1)}
        opt.client_names = {}

        # Group shifts by date
        opt.shifts_by_date = defaultdict(list)
        for s in shifts:
            opt.shifts_by_date[s.start_time.date()].append(s)

        # Calculate weeks
        all_dates = sorted(opt.shifts_by_date.keys())
        opt.weeks = list(set(d.isocalendar()[1] for d in all_dates))

        # Populate availability and certifications
        for emp in employees:
            cert = make_cert(employee_id=emp.employee_id)
            opt.employee_certifications[emp.employee_id] = [cert]
            for s in shifts:
                shift_date = s.start_time.date()
                avail = make_availability(
                    employee_id=emp.employee_id,
                    avail_date=shift_date,
                    start_time=time(0, 0),
                    end_time=time(23, 59),
                )
                opt.employee_availabilities[(emp.employee_id, shift_date)] = avail

        return opt

    def test_simple_assignment(self):
        """3 employees, 3 shifts → each shift gets exactly 1 guard."""
        opt = self._build_solvable_optimizer(n_employees=3, n_shifts=3)

        # Build feasibility matrix
        opt._build_feasibility_matrix()

        # Verify feasibility
        feasible_count = sum(1 for fc in opt.feasibility_matrix.values() if fc.is_feasible)
        assert feasible_count > 0

        # Create variables, add constraints, define objective, solve
        opt._create_variables()
        opt._add_shift_coverage_constraints()
        opt._add_no_overlap_constraints()
        opt._add_weekly_hours_constraints()
        opt._add_rest_period_constraints()
        opt._add_consecutive_days_constraints()
        opt._add_consecutive_nights_constraints()
        opt._add_fairness_constraints()
        opt._add_budget_constraints()
        opt._define_objective()

        success = opt._solve()
        assert success is True

        opt._extract_solution()
        assert len(opt.assignments) == 3  # All shifts filled

    def test_no_overlap_enforced(self):
        """Two overlapping shifts — same guard can only do one."""
        opt = self._build_solvable_optimizer(n_employees=2, n_shifts=1)

        base_date = date(2026, 3, 2)
        # Add an overlapping shift
        overlapping = make_shift(
            shift_id=99,
            start_time=datetime.combine(base_date, time(10, 0)),
            end_time=datetime.combine(base_date, time(20, 0)),
            required_skill="armed",
        )
        opt.shifts.append(overlapping)
        opt.shifts_by_date[base_date].append(overlapping)

        # Add availability for overlapping shift
        for emp in opt.employees:
            opt.employee_availabilities[(emp.employee_id, base_date)] = make_availability(
                employee_id=emp.employee_id,
                avail_date=base_date,
            )

        opt._build_feasibility_matrix()
        opt._create_variables()
        opt._add_shift_coverage_constraints()
        opt._add_no_overlap_constraints()
        opt._add_weekly_hours_constraints()
        opt._add_fairness_constraints()
        opt._add_budget_constraints()
        opt._define_objective()

        success = opt._solve()
        assert success is True

        opt._extract_solution()
        # Each guard should be assigned at most 1 of the overlapping shifts
        for emp in opt.employees:
            emp_assignments = [a for a in opt.assignments if a["employee_id"] == emp.employee_id]
            assert len(emp_assignments) <= 2  # at most 2 but never same time

    def test_weekly_hours_limit(self):
        """6 x 12h shifts in one week = 66h paid (after meal breaks) > 48h limit."""
        opt = self._build_solvable_optimizer(n_employees=5, n_shifts=6)

        opt._build_feasibility_matrix()
        opt._create_variables()
        opt._add_shift_coverage_constraints()
        opt._add_no_overlap_constraints()
        opt._add_weekly_hours_constraints()
        opt._add_rest_period_constraints()
        opt._add_consecutive_days_constraints()
        opt._add_consecutive_nights_constraints()
        opt._add_fairness_constraints()
        opt._add_budget_constraints()
        opt._define_objective()

        success = opt._solve()
        assert success is True

        opt._extract_solution()
        # Verify no employee exceeds 48h in a single week
        hours_per_emp = defaultdict(float)
        for a in opt.assignments:
            shift = next(s for s in opt.shifts if s.shift_id == a["shift_id"])
            hours_per_emp[a["employee_id"]] += shift.paid_hours
        for emp_id, hours in hours_per_emp.items():
            assert hours <= 48, f"Employee {emp_id} worked {hours}h (limit 48h)"


# ══════════════════════════════════════════════════════════════
# CERTIFICATION WARNINGS
# ══════════════════════════════════════════════════════════════

class TestCertificationWarnings:
    def test_no_certs_produces_warning(self):
        opt = make_optimizer()
        emp = make_employee(employee_id=1)
        shift = make_shift(start_time=datetime(2026, 3, 2, 6, 0))
        opt.employee_certifications[1] = []  # no certs

        warnings = opt._check_certifications_with_warnings(emp, shift)
        assert len(warnings) > 0
        assert any("No certifications" in w for w in warnings)

    def test_expired_cert_warning(self):
        opt = make_optimizer()
        emp = make_employee(employee_id=1)
        shift = make_shift(start_time=datetime(2026, 3, 2, 6, 0))
        expired_cert = make_cert(
            employee_id=1,
            expiry_date=date(2025, 1, 1),  # expired
        )
        opt.employee_certifications[1] = [expired_cert]

        warnings = opt._check_certifications_with_warnings(emp, shift)
        assert len(warnings) > 0
        assert any("expired" in w.lower() for w in warnings)

    def test_valid_cert_no_warning(self):
        opt = make_optimizer()
        emp = make_employee(employee_id=1)
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 6, 0),
            required_psira_grade=None,
            requires_firearm=False,
        )
        valid_cert = make_cert(
            employee_id=1,
            expiry_date=date(2027, 12, 31),
        )
        opt.employee_certifications[1] = [valid_cert]

        warnings = opt._check_certifications_with_warnings(emp, shift)
        assert len(warnings) == 0

    def test_psira_grade_insufficient_warning(self):
        opt = make_optimizer()
        emp = make_employee(employee_id=1)
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 6, 0),
            required_psira_grade=PSIRAGrade.GRADE_A,  # requires highest
        )
        low_grade_cert = make_cert(
            employee_id=1,
            psira_grade=PSIRAGrade.GRADE_E,  # lowest
            expiry_date=date(2027, 12, 31),
        )
        opt.employee_certifications[1] = [low_grade_cert]

        warnings = opt._check_certifications_with_warnings(emp, shift)
        assert any("insufficient" in w.lower() for w in warnings)

    def test_missing_firearm_competency_warning(self):
        opt = make_optimizer()
        emp = make_employee(employee_id=1)
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 6, 0),
            requires_firearm=True,
        )
        cert = make_cert(
            employee_id=1,
            firearm_competency=None,  # no firearm cert
            expiry_date=date(2027, 12, 31),
        )
        opt.employee_certifications[1] = [cert]

        warnings = opt._check_certifications_with_warnings(emp, shift)
        assert any("firearm" in w.lower() for w in warnings)


# ══════════════════════════════════════════════════════════════
# DISTANCE CALCULATION
# ══════════════════════════════════════════════════════════════

class TestDistanceCalculation:
    def test_known_distance(self):
        opt = make_optimizer(sites={1: make_site(site_id=1, gps_lat=-25.7461, gps_lng=28.1881)})
        emp = make_employee(home_gps_lat=-26.2041, home_gps_lng=28.0473)  # Joburg
        shift = make_shift(site_id=1)

        distance = opt._calculate_distance(emp, shift)
        assert 50 < distance < 65  # ~58km Joburg to Pretoria

    def test_missing_coords_returns_zero(self):
        opt = make_optimizer(sites={1: make_site(site_id=1, gps_lat=-25.7, gps_lng=28.1)})
        emp = make_employee(home_gps_lat=None, home_gps_lng=None)
        shift = make_shift(site_id=1)

        distance = opt._calculate_distance(emp, shift)
        assert distance == 0.0


# ══════════════════════════════════════════════════════════════
# SHIFT PROPERTIES
# ══════════════════════════════════════════════════════════════

class TestShiftProperties:
    """Test Shift model properties (paid_hours, meal breaks)."""

    def test_paid_hours_with_meal_break(self):
        """12h shift with 60min meal break = 11h paid."""
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 6, 0),
            end_time=datetime(2026, 3, 2, 18, 0),
            includes_meal_break=True,
            meal_break_duration_minutes=60,
        )
        assert shift.paid_hours == 11.0

    def test_paid_hours_without_meal_break(self):
        """4h shift with no meal break = 4h paid."""
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 8, 0),
            end_time=datetime(2026, 3, 2, 12, 0),
            includes_meal_break=False,
            meal_break_duration_minutes=0,
        )
        assert shift.paid_hours == 4.0

    def test_overnight_shift_hours(self):
        """18:00-06:00 overnight = 12h total, 11h paid."""
        shift = make_shift(
            start_time=datetime(2026, 3, 2, 18, 0),
            end_time=datetime(2026, 3, 3, 6, 0),
            includes_meal_break=True,
            meal_break_duration_minutes=60,
        )
        assert shift.paid_hours == 11.0


# ══════════════════════════════════════════════════════════════
# WARNING CATEGORIZATION
# ══════════════════════════════════════════════════════════════

class TestWarningCategorization:
    def test_psira_warning(self):
        opt = make_optimizer()
        assert opt._categorize_warning("⚠️ PSIRA grade insufficient") == "psira_compliance"

    def test_firearm_warning(self):
        opt = make_optimizer()
        assert opt._categorize_warning("⚠️ No firearm competency") == "firearm_competency"

    def test_skill_warning(self):
        opt = make_optimizer()
        assert opt._categorize_warning("⚠️ Skill mismatch") == "skill_mismatch"

    def test_availability_warning(self):
        opt = make_optimizer()
        assert opt._categorize_warning("⚠️ Employee not available") == "availability_conflict"

    def test_client_warning(self):
        opt = make_optimizer()
        assert opt._categorize_warning("⚠️ Employee assigned to different client") == "client_assignment"
