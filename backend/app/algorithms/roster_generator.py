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
            optimal_assignments, employees
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
        # TODO: Implement database query
        return []

    def _get_available_employees(self) -> List[Dict]:
        """Get all active employees."""
        # TODO: Implement database query
        return []

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

        # Build cost matrix
        n_employees = len(employees)
        n_shifts = len(shifts)

        # Initialize with high cost (infeasible = infinity)
        cost_matrix = np.full((n_employees, n_shifts), np.inf)

        # Fill in feasible pairs with actual costs
        employee_id_to_idx = {e["employee_id"]: i for i, e in enumerate(employees)}
        shift_id_to_idx = {s["shift_id"]: i for i, s in enumerate(shifts)}

        for emp_id, shift_id in feasible_pairs:
            emp_idx = employee_id_to_idx[emp_id]
            shift_idx = shift_id_to_idx[shift_id]

            employee = employees[emp_idx]
            shift = shifts[shift_idx]

            cost = self._calculate_assignment_cost(employee, shift)
            cost_matrix[emp_idx, shift_idx] = cost

        # Run Hungarian algorithm
        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        # Build assignments
        assignments = []
        for emp_idx, shift_idx in zip(row_ind, col_ind):
            if cost_matrix[emp_idx, shift_idx] < np.inf:
                assignments.append({
                    "employee_id": employees[emp_idx]["employee_id"],
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
        distance_penalty = distance * 0.1  # $0.10 per km

        return base_cost + distance_penalty

    def _calculate_shift_hours(self, shift: Dict) -> float:
        """Calculate duration of shift in hours."""
        duration = shift["end_time"] - shift["start_time"]
        return duration.total_seconds() / 3600

    def _calculate_distance(self, employee: Dict, shift: Dict) -> float:
        """Calculate distance between employee home and shift site."""
        # TODO: Implement GPS distance calculation
        # Using Haversine formula or simple Euclidean approximation
        return 0.0

    def _check_skill_match(self, employee: Dict, shift: Dict) -> bool:
        """Check if employee has required skills for shift."""
        # TODO: Implement skill matching logic
        return True

    def _check_certification_valid(self, employee: Dict, shift: Dict) -> bool:
        """Check if employee certifications are valid for shift date."""
        # TODO: Implement certification validity check
        return True

    def _check_availability(self, employee: Dict, shift: Dict) -> bool:
        """Check if employee is available during shift time."""
        # TODO: Implement availability check
        return True

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
        # TODO: Implement rest period check
        return True

    def _check_distance(self, employee: Dict, shift: Dict) -> bool:
        """Check if distance from home to site is within limit."""
        distance = self._calculate_distance(employee, shift)
        return distance <= self.max_distance_km

    def _get_employee_hours_this_week(self, employee_id: int) -> float:
        """Get total hours worked by employee this week."""
        # TODO: Implement query for current week hours
        return 0.0

    def _calculate_roster_summary(
        self,
        assignments: List[Dict],
        employees: List[Dict]
    ) -> Dict:
        """
        Calculate roster summary statistics.

        Args:
            assignments: List of assignments
            employees: List of employees

        Returns:
            Summary dict with costs, hours, etc.
        """
        total_cost = sum(a["cost"] for a in assignments)
        total_shifts = len(assignments)

        employee_hours = {}
        for assignment in assignments:
            emp_id = assignment["employee_id"]
            # TODO: Calculate actual hours per employee
            employee_hours[emp_id] = employee_hours.get(emp_id, 0) + 8

        return {
            "total_cost": total_cost,
            "total_shifts_filled": total_shifts,
            "employee_hours": employee_hours,
            "average_cost_per_shift": total_cost / total_shifts if total_shifts > 0 else 0
        }

    def _get_unfilled_shifts(
        self,
        assignments: List[Dict],
        shifts: List[Dict]
    ) -> List[Dict]:
        """Get list of shifts that couldn't be filled."""
        assigned_shift_ids = {a["shift_id"] for a in assignments}
        return [s for s in shifts if s["shift_id"] not in assigned_shift_ids]
