"""Service for resolving employee availability combining patterns and specific dates."""

from datetime import date, time, datetime, timedelta
from typing import List, Optional, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.availability_pattern import AvailabilityPattern, PatternType
from app.models.availability import Availability


class AvailabilityResolver:
    """
    Service for resolving employee availability.

    Priority resolution:
    1. Specific dates in existing `availability` table (highest priority)
    2. Exception patterns (type='exception')
    3. Recurring weekly patterns
    4. Default: Assume available (configurable)
    """

    def __init__(self, db: Session, default_available: bool = True):
        """
        Initialize the resolver.

        Args:
            db: Database session
            default_available: If no patterns/specific dates found, assume available?
        """
        self.db = db
        self.default_available = default_available

    def get_patterns_for_employee(
        self,
        employee_id: int,
        active_only: bool = True
    ) -> List[AvailabilityPattern]:
        """Get all availability patterns for an employee."""
        query = self.db.query(AvailabilityPattern).filter(
            AvailabilityPattern.employee_id == employee_id
        )
        if active_only:
            query = query.filter(AvailabilityPattern.is_active == True)
        return query.order_by(AvailabilityPattern.priority.desc()).all()

    def get_specific_availability(
        self,
        employee_id: int,
        check_date: date
    ) -> Optional[Availability]:
        """Get specific availability record for an employee on a date."""
        return self.db.query(Availability).filter(
            and_(
                Availability.employee_id == employee_id,
                Availability.date == check_date
            )
        ).first()

    def is_employee_available(
        self,
        employee_id: int,
        check_date: date,
        check_time: time = None
    ) -> Tuple[bool, str]:
        """
        Check if an employee is available at a specific date/time.

        Priority:
        1. Specific date availability (highest priority)
        2. Exception patterns
        3. Recurring weekly patterns
        4. Default (configurable)

        Args:
            employee_id: The employee to check
            check_date: The date to check
            check_time: Optional specific time to check

        Returns:
            Tuple of (is_available, reason)
        """
        # 1. Check specific date availability first (highest priority)
        specific = self.get_specific_availability(employee_id, check_date)
        if specific:
            if specific.is_available:
                # Check time window if provided and specific record has times
                if check_time and specific.start_time and specific.end_time:
                    if specific.start_time <= check_time < specific.end_time:
                        return True, f"Available (specific date: {specific.start_time}-{specific.end_time})"
                    else:
                        return False, f"Not available at {check_time} (specific: {specific.start_time}-{specific.end_time})"
                return True, "Available (specific date record)"
            else:
                return False, f"Not available (specific date: {specific.notes or 'marked unavailable'})"

        # 2. Get all patterns for employee
        patterns = self.get_patterns_for_employee(employee_id, active_only=True)

        # Filter to patterns effective on this date
        effective_patterns = [
            p for p in patterns if p.is_effective_on_date(check_date)
        ]

        # 2a. Check exception patterns first
        exception_patterns = [
            p for p in effective_patterns if p.pattern_type == PatternType.EXCEPTION
        ]
        for pattern in sorted(exception_patterns, key=lambda p: p.priority, reverse=True):
            is_avail = pattern.is_available_at(check_date, check_time)
            if not is_avail:
                return False, f"Not available (exception: {pattern.pattern_name or 'unnamed'})"
            # If exception says available, continue to check (might have time restrictions)

        # 2b. Check recurring weekly patterns
        weekly_patterns = [
            p for p in effective_patterns if p.pattern_type == PatternType.RECURRING_WEEKLY
        ]
        for pattern in sorted(weekly_patterns, key=lambda p: p.priority, reverse=True):
            is_avail = pattern.is_available_at(check_date, check_time)
            if is_avail:
                weekday = check_date.weekday()
                _, start, end = pattern.get_day_availability(weekday)
                if start and end:
                    return True, f"Available (pattern: {pattern.pattern_name or 'weekly'}, {start}-{end})"
                return True, f"Available (pattern: {pattern.pattern_name or 'weekly'})"
            else:
                weekday_name = check_date.strftime("%A")
                return False, f"Not available on {weekday_name} (pattern: {pattern.pattern_name or 'weekly'})"

        # 2c. Check date range patterns
        range_patterns = [
            p for p in effective_patterns if p.pattern_type == PatternType.DATE_RANGE
        ]
        for pattern in sorted(range_patterns, key=lambda p: p.priority, reverse=True):
            is_avail = pattern.is_available_at(check_date, check_time)
            if is_avail:
                if pattern.range_start_time and pattern.range_end_time:
                    return True, f"Available (date range: {pattern.range_start_time}-{pattern.range_end_time})"
                return True, f"Available (date range: {pattern.pattern_name or 'unnamed'})"

        # 3. Default
        if self.default_available:
            return True, "Available (default - no restrictions set)"
        else:
            return False, "Not available (default - no availability pattern set)"

    def get_available_hours(
        self,
        employee_id: int,
        check_date: date
    ) -> List[Tuple[time, time]]:
        """
        Get available time windows for an employee on a specific date.

        Returns:
            List of (start_time, end_time) tuples.
            Empty list means not available.
            [(None, None)] means available all day.
        """
        # Check specific date first
        specific = self.get_specific_availability(employee_id, check_date)
        if specific:
            if not specific.is_available:
                return []
            if specific.start_time and specific.end_time:
                return [(specific.start_time, specific.end_time)]
            return [(None, None)]  # Available all day

        # Get patterns
        patterns = self.get_patterns_for_employee(employee_id, active_only=True)
        effective_patterns = [
            p for p in patterns if p.is_effective_on_date(check_date)
        ]

        # Collect all available windows from patterns
        available_windows = []

        for pattern in sorted(effective_patterns, key=lambda p: p.priority, reverse=True):
            windows = pattern.get_available_hours_for_date(check_date)
            if windows:
                available_windows.extend(windows)

        if available_windows:
            return available_windows

        # Default
        if self.default_available:
            return [(None, None)]  # Available all day
        return []

    def get_availability_calendar(
        self,
        employee_id: int,
        start_date: date,
        end_date: date
    ) -> List[Dict]:
        """
        Generate a calendar view of employee availability for a date range.

        Returns:
            List of dicts with date, availability status, and time windows
        """
        results = []
        current_date = start_date

        while current_date <= end_date:
            is_available, reason = self.is_employee_available(employee_id, current_date)
            windows = self.get_available_hours(employee_id, current_date)

            results.append({
                "date": current_date.isoformat(),
                "day_name": current_date.strftime("%A"),
                "is_weekend": current_date.weekday() >= 5,
                "is_available": is_available,
                "reason": reason,
                "time_windows": [
                    {
                        "start": w[0].strftime("%H:%M") if w[0] else "00:00",
                        "end": w[1].strftime("%H:%M") if w[1] else "23:59"
                    }
                    for w in windows
                ] if windows else []
            })

            # Move to next day
            current_date = current_date + timedelta(days=1)

        return results

    def create_pattern(
        self,
        org_id: int,
        employee_id: int,
        pattern_name: str,
        effective_from: date,
        effective_to: date = None,
        pattern_type: PatternType = PatternType.RECURRING_WEEKLY,
        weekly_schedule: Dict = None,
        range_times: Tuple[time, time] = None,
        priority: int = 0
    ) -> AvailabilityPattern:
        """
        Create a new availability pattern.

        Args:
            org_id: Organization ID
            employee_id: Employee ID
            pattern_name: Name for the pattern
            effective_from: Start date
            effective_to: End date (None = indefinite)
            pattern_type: Type of pattern
            weekly_schedule: Dict with day availability, e.g.:
                {"monday": (True, time(6,0), time(18,0)), "tuesday": (False, None, None), ...}
            range_times: For date_range patterns, (start_time, end_time)
            priority: Higher takes precedence
        """
        pattern = AvailabilityPattern(
            org_id=org_id,
            employee_id=employee_id,
            pattern_name=pattern_name,
            effective_from=effective_from,
            effective_to=effective_to,
            pattern_type=pattern_type,
            priority=priority,
            is_active=True
        )

        # Set weekly schedule if provided
        if weekly_schedule:
            days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            for day in days:
                if day in weekly_schedule:
                    available, start, end = weekly_schedule[day]
                    setattr(pattern, f"{day}_available", available)
                    setattr(pattern, f"{day}_start", start)
                    setattr(pattern, f"{day}_end", end)

        # Set range times if provided
        if range_times:
            pattern.range_start_time = range_times[0]
            pattern.range_end_time = range_times[1]

        self.db.add(pattern)
        self.db.commit()
        self.db.refresh(pattern)
        return pattern

    def update_pattern(
        self,
        pattern_id: int,
        **kwargs
    ) -> Optional[AvailabilityPattern]:
        """Update an existing availability pattern."""
        pattern = self.db.query(AvailabilityPattern).filter(
            AvailabilityPattern.pattern_id == pattern_id
        ).first()

        if not pattern:
            return None

        for key, value in kwargs.items():
            if hasattr(pattern, key):
                setattr(pattern, key, value)

        self.db.commit()
        self.db.refresh(pattern)
        return pattern

    def delete_pattern(self, pattern_id: int) -> bool:
        """Delete an availability pattern."""
        pattern = self.db.query(AvailabilityPattern).filter(
            AvailabilityPattern.pattern_id == pattern_id
        ).first()

        if not pattern:
            return False

        self.db.delete(pattern)
        self.db.commit()
        return True

    def create_standard_work_week_pattern(
        self,
        org_id: int,
        employee_id: int,
        effective_from: date,
        effective_to: date = None,
        weekday_start: time = time(6, 0),
        weekday_end: time = time(18, 0),
        include_saturday: bool = False,
        saturday_start: time = None,
        saturday_end: time = None
    ) -> AvailabilityPattern:
        """
        Create a standard Mon-Fri work week pattern.

        Convenience method for quickly setting up typical availability.
        """
        weekly_schedule = {
            'monday': (True, weekday_start, weekday_end),
            'tuesday': (True, weekday_start, weekday_end),
            'wednesday': (True, weekday_start, weekday_end),
            'thursday': (True, weekday_start, weekday_end),
            'friday': (True, weekday_start, weekday_end),
            'saturday': (include_saturday, saturday_start or weekday_start, saturday_end or weekday_end),
            'sunday': (False, None, None)
        }

        return self.create_pattern(
            org_id=org_id,
            employee_id=employee_id,
            pattern_name="Standard Work Week",
            effective_from=effective_from,
            effective_to=effective_to,
            pattern_type=PatternType.RECURRING_WEEKLY,
            weekly_schedule=weekly_schedule,
            priority=5
        )

    def create_full_availability_pattern(
        self,
        org_id: int,
        employee_id: int,
        effective_from: date,
        effective_to: date = None
    ) -> AvailabilityPattern:
        """Create a pattern marking employee as fully available all days."""
        weekly_schedule = {
            'monday': (True, None, None),
            'tuesday': (True, None, None),
            'wednesday': (True, None, None),
            'thursday': (True, None, None),
            'friday': (True, None, None),
            'saturday': (True, None, None),
            'sunday': (True, None, None)
        }

        return self.create_pattern(
            org_id=org_id,
            employee_id=employee_id,
            pattern_name="Fully Available",
            effective_from=effective_from,
            effective_to=effective_to,
            pattern_type=PatternType.RECURRING_WEEKLY,
            weekly_schedule=weekly_schedule,
            priority=1
        )
