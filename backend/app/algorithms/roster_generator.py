"""
Roster generation algorithm.

This module implements the deterministic algorithmic approach for auto-rostering
as specified in the RostraCore spec. It uses constraint logic and optimization
without AI.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import numpy as np
from scipy.optimize import linear_sum_assignment
from app.config import settings


class RosterGenerator:
    """Main roster generation engine."""

    def __init__(self, db_session):
        """
        Initialize roster generator.

        Args:
            db_session: Database session for querying data
        """
        self.db = db_session
        self.max_hours_week = settings.MAX_HOURS_WEEK
        self.min_rest_hours = settings.MIN_REST_HOURS
        self.ot_multiplier = settings.OT_MULTIPLIER
        self.max_distance_km = settings.MAX_DISTANCE_KM

    def generate_roster(
        self,
        start_date: datetime,
        end_date: datetime,
        site_ids: Optional[List[int]] = None
    ) -> Dict:
        """
        Generate optimized roster for given period.

        Args:
            start_date: Start of roster period
            end_date: End of roster period
            site_ids: Optional list of site IDs to include

        Returns:
            Dict with roster assignments and metadata
        """
        # Step 1: Get unassigned shifts for the period
        shifts = self._get_unassigned_shifts(start_date, end_date, site_ids)

        # Step 2: Get available employees
        employees = self._get_available_employees()

        # Step 3: Generate feasible assignments
        feasible_pairs = self._generate_feasible_pairs(shifts, employees)

        # Step 4: Optimize assignments
        optimal_assignments = self._optimize_assignments(
            shifts, employees, feasible_pairs
        )

        # Step 5: Calculate costs and validate
        roster_summary = self._calculate_roster_summary(
            optimal_assignments, employees, shifts
        )

        return {
            "assignments": optimal_assignments,
            "summary": roster_summary,
            "unfilled_shifts": self._get_unfilled_shifts(optimal_assignments, shifts)
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
                "skills": [e.role.value],  # Basic: role is the main skill
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

    def _generate_feasible_pairs(
        self,
        shifts: List[Dict],
        employees: List[Dict]
    ) -> List[Tuple[int, int]]:
        """
        Generate list of feasible (employee, shift) pairs.

        Checks:
        - Skill match
        - Certification validity
        - Availability window
        - Weekly hour limits
        - Minimum rest period
        - Distance constraints (optional)

        Args:
            shifts: List of shift dicts
            employees: List of employee dicts

        Returns:
            List of (employee_id, shift_id) tuples that are feasible
        """
        feasible_pairs = []

        for employee in employees:
            employee_id = employee["employee_id"]
            current_hours = self._get_employee_hours_this_week(employee_id)

            for shift in shifts:
                shift_id = shift["shift_id"]

                # Check all constraints
                if self._check_skill_match(employee, shift):
                    if self._check_certification_valid(employee, shift):
                        if self._check_availability(employee, shift):
                            if self._check_hour_limits(employee, shift, current_hours):
                                if self._check_rest_period(employee, shift):
                                    if self._check_distance(employee, shift):
                                        feasible_pairs.append((employee_id, shift_id))

        return feasible_pairs

    def _optimize_assignments(
        self,
        shifts: List[Dict],
        employees: List[Dict],
        feasible_pairs: List[Tuple[int, int]]
    ) -> List[Dict]:
        """
        Optimize shift assignments using Hungarian Algorithm.

        Minimizes total cost (hourly_rate × hours + distance penalties).

        Args:
            shifts: List of shifts
            employees: List of employees
            feasible_pairs: List of feasible (employee, shift) pairs

        Returns:
            List of optimal assignments
        """
        if not feasible_pairs:
            return []

        # Find employees who have at least one feasible shift
        # (Hungarian algorithm fails if any employee has all infinite costs)
        employees_with_feasible_shifts = set()
        for emp_id, shift_id in feasible_pairs:
            employees_with_feasible_shifts.add(emp_id)

        # Filter to only include employees with feasible options
        feasible_employees = [e for e in employees if e["employee_id"] in employees_with_feasible_shifts]

        if not feasible_employees:
            return []

        # Build cost matrix
        n_employees = len(feasible_employees)
        n_shifts = len(shifts)

        # Initialize with high cost (infeasible = infinity)
        cost_matrix = np.full((n_employees, n_shifts), np.inf)

        # Fill in feasible pairs with actual costs
        employee_id_to_idx = {e["employee_id"]: i for i, e in enumerate(feasible_employees)}
        shift_id_to_idx = {s["shift_id"]: i for i, s in enumerate(shifts)}

        for emp_id, shift_id in feasible_pairs:
            emp_idx = employee_id_to_idx[emp_id]
            shift_idx = shift_id_to_idx[shift_id]

            employee = feasible_employees[emp_idx]
            shift = shifts[shift_idx]

            cost = self._calculate_assignment_cost(employee, shift)
            cost_matrix[emp_idx, shift_idx] = cost

        # Check if cost matrix is all infinite (no feasible solutions)
        if np.all(np.isinf(cost_matrix)):
            # No feasible assignments at all
            return []

        # Run Hungarian algorithm
        try:
            row_ind, col_ind = linear_sum_assignment(cost_matrix)
        except ValueError as e:
            # Handle infeasible matrix
            if "cost matrix is infeasible" in str(e):
                return []
            raise

        # Build assignments
        assignments = []
        for emp_idx, shift_idx in zip(row_ind, col_ind):
            if cost_matrix[emp_idx, shift_idx] < np.inf:
                assignments.append({
                    "employee_id": feasible_employees[emp_idx]["employee_id"],
                    "shift_id": shifts[shift_idx]["shift_id"],
                    "cost": cost_matrix[emp_idx, shift_idx]
                })

        return assignments  

    def _calculate_assignment_cost(
        self,
        employee: Dict,
        shift: Dict
    ) -> float:
        """
        Calculate cost of assigning employee to shift.

        Cost = (hourly_rate × hours) + distance_penalty

        Args:
            employee: Employee dict
            shift: Shift dict

        Returns:
            Total cost
        """
        hours = self._calculate_shift_hours(shift)
        base_cost = employee["hourly_rate"] * hours

        # Add distance penalty (optional)
        distance = self._calculate_distance(employee, shift)
        distance_penalty = distance * 0.1  # R0.10 per km

        return base_cost + distance_penalty

    def _calculate_shift_hours(self, shift: Dict) -> float:
        """Calculate duration of shift in hours."""
        duration = shift["end_time"] - shift["start_time"]
        return duration.total_seconds() / 3600

    def _calculate_distance(self, employee: Dict, shift: Dict) -> float:
        """Calculate distance between employee home and shift site."""
        from app.algorithms.constraints import calculate_haversine_distance

        if not employee.get("home_gps_lat") or not shift.get("site"):
            return 0.0

        if not shift["site"].get("gps_lat"):
            return 0.0

        return calculate_haversine_distance(
            employee["home_gps_lat"],
            employee["home_gps_lng"],
            shift["site"]["gps_lat"],
            shift["site"]["gps_lng"]
        )

    def _check_skill_match(self, employee: Dict, shift: Dict) -> bool:
        """Check if employee has required skills for shift."""
        from app.algorithms.constraints import check_skill_match

        required_skill = shift.get("required_skill")
        if not required_skill:
            return True

        employee_skills = employee.get("skills", [])
        return check_skill_match(employee_skills, required_skill)

    def _check_certification_valid(self, employee: Dict, shift: Dict) -> bool:
        """Check if employee certifications are valid for shift date."""
        from app.algorithms.constraints import check_certification_validity

        certifications = employee.get("certifications", [])
        shift_date = shift["start_time"]

        return check_certification_validity(certifications, shift_date)

    def _check_availability(self, employee: Dict, shift: Dict) -> bool:
        """Check if employee is available during shift time."""
        from app.models.availability import Availability
        from app.algorithms.constraints import check_availability_overlap

        # Query availability records for employee
        availability_records = self.db.query(Availability).filter(
            Availability.employee_id == employee["employee_id"],
            Availability.date == shift["start_time"].date()
        ).all()

        if not availability_records:
            # No availability records = assume available
            return True

        availability_dicts = [
            {
                "date": a.date,
                "start_time": a.start_time,
                "end_time": a.end_time,
                "available": a.available
            }
            for a in availability_records
        ]

        return check_availability_overlap(
            availability_dicts,
            shift["start_time"],
            shift["end_time"]
        )

    def _check_hour_limits(
        self,
        employee: Dict,
        shift: Dict,
        current_hours: float
    ) -> bool:
        """Check if shift would exceed weekly hour limits."""
        shift_hours = self._calculate_shift_hours(shift)
        total_hours = current_hours + shift_hours
        return total_hours <= self.max_hours_week

    def _check_rest_period(self, employee: Dict, shift: Dict) -> bool:
        """Check if employee has minimum rest period before shift."""
        from app.models.shift import Shift
        from app.algorithms.constraints import check_rest_period

        # Find last shift before this one
        last_shift = self.db.query(Shift).filter(
            Shift.assigned_employee_id == employee["employee_id"],
            Shift.end_time < shift["start_time"]
        ).order_by(Shift.end_time.desc()).first()

        last_shift_end = last_shift.end_time if last_shift else None

        return check_rest_period(
            last_shift_end,
            shift["start_time"],
            self.min_rest_hours
        )

    def _check_distance(self, employee: Dict, shift: Dict) -> bool:
        """Check if distance from home to site is within limit."""
        distance = self._calculate_distance(employee, shift)
        return distance <= self.max_distance_km

    def _get_employee_hours_this_week(self, employee_id: int) -> float:
        """Get total hours worked by employee this week."""
        from app.models.shift import Shift
        from datetime import datetime, timedelta

        # Get start of current week (Monday)
        today = datetime.now()
        start_of_week = today - timedelta(days=today.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

        # Query shifts for this week
        shifts = self.db.query(Shift).filter(
            Shift.assigned_employee_id == employee_id,
            Shift.start_time >= start_of_week,
            Shift.start_time < start_of_week + timedelta(days=7)
        ).all()

        total_hours = 0.0
        for shift in shifts:
            duration = shift.end_time - shift.start_time
            total_hours += duration.total_seconds() / 3600

        return total_hours

    def _calculate_roster_summary(
        self,
        assignments: List[Dict],
        employees: List[Dict],
        shifts: List[Dict]
    ) -> Dict:
        """
        Calculate roster summary statistics.

        Args:
            assignments: List of assignments
            employees: List of employees
            shifts: List of all shifts

        Returns:
            Summary dict with costs, hours, etc.
        """
        total_cost = sum(a["cost"] for a in assignments)
        total_shifts = len(assignments)
        total_shifts_available = len(shifts)

        # Create shift lookup map for efficient access
        shift_map = {s["shift_id"]: s for s in shifts}

        employee_hours = {}
        employees_utilized = set()
        for assignment in assignments:
            emp_id = assignment["employee_id"]
            shift_id = assignment["shift_id"]
            employees_utilized.add(emp_id)

            # Calculate actual hours from shift start/end times
            shift = shift_map.get(shift_id)
            if shift:
                actual_hours = self._calculate_shift_hours(shift)
                employee_hours[emp_id] = employee_hours.get(emp_id, 0) + actual_hours
            else:
                # Fallback to 8 hours if shift not found (shouldn't happen)
                employee_hours[emp_id] = employee_hours.get(emp_id, 0) + 8

        fill_rate = (total_shifts / total_shifts_available * 100) if total_shifts_available > 0 else 0

        return {
            "total_cost": total_cost,
            "total_shifts_filled": total_shifts,
            "employee_hours": employee_hours,
            "average_cost_per_shift": total_cost / total_shifts if total_shifts > 0 else 0,
            "fill_rate": fill_rate,
            "employees_utilized": len(employees_utilized)
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
