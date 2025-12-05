"""Service to generate availability from shift pattern assignments."""

from datetime import date, time, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.availability import Availability
from app.models.shift_pattern_template import ShiftPatternTemplate


class PatternAvailabilityService:
    """
    Service to generate availability records based on shift pattern assignments.

    For a 4-on-4-off pattern with 4 rotation groups (A, B, C, D):
    - Each group is offset by 4 days in the cycle
    - This provides 24/7 coverage with 4 guards per post

    Cycle for 4-on-4-off (16 days total):
    - Days 1-4: Day shifts (06:00-18:00)
    - Days 5-8: Off
    - Days 9-12: Night shifts (18:00-06:00)
    - Days 13-16: Off

    Group offsets:
    - Group A: Start at day 1 (Day shifts first)
    - Group B: Start at day 5 (Off, then Night)
    - Group C: Start at day 9 (Night shifts first)
    - Group D: Start at day 13 (Off, then Day)
    """

    # Group offsets within the cycle
    GROUP_OFFSETS = {
        'A': 0,   # Starts on Day 1 (Day shifts)
        'B': 4,   # Starts on Day 5 (Off → Night)
        'C': 8,   # Starts on Day 9 (Night shifts)
        'D': 12,  # Starts on Day 13 (Off → Day)
    }

    @staticmethod
    def calculate_cycle_position(
        pattern: ShiftPatternTemplate,
        rotation_group: str,
        target_date: date,
        pattern_start_date: date
    ) -> int:
        """
        Calculate which day of the rotation cycle a given date falls on.

        Args:
            pattern: The shift pattern template
            rotation_group: A, B, C, or D
            target_date: The date to check
            pattern_start_date: When the pattern cycle started

        Returns:
            Day number within the cycle (1-based, e.g., 1-16 for 4-on-4-off)
        """
        cycle_length = pattern.cycle_length_days
        group_offset = PatternAvailabilityService.GROUP_OFFSETS.get(rotation_group.upper(), 0)

        # Days since pattern started
        days_since_start = (target_date - pattern_start_date).days

        # Apply group offset and calculate position in cycle (1-based)
        position = ((days_since_start - group_offset) % cycle_length) + 1

        return position

    @staticmethod
    def get_shift_for_date(
        pattern: ShiftPatternTemplate,
        rotation_group: str,
        target_date: date,
        pattern_start_date: date
    ) -> Tuple[bool, Optional[str], Optional[time], Optional[time]]:
        """
        Determine the shift type for a given date.

        Args:
            pattern: The shift pattern template
            rotation_group: A, B, C, or D
            target_date: The date to check
            pattern_start_date: When the pattern cycle started

        Returns:
            Tuple of (is_working, shift_type, start_time, end_time)
            - shift_type: 'day', 'night', or None if off
        """
        position = PatternAvailabilityService.calculate_cycle_position(
            pattern, rotation_group, target_date, pattern_start_date
        )

        # Determine which phase of the cycle we're in
        days_on = pattern.days_on
        rest_after_days = pattern.rest_after_days
        nights_on = pattern.nights_on
        rest_after_nights = pattern.rest_after_nights

        # Phase boundaries (1-based positions)
        day_shift_end = days_on
        first_rest_end = days_on + rest_after_days
        night_shift_end = first_rest_end + nights_on
        # second_rest_end = cycle_length (end of cycle)

        if position <= day_shift_end:
            # Day shift phase
            return (True, 'day', pattern.day_shift_start, pattern.day_shift_end)
        elif position <= first_rest_end:
            # First rest period (after day shifts)
            return (False, None, None, None)
        elif position <= night_shift_end:
            # Night shift phase
            return (True, 'night', pattern.night_shift_start, pattern.night_shift_end)
        else:
            # Second rest period (after night shifts)
            return (False, None, None, None)

    @staticmethod
    def generate_availability_for_employee(
        db: Session,
        employee_id: int,
        pattern: ShiftPatternTemplate,
        rotation_group: str,
        pattern_start_date: date,
        start_date: date,
        end_date: date,
        clear_existing: bool = True
    ) -> List[Availability]:
        """
        Generate availability records for an employee based on their pattern assignment.

        Args:
            db: Database session
            employee_id: The employee ID
            pattern: The shift pattern template
            rotation_group: A, B, C, or D
            pattern_start_date: When the pattern cycle started
            start_date: Start of date range to generate
            end_date: End of date range to generate
            clear_existing: Whether to clear existing availability for this range

        Returns:
            List of created Availability records
        """
        # Get the employee to get org_id
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            raise ValueError(f"Employee {employee_id} not found")

        # Optionally clear existing availability in range
        if clear_existing:
            db.query(Availability).filter(
                Availability.employee_id == employee_id,
                Availability.date >= start_date,
                Availability.date <= end_date
            ).delete()

        # Generate availability for each day
        created_records = []
        current_date = start_date

        while current_date <= end_date:
            is_working, shift_type, shift_start, shift_end = PatternAvailabilityService.get_shift_for_date(
                pattern, rotation_group, current_date, pattern_start_date
            )

            # Only create availability records for working days
            # Off days have no record (system treats missing records as "not available")
            if is_working and shift_start and shift_end:
                avail = Availability(
                    employee_id=employee_id,
                    date=current_date,
                    available=True,
                    start_time=shift_start,
                    end_time=shift_end
                )

                db.add(avail)
                created_records.append(avail)

            current_date += timedelta(days=1)

        db.commit()

        return created_records

    @staticmethod
    def preview_schedule(
        pattern: ShiftPatternTemplate,
        rotation_group: str,
        pattern_start_date: date,
        num_days: int = 28
    ) -> List[dict]:
        """
        Generate a preview of the schedule without saving to database.

        Args:
            pattern: The shift pattern template
            rotation_group: A, B, C, or D
            pattern_start_date: When the pattern cycle started
            num_days: Number of days to preview

        Returns:
            List of dicts with date, is_working, shift_type, times
        """
        schedule = []
        current_date = pattern_start_date

        for _ in range(num_days):
            is_working, shift_type, shift_start, shift_end = PatternAvailabilityService.get_shift_for_date(
                pattern, rotation_group, current_date, pattern_start_date
            )

            schedule.append({
                'date': current_date.isoformat(),
                'is_working': is_working,
                'shift_type': shift_type,
                'start_time': shift_start.isoformat() if shift_start else None,
                'end_time': shift_end.isoformat() if shift_end else None,
                'cycle_position': PatternAvailabilityService.calculate_cycle_position(
                    pattern, rotation_group, current_date, pattern_start_date
                )
            })

            current_date += timedelta(days=1)

        return schedule

    @staticmethod
    def get_group_assignments_for_date(
        pattern: ShiftPatternTemplate,
        pattern_start_date: date,
        target_date: date
    ) -> dict:
        """
        Get all group assignments for a specific date.

        Useful for visualizing who is working when.

        Returns:
            Dict mapping group letter to (is_working, shift_type)
        """
        result = {}

        for group in ['A', 'B', 'C', 'D']:
            is_working, shift_type, _, _ = PatternAvailabilityService.get_shift_for_date(
                pattern, group, target_date, pattern_start_date
            )
            result[group] = {
                'is_working': is_working,
                'shift_type': shift_type
            }

        return result
