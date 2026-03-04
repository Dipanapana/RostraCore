"""
Roster Suggestion Service — BCEA compliance and intelligent suggestions.

Analyzes parsed roster data to flag:
- Consecutive work days (BCEA limit)
- Overtime alerts
- Missing rest days
- Grade mismatches
- Understaffing
- PSIRA expiry warnings
- Worked count mismatches
"""

from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.shift_assignment import ShiftAssignment
from app.models.site import Site


class RosterSuggestionService:
    """Analyzes parsed Mafoko roster data and generates intelligent suggestions."""

    @staticmethod
    def analyze(
        roster_data: list[dict],
        employee_map: dict,
        start_date: date,
        end_date: date,
        site: Optional[Site],
        db: Session,
        org_id: int,
    ) -> list[dict]:
        """Run all suggestion checks and return sorted by severity."""
        suggestions = []
        suggestions.extend(RosterSuggestionService._check_consecutive_days(roster_data, employee_map, start_date))
        suggestions.extend(RosterSuggestionService._check_overtime(roster_data, employee_map, start_date, end_date))
        suggestions.extend(RosterSuggestionService._check_rest_days(roster_data, employee_map, start_date))
        suggestions.extend(RosterSuggestionService._check_grade_mismatches(roster_data, employee_map))
        suggestions.extend(RosterSuggestionService._check_understaffing(roster_data, site, start_date, end_date))
        suggestions.extend(RosterSuggestionService._check_psira_expiry(employee_map, start_date, end_date))
        suggestions.extend(RosterSuggestionService._check_worked_count(roster_data))
        suggestions.extend(RosterSuggestionService._check_new_employees(roster_data, employee_map))

        # Sort: errors first, then warnings, then info
        severity_order = {"error": 0, "warning": 1, "info": 2}
        suggestions.sort(key=lambda s: severity_order.get(s.get("severity", "info"), 3))

        return suggestions

    @staticmethod
    def _check_consecutive_days(
        roster_data: list[dict], employee_map: dict, start_date: date
    ) -> list[dict]:
        """Flag employees working >6 consecutive days (BCEA Section 15)."""
        suggestions = []
        for row in roster_data:
            employee = employee_map.get(row["pers_no"])
            if not employee:
                continue

            working_days = sorted(row["working_days"])
            if len(working_days) < 7:
                continue

            # Find longest consecutive streak
            max_streak = 1
            current_streak = 1
            streak_start = working_days[0]
            max_streak_start = streak_start

            for i in range(1, len(working_days)):
                if working_days[i] == working_days[i - 1] + 1:
                    current_streak += 1
                    if current_streak > max_streak:
                        max_streak = current_streak
                        max_streak_start = streak_start
                else:
                    current_streak = 1
                    streak_start = working_days[i]

            if max_streak > 6:
                actual_start = start_date + timedelta(days=max_streak_start)
                actual_end = actual_start + timedelta(days=max_streak - 1)
                emp_name = f"{row['pers_no']} {row['name']}"
                suggestions.append({
                    "type": "consecutive_days",
                    "severity": "warning",
                    "employee": emp_name,
                    "message": (
                        f"Working {max_streak} consecutive days "
                        f"({actual_start.strftime('%d %b')} - {actual_end.strftime('%d %b')}). "
                        f"BCEA recommends max 6 consecutive days."
                    ),
                })
        return suggestions

    @staticmethod
    def _check_overtime(
        roster_data: list[dict], employee_map: dict, start_date: date, end_date: date
    ) -> list[dict]:
        """Flag employees exceeding 48h/week average (BCEA Section 10)."""
        suggestions = []
        period_days = (end_date - start_date).days + 1
        period_weeks = max(period_days / 7, 1)

        for row in roster_data:
            employee = employee_map.get(row["pers_no"])
            if not employee:
                continue

            days_worked = len(row["working_days"])
            # Assume 12h shifts (06:00-18:00)
            total_hours = days_worked * 12
            weekly_average = total_hours / period_weeks

            if weekly_average > 48:
                emp_name = f"{row['pers_no']} {row['name']}"
                suggestions.append({
                    "type": "overtime_alert",
                    "severity": "info",
                    "employee": emp_name,
                    "message": (
                        f"{days_worked} days worked = {total_hours}h total, "
                        f"{weekly_average:.0f}h/week average. "
                        f"Exceeds BCEA 48h/week limit."
                    ),
                })
        return suggestions

    @staticmethod
    def _check_rest_days(
        roster_data: list[dict], employee_map: dict, start_date: date
    ) -> list[dict]:
        """Flag employees with no rest day in a 7-day window (BCEA Section 15)."""
        suggestions = []
        for row in roster_data:
            employee = employee_map.get(row["pers_no"])
            if not employee:
                continue

            working_set = set(row["working_days"])
            # Check each 7-day window
            max_day = max(row["working_days"]) if row["working_days"] else 0
            for window_start in range(0, max_day - 5):
                window = set(range(window_start, window_start + 7))
                if window.issubset(working_set):
                    actual_start = start_date + timedelta(days=window_start)
                    actual_end = actual_start + timedelta(days=6)
                    emp_name = f"{row['pers_no']} {row['name']}"
                    suggestions.append({
                        "type": "missing_rest_day",
                        "severity": "error",
                        "employee": emp_name,
                        "message": (
                            f"No rest day in 7-day window "
                            f"({actual_start.strftime('%d %b')} - {actual_end.strftime('%d %b')}). "
                            f"BCEA requires at least 1 rest day per 7."
                        ),
                    })
                    break  # Only report first violation per employee
        return suggestions

    @staticmethod
    def _check_grade_mismatches(
        roster_data: list[dict], employee_map: dict
    ) -> list[dict]:
        """Flag employees whose file grade differs from system psira_grade."""
        suggestions = []
        grade_map = {"A": "Grade A", "B": "Grade B", "C": "Grade C", "D": "Grade D", "E": "Grade E"}

        for row in roster_data:
            employee = employee_map.get(row["pers_no"])
            if not employee or not row["grade"]:
                continue

            file_grade = row["grade"].strip().upper()
            system_grade = (employee.psira_grade or "").upper()

            # Normalize file grade (might be just "C" or "Grade C")
            file_grade_full = grade_map.get(file_grade, file_grade)

            if system_grade and file_grade_full.upper() != system_grade.upper():
                emp_name = f"{row['pers_no']} {row['name']}"
                suggestions.append({
                    "type": "grade_mismatch",
                    "severity": "warning",
                    "employee": emp_name,
                    "message": f"File says Grade {file_grade}, system has {system_grade}. Please verify.",
                })
        return suggestions

    @staticmethod
    def _check_understaffing(
        roster_data: list[dict], site: Optional[Site], start_date: date, end_date: date
    ) -> list[dict]:
        """Flag days with fewer guards than site.min_staff."""
        suggestions = []
        if not site or not site.min_staff:
            return suggestions

        # Count guards per day
        day_counts: dict[int, int] = {}
        for row in roster_data:
            for day_offset in row["working_days"]:
                day_counts[day_offset] = day_counts.get(day_offset, 0) + 1

        period_days = (end_date - start_date).days + 1
        for day_offset in range(period_days):
            count = day_counts.get(day_offset, 0)
            if count < site.min_staff:
                actual_date = start_date + timedelta(days=day_offset)
                suggestions.append({
                    "type": "understaffed",
                    "severity": "warning",
                    "employee": None,
                    "message": (
                        f"{actual_date.strftime('%d %b %Y (%a)')}: "
                        f"{count} guards assigned, minimum required is {site.min_staff}."
                    ),
                })
        return suggestions

    @staticmethod
    def _check_psira_expiry(
        employee_map: dict, start_date: date, end_date: date
    ) -> list[dict]:
        """Flag employees whose PSIRA registration expires during the roster period."""
        suggestions = []
        for pers_no, employee in employee_map.items():
            if not employee.psira_expiry_date:
                continue
            expiry = employee.psira_expiry_date
            if isinstance(expiry, str):
                continue  # Skip if not a proper date
            if start_date <= expiry <= end_date:
                suggestions.append({
                    "type": "psira_expiry",
                    "severity": "warning",
                    "employee": f"{pers_no} {employee.first_name} {employee.last_name}",
                    "message": f"PSIRA registration expires on {expiry.strftime('%d %b %Y')} during this roster period.",
                })
            elif expiry < start_date:
                suggestions.append({
                    "type": "psira_expiry",
                    "severity": "error",
                    "employee": f"{pers_no} {employee.first_name} {employee.last_name}",
                    "message": f"PSIRA registration already expired on {expiry.strftime('%d %b %Y')}.",
                })
        return suggestions

    @staticmethod
    def _check_worked_count(roster_data: list[dict]) -> list[dict]:
        """Flag rows where the 'Worked' column doesn't match the count of 'D' cells."""
        suggestions = []
        for row in roster_data:
            actual_d_count = len(row["working_days"])
            if row["worked_count"] != actual_d_count and row["worked_count"] > 0:
                suggestions.append({
                    "type": "worked_count_mismatch",
                    "severity": "warning",
                    "employee": f"{row['pers_no']} {row['name']}",
                    "message": (
                        f"'Worked' column says {row['worked_count']} days but "
                        f"found {actual_d_count} 'D' cells in the grid."
                    ),
                })
        return suggestions

    @staticmethod
    def _check_new_employees(roster_data: list[dict], employee_map: dict) -> list[dict]:
        """Flag employees not found in the system — needs onboarding."""
        suggestions = []
        for row in roster_data:
            if row["pers_no"] not in employee_map:
                suggestions.append({
                    "type": "new_employee",
                    "severity": "info",
                    "employee": f"{row['pers_no']} {row['name']}",
                    "message": f"Not found in system. May need onboarding as a new employee.",
                })
        return suggestions
