"""
Optimization utilities for roster generation.

Provides alternative optimization approaches including
Hungarian algorithm, greedy heuristics, and ILP solvers.
"""

import numpy as np
from scipy.optimize import linear_sum_assignment
from typing import List, Dict, Tuple, Optional


class RosterOptimizer:
    """Optimizer for shift assignments."""

    @staticmethod
    def hungarian_assignment(
        cost_matrix: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Solve assignment problem using Hungarian algorithm.

        Args:
            cost_matrix: Cost matrix (employees x shifts)

        Returns:
            Tuple of (row_indices, col_indices) for optimal assignment
        """
        return linear_sum_assignment(cost_matrix)

    @staticmethod
    def greedy_assignment(
        shifts: List[Dict],
        employees: List[Dict],
        feasible_pairs: List[Tuple[int, int]],
        cost_func
    ) -> List[Dict]:
        """
        Greedy heuristic assignment.

        Assigns shifts in order of lowest cost until all shifts filled
        or no more feasible assignments.

        Args:
            shifts: List of shifts
            employees: List of employees
            feasible_pairs: List of feasible (employee_id, shift_id) pairs
            cost_func: Function to calculate assignment cost

        Returns:
            List of assignments
        """
        # Calculate costs for all feasible pairs
        pair_costs = []
        for emp_id, shift_id in feasible_pairs:
            employee = next(e for e in employees if e["employee_id"] == emp_id)
            shift = next(s for s in shifts if s["shift_id"] == shift_id)
            cost = cost_func(employee, shift)
            pair_costs.append((emp_id, shift_id, cost))

        # Sort by cost
        pair_costs.sort(key=lambda x: x[2])

        # Greedy assignment
        assignments = []
        assigned_employees = set()
        assigned_shifts = set()

        for emp_id, shift_id, cost in pair_costs:
            if emp_id not in assigned_employees and shift_id not in assigned_shifts:
                assignments.append({
                    "employee_id": emp_id,
                    "shift_id": shift_id,
                    "cost": cost
                })
                assigned_employees.add(emp_id)
                assigned_shifts.add(shift_id)

        return assignments

    @staticmethod
    def ilp_assignment(
        shifts: List[Dict],
        employees: List[Dict],
        feasible_pairs: List[Tuple[int, int]],
        cost_func,
        budget_limit: Optional[float] = None
    ) -> List[Dict]:
        """
        Integer Linear Programming assignment using PuLP.

        Allows for more complex constraints like budget limits.

        Args:
            shifts: List of shifts
            employees: List of employees
            feasible_pairs: List of feasible pairs
            cost_func: Function to calculate cost
            budget_limit: Optional budget constraint

        Returns:
            List of assignments
        """
        try:
            from pulp import LpProblem, LpMinimize, LpVariable, lpSum, LpStatus

            # Create problem
            prob = LpProblem("RosterAssignment", LpMinimize)

            # Create variables for each feasible pair
            assignment_vars = {}
            for emp_id, shift_id in feasible_pairs:
                var_name = f"assign_{emp_id}_{shift_id}"
                assignment_vars[(emp_id, shift_id)] = LpVariable(
                    var_name,
                    cat="Binary"
                )

            # Objective: Minimize total cost
            cost_dict = {}
            for emp_id, shift_id in feasible_pairs:
                employee = next(e for e in employees if e["employee_id"] == emp_id)
                shift = next(s for s in shifts if s["shift_id"] == shift_id)
                cost_dict[(emp_id, shift_id)] = cost_func(employee, shift)

            prob += lpSum([
                assignment_vars[(emp_id, shift_id)] * cost_dict[(emp_id, shift_id)]
                for emp_id, shift_id in feasible_pairs
            ])

            # Constraint: Each shift assigned to at most one employee
            for shift in shifts:
                shift_id = shift["shift_id"]
                prob += lpSum([
                    assignment_vars[(emp_id, sid)]
                    for emp_id, sid in feasible_pairs
                    if sid == shift_id
                ]) <= 1

            # Constraint: Budget limit (optional)
            if budget_limit:
                prob += lpSum([
                    assignment_vars[(emp_id, shift_id)] * cost_dict[(emp_id, shift_id)]
                    for emp_id, shift_id in feasible_pairs
                ]) <= budget_limit

            # Solve
            prob.solve()

            # Extract assignments
            assignments = []
            for (emp_id, shift_id), var in assignment_vars.items():
                if var.varValue == 1:
                    assignments.append({
                        "employee_id": emp_id,
                        "shift_id": shift_id,
                        "cost": cost_dict[(emp_id, shift_id)]
                    })

            return assignments

        except ImportError:
            # Fallback to greedy if PuLP not available
            return RosterOptimizer.greedy_assignment(
                shifts, employees, feasible_pairs, cost_func
            )


def calculate_roster_quality_metrics(
    assignments: List[Dict],
    shifts: List[Dict],
    employees: List[Dict]
) -> Dict:
    """
    Calculate quality metrics for a roster.

    Args:
        assignments: List of assignments
        shifts: All shifts
        employees: All employees

    Returns:
        Dict with quality metrics
    """
    total_shifts = len(shifts)
    filled_shifts = len(assignments)
    fill_rate = filled_shifts / total_shifts if total_shifts > 0 else 0

    total_cost = sum(a["cost"] for a in assignments)

    # Calculate employee utilization
    employee_shift_counts = {}
    for assignment in assignments:
        emp_id = assignment["employee_id"]
        employee_shift_counts[emp_id] = employee_shift_counts.get(emp_id, 0) + 1

    avg_shifts_per_employee = (
        sum(employee_shift_counts.values()) / len(employee_shift_counts)
        if employee_shift_counts else 0
    )

    # Calculate load balance (std dev of shifts per employee)
    shift_counts = list(employee_shift_counts.values())
    load_balance_score = np.std(shift_counts) if shift_counts else 0

    return {
        "fill_rate": fill_rate,
        "filled_shifts": filled_shifts,
        "total_shifts": total_shifts,
        "total_cost": total_cost,
        "avg_shifts_per_employee": avg_shifts_per_employee,
        "load_balance_score": load_balance_score,
        "employees_utilized": len(employee_shift_counts)
    }
