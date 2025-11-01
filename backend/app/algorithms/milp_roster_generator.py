"""
MILP-based roster generation using Google OR-Tools CP-SAT solver.

This module implements a Mixed Integer Linear Programming approach for
multi-shift optimization across entire roster periods, handling complex
constraints and fairness goals.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from ortools.sat.python import cp_model
from app.config import settings


class MILPRosterGenerator:
    """MILP-based roster generation engine using CP-SAT solver."""

    def __init__(self, db_session):
        """
        Initialize MILP roster generator.

        Args:
            db_session: Database session for querying data
        """
        self.db = db_session
        self.max_hours_week = settings.MAX_HOURS_WEEK
        self.min_rest_hours = settings.MIN_REST_HOURS
        self.ot_multiplier = settings.OT_MULTIPLIER
        self.max_distance_km = settings.MAX_DISTANCE_KM
        self.fairness_weight = getattr(settings, 'FAIRNESS_WEIGHT', 0.2)
        self.time_limit_seconds = getattr(settings, 'MILP_TIME_LIMIT', 60)

    def generate_roster(
        self,
        start_date: datetime,
        end_date: datetime,
        site_ids: Optional[List[int]] = None
    ) -> Dict:
        """
        Generate optimized roster for given period using MILP.

        Args:
            start_date: Start of roster period
            end_date: End of roster period
            site_ids: Optional list of site IDs to include

        Returns:
            Dict with roster assignments and metadata
        """
        # Step 1: Get data
        shifts = self._get_unassigned_shifts(start_date, end_date, site_ids)
        employees = self._get_available_employees()

        print(f"[MILP DEBUG] Found {len(shifts)} unassigned shifts and {len(employees)} active employees")

        if not shifts or not employees:
            print(f"[MILP DEBUG] Returning early - no shifts or no employees")
            return {
                "assignments": [],
                "summary": self._empty_summary(),
                "unfilled_shifts": shifts if shifts else []
            }

        # Step 2: Build feasibility matrix
        feasibility_matrix = self._build_feasibility_matrix(shifts, employees)

        # Count feasible pairs
        feasible_count = sum(1 for v in feasibility_matrix.values() if v["feasible"])
        total_pairs = len(feasibility_matrix)
        print(f"[MILP DEBUG] Feasibility: {feasible_count}/{total_pairs} pairs are feasible ({feasible_count/total_pairs*100:.1f}%)")

        if feasible_count == 0:
            print("[MILP DEBUG] NO FEASIBLE PAIRS - Checking reasons:")
            reasons_count = {}
            for (emp_idx, shift_idx), data in feasibility_matrix.items():
                if not data["feasible"]:
                    for reason in data["reasons"]:
                        reasons_count[reason] = reasons_count.get(reason, 0) + 1
            for reason, count in sorted(reasons_count.items(), key=lambda x: -x[1]):
                print(f"[MILP DEBUG]   - {reason}: {count} violations")

        # Step 3: Create and solve MILP model
        model, assignment_vars, cost_vars = self._build_milp_model(
            shifts, employees, feasibility_matrix
        )

        # Step 4: Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.time_limit_seconds
        solver.parameters.log_search_progress = False
        status = solver.Solve(model)

        # Step 5: Extract solution
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            assignments = self._extract_assignments(
                solver, assignment_vars, shifts, employees, cost_vars
            )
            roster_summary = self._calculate_roster_summary(
                assignments, employees, shifts
            )
            return {
                "assignments": assignments,
                "summary": roster_summary,
                "unfilled_shifts": self._get_unfilled_shifts(assignments, shifts),
                "solver_status": self._get_status_name(status),
                "solve_time": solver.WallTime()
            }
        else:
            # No feasible solution found
            return {
                "assignments": [],
                "summary": self._empty_summary(),
                "unfilled_shifts": shifts,
                "solver_status": self._get_status_name(status),
                "solve_time": solver.WallTime(),
                "error": "No feasible solution found"
            }

    def _get_unassigned_shifts(
        self,
        start_date: datetime,
        end_date: datetime,
        site_ids: Optional[List[int]] = None
    ) -> List[Dict]:
        """Get all unassigned shifts in the period."""
        from app.models.shift import Shift

        query = self.db.query(Shift).filter(
            Shift.start_time >= start_date,
            Shift.start_time < end_date,
            Shift.assigned_employee_id == None
        )

        if site_ids:
            query = query.filter(Shift.site_id.in_(site_ids))

        shifts = query.all()

        return [
            {
                "shift_id": s.shift_id,
                "site_id": s.site_id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "required_skill": s.required_skill,
                "hours": (s.end_time - s.start_time).total_seconds() / 3600,
                "site": {
                    "site_id": s.site.site_id,
                    "gps_lat": s.site.gps_lat,
                    "gps_lng": s.site.gps_lng
                } if s.site else None
            }
            for s in shifts
        ]

    def _get_available_employees(self) -> List[Dict]:
        """Get all active employees."""
        from app.models.employee import Employee, EmployeeStatus

        employees = self.db.query(Employee).filter(
            Employee.status == EmployeeStatus.ACTIVE
        ).all()

        return [
            {
                "employee_id": e.employee_id,
                "first_name": e.first_name,
                "last_name": e.last_name,
                "role": e.role,
                "hourly_rate": e.hourly_rate,
                "max_hours_week": e.max_hours_week,
                "home_gps_lat": e.home_gps_lat,
                "home_gps_lng": e.home_gps_lng,
                "skills": [e.role.value],
                "certifications": [
                    {
                        "cert_type": cert.cert_type,
                        "expiry_date": cert.expiry_date,
                        "verified": cert.verified
                    }
                    for cert in e.certifications
                ]
            }
            for e in employees
        ]

    def _build_feasibility_matrix(
        self,
        shifts: List[Dict],
        employees: List[Dict]
    ) -> Dict[Tuple[int, int], Dict]:
        """
        Build feasibility matrix with constraint checks and costs.

        Returns:
            Dict mapping (employee_idx, shift_idx) -> {feasible: bool, cost: float}
        """
        from app.algorithms.constraints import (
            check_skill_match,
            check_certification_validity,
            calculate_haversine_distance
        )

        feasibility = {}

        for emp_idx, employee in enumerate(employees):
            for shift_idx, shift in enumerate(shifts):
                # Check all hard constraints
                feasible = True
                reasons = []

                # 1. Skill match
                if shift.get("required_skill"):
                    if not check_skill_match(employee["skills"], shift["required_skill"]):
                        feasible = False
                        reasons.append("skill_mismatch")

                # 2. Certification validity
                if not check_certification_validity(
                    employee["certifications"],
                    shift["start_time"]
                ):
                    feasible = False
                    reasons.append("invalid_certification")

                # 3. Distance constraint
                if employee.get("home_gps_lat") and shift.get("site"):
                    if shift["site"].get("gps_lat"):
                        distance = calculate_haversine_distance(
                            employee["home_gps_lat"],
                            employee["home_gps_lng"],
                            shift["site"]["gps_lat"],
                            shift["site"]["gps_lng"]
                        )
                        if distance > self.max_distance_km:
                            feasible = False
                            reasons.append("too_far")
                    else:
                        distance = 0.0
                else:
                    distance = 0.0

                # Calculate cost (even if not feasible, for analysis)
                shift_hours = shift["hours"]
                labor_cost = employee["hourly_rate"] * shift_hours
                distance_penalty = distance * 0.1  # R0.10 per km
                total_cost = int(labor_cost + distance_penalty)  # CP-SAT requires int

                feasibility[(emp_idx, shift_idx)] = {
                    "feasible": feasible,
                    "cost": total_cost,
                    "distance": distance,
                    "reasons": reasons if not feasible else []
                }

        return feasibility

    def _build_milp_model(
        self,
        shifts: List[Dict],
        employees: List[Dict],
        feasibility: Dict[Tuple[int, int], Dict]
    ) -> Tuple[cp_model.CpModel, Dict, Dict]:
        """
        Build CP-SAT model with all constraints.

        Returns:
            (model, assignment_vars, cost_vars)
        """
        model = cp_model.CpModel()

        n_employees = len(employees)
        n_shifts = len(shifts)

        # Decision variables: x[emp][shift] ∈ {0, 1}
        assignment_vars = {}
        for emp_idx in range(n_employees):
            for shift_idx in range(n_shifts):
                assignment_vars[(emp_idx, shift_idx)] = model.NewBoolVar(
                    f'assign_e{emp_idx}_s{shift_idx}'
                )

        # Auxiliary variables for costs
        cost_vars = {}
        for emp_idx in range(n_employees):
            for shift_idx in range(n_shifts):
                if feasibility[(emp_idx, shift_idx)]["feasible"]:
                    cost = feasibility[(emp_idx, shift_idx)]["cost"]
                    cost_vars[(emp_idx, shift_idx)] = cost

        # CONSTRAINT 1: Each shift assigned to at most 1 employee
        for shift_idx in range(n_shifts):
            model.Add(
                sum(assignment_vars[(emp_idx, shift_idx)]
                    for emp_idx in range(n_employees)
                    if feasibility[(emp_idx, shift_idx)]["feasible"]) <= 1
            )

        # CONSTRAINT 2: Only feasible assignments allowed
        for emp_idx in range(n_employees):
            for shift_idx in range(n_shifts):
                if not feasibility[(emp_idx, shift_idx)]["feasible"]:
                    model.Add(assignment_vars[(emp_idx, shift_idx)] == 0)

        # CONSTRAINT 3: Weekly hour limits per employee
        # Group shifts by week
        shifts_by_week = self._group_shifts_by_week(shifts)

        for emp_idx, employee in enumerate(employees):
            max_hours = employee.get("max_hours_week", self.max_hours_week)

            for week_start, week_shifts in shifts_by_week.items():
                week_shift_indices = [shifts.index(s) for s in week_shifts]

                total_hours = sum(
                    shifts[shift_idx]["hours"] * assignment_vars[(emp_idx, shift_idx)]
                    for shift_idx in week_shift_indices
                    if feasibility[(emp_idx, shift_idx)]["feasible"]
                )

                model.Add(total_hours <= max_hours * 100)  # Scale for integer arithmetic

        # CONSTRAINT 4: Rest period between consecutive shifts
        for emp_idx in range(n_employees):
            for i, shift1 in enumerate(shifts):
                for j, shift2 in enumerate(shifts):
                    if i != j:
                        # Check if shifts overlap or don't have enough rest
                        time_between = (shift2["start_time"] - shift1["end_time"]).total_seconds() / 3600

                        if 0 < time_between < self.min_rest_hours:
                            # Can't assign both shifts to same employee
                            model.Add(
                                assignment_vars[(emp_idx, i)] + assignment_vars[(emp_idx, j)] <= 1
                            )

        # OBJECTIVE: Minimize total cost + fairness penalty
        total_cost = sum(
            cost_vars.get((emp_idx, shift_idx), 0) * assignment_vars[(emp_idx, shift_idx)]
            for emp_idx in range(n_employees)
            for shift_idx in range(n_shifts)
            if (emp_idx, shift_idx) in cost_vars
        )

        # Fairness: Minimize variance in hours assigned
        # (Simplified: penalize max hours assigned to any single employee)
        max_assigned_hours = model.NewIntVar(0, self.max_hours_week * 100, 'max_hours')

        for emp_idx in range(n_employees):
            emp_total_hours = sum(
                int(shifts[shift_idx]["hours"] * 100) * assignment_vars[(emp_idx, shift_idx)]
                for shift_idx in range(n_shifts)
                if feasibility[(emp_idx, shift_idx)]["feasible"]
            )
            model.Add(emp_total_hours <= max_assigned_hours)

        fairness_penalty = int(self.fairness_weight * 1000) * max_assigned_hours

        model.Minimize(total_cost + fairness_penalty)

        return model, assignment_vars, cost_vars

    def _group_shifts_by_week(self, shifts: List[Dict]) -> Dict[datetime, List[Dict]]:
        """Group shifts by week (Monday start)."""
        weeks = {}

        for shift in shifts:
            shift_date = shift["start_time"]
            # Get Monday of the week
            week_start = shift_date - timedelta(days=shift_date.weekday())
            week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

            if week_start not in weeks:
                weeks[week_start] = []
            weeks[week_start].append(shift)

        return weeks

    def _extract_assignments(
        self,
        solver: cp_model.CpSolver,
        assignment_vars: Dict,
        shifts: List[Dict],
        employees: List[Dict],
        cost_vars: Dict
    ) -> List[Dict]:
        """Extract solution from solver."""
        assignments = []

        for (emp_idx, shift_idx), var in assignment_vars.items():
            if solver.Value(var) == 1:
                cost = cost_vars.get((emp_idx, shift_idx), 0)
                assignments.append({
                    "employee_id": employees[emp_idx]["employee_id"],
                    "shift_id": shifts[shift_idx]["shift_id"],
                    "cost": float(cost)
                })

        return assignments

    def _calculate_roster_summary(
        self,
        assignments: List[Dict],
        employees: List[Dict],
        shifts: List[Dict]
    ) -> Dict:
        """Calculate roster summary statistics."""
        total_cost = sum(a["cost"] for a in assignments)
        total_shifts = len(assignments)
        total_shifts_available = len(shifts)

        employee_hours = {}
        employees_utilized = set()

        # Calculate actual hours per employee from shifts
        for assignment in assignments:
            emp_id = assignment["employee_id"]
            shift_id = assignment["shift_id"]

            employees_utilized.add(emp_id)

            # Find the shift
            shift = next((s for s in shifts if s["shift_id"] == shift_id), None)
            if shift:
                hours = shift["hours"]
                employee_hours[emp_id] = employee_hours.get(emp_id, 0) + hours

        fill_rate = (total_shifts / total_shifts_available * 100) if total_shifts_available > 0 else 0

        # Calculate fairness metric (std deviation of hours)
        if employee_hours:
            import statistics
            hours_list = list(employee_hours.values())
            fairness_score = statistics.stdev(hours_list) if len(hours_list) > 1 else 0
        else:
            fairness_score = 0

        return {
            "total_cost": total_cost,
            "total_shifts_filled": total_shifts,
            "employee_hours": employee_hours,
            "average_cost_per_shift": total_cost / total_shifts if total_shifts > 0 else 0,
            "fill_rate": fill_rate,
            "employees_utilized": len(employees_utilized),
            "fairness_score": round(fairness_score, 2)  # Lower is more fair
        }

    def _empty_summary(self) -> Dict:
        """Return empty summary for no assignments."""
        return {
            "total_cost": 0,
            "total_shifts_filled": 0,
            "employee_hours": {},
            "average_cost_per_shift": 0,
            "fill_rate": 0,
            "employees_utilized": 0,
            "fairness_score": 0
        }

    def _get_unfilled_shifts(
        self,
        assignments: List[Dict],
        shifts: List[Dict]
    ) -> List:
        """Get list of shifts that couldn't be filled."""
        from app.models.shift import Shift

        assigned_shift_ids = {a["shift_id"] for a in assignments}
        unfilled_shift_ids = [s["shift_id"] for s in shifts if s["shift_id"] not in assigned_shift_ids]

        # Return actual Shift ORM objects for proper serialization
        return self.db.query(Shift).filter(Shift.shift_id.in_(unfilled_shift_ids)).all() if unfilled_shift_ids else []

    def _get_status_name(self, status: int) -> str:
        """Convert solver status to readable string."""
        status_names = {
            cp_model.OPTIMAL: "optimal",
            cp_model.FEASIBLE: "feasible",
            cp_model.INFEASIBLE: "infeasible",
            cp_model.MODEL_INVALID: "invalid",
            cp_model.UNKNOWN: "unknown"
        }
        return status_names.get(status, "unknown")
