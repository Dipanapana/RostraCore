"""Employee Availability Pattern model for flexible availability scheduling."""

from sqlalchemy import Column, Integer, String, Boolean, Date, Time, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum
from datetime import date, time, timedelta


class PatternType(str, enum.Enum):
    """Type of availability pattern."""
    RECURRING_WEEKLY = "recurring_weekly"  # Repeats every week (Mon-Sun schedule)
    DATE_RANGE = "date_range"              # Specific date range with fixed times
    EXCEPTION = "exception"                 # Exception/override pattern (takes precedence)


class AvailabilityPattern(Base):
    """
    Employee availability pattern for flexible scheduling.

    Allows employees to set availability by:
    - Date ranges (not individual dates)
    - Time ranges per day
    - Weekly recurring patterns

    Example: "Available Mon-Fri 06:00-18:00 from Dec 1 to Dec 31"

    Priority resolution:
    1. Specific dates in existing `availability` table (highest)
    2. Exception patterns (type='exception')
    3. Recurring weekly patterns
    4. Default: Assume available (configurable)
    """
    __tablename__ = "availability_patterns"

    pattern_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    # Pattern identification
    pattern_name = Column(String(100), nullable=True)  # "Standard Work Week", "December Schedule"

    # Effective dates
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)  # NULL = indefinite/ongoing

    # Pattern type
    pattern_type = Column(SQLEnum(PatternType), nullable=False, default=PatternType.RECURRING_WEEKLY)

    # Weekly availability (for recurring_weekly and exception patterns)
    # Each day has: available flag + optional start/end times
    monday_available = Column(Boolean, default=True)
    monday_start = Column(Time, nullable=True)  # NULL = available all day
    monday_end = Column(Time, nullable=True)

    tuesday_available = Column(Boolean, default=True)
    tuesday_start = Column(Time, nullable=True)
    tuesday_end = Column(Time, nullable=True)

    wednesday_available = Column(Boolean, default=True)
    wednesday_start = Column(Time, nullable=True)
    wednesday_end = Column(Time, nullable=True)

    thursday_available = Column(Boolean, default=True)
    thursday_start = Column(Time, nullable=True)
    thursday_end = Column(Time, nullable=True)

    friday_available = Column(Boolean, default=True)
    friday_start = Column(Time, nullable=True)
    friday_end = Column(Time, nullable=True)

    saturday_available = Column(Boolean, default=True)
    saturday_start = Column(Time, nullable=True)
    saturday_end = Column(Time, nullable=True)

    sunday_available = Column(Boolean, default=True)
    sunday_start = Column(Time, nullable=True)
    sunday_end = Column(Time, nullable=True)

    # For date_range patterns: single time window that applies to all days in range
    range_start_time = Column(Time, nullable=True)
    range_end_time = Column(Time, nullable=True)

    # Priority (higher = takes precedence when multiple patterns match)
    priority = Column(Integer, default=0, nullable=False)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    organization = relationship("Organization")
    employee = relationship("Employee", back_populates="availability_patterns")

    def __repr__(self):
        return f"<AvailabilityPattern {self.pattern_id}: {self.pattern_name} (emp:{self.employee_id})>"

    def is_effective_on_date(self, check_date: date) -> bool:
        """Check if this pattern is effective on a given date."""
        if check_date < self.effective_from:
            return False
        if self.effective_to is not None and check_date > self.effective_to:
            return False
        return True

    def get_day_availability(self, weekday: int) -> tuple:
        """
        Get availability for a specific weekday.

        Args:
            weekday: 0=Monday, 1=Tuesday, ..., 6=Sunday

        Returns:
            (is_available, start_time, end_time)
        """
        day_map = {
            0: (self.monday_available, self.monday_start, self.monday_end),
            1: (self.tuesday_available, self.tuesday_start, self.tuesday_end),
            2: (self.wednesday_available, self.wednesday_start, self.wednesday_end),
            3: (self.thursday_available, self.thursday_start, self.thursday_end),
            4: (self.friday_available, self.friday_start, self.friday_end),
            5: (self.saturday_available, self.saturday_start, self.saturday_end),
            6: (self.sunday_available, self.sunday_start, self.sunday_end),
        }
        return day_map.get(weekday, (False, None, None))

    def is_available_at(self, check_date: date, check_time: time = None) -> bool:
        """
        Check if employee is available at a specific date/time based on this pattern.

        Args:
            check_date: The date to check
            check_time: Optional time to check (if None, just checks date availability)

        Returns:
            True if available, False otherwise
        """
        if not self.is_effective_on_date(check_date):
            return False

        if self.pattern_type == PatternType.DATE_RANGE:
            # For date_range, employee is available during the entire range
            if check_time is None:
                return True
            # If time specified, check against range times
            if self.range_start_time and self.range_end_time:
                return self.range_start_time <= check_time < self.range_end_time
            return True  # No time restriction

        # For recurring_weekly and exception patterns
        weekday = check_date.weekday()
        is_available, start_time, end_time = self.get_day_availability(weekday)

        if not is_available:
            return False

        if check_time is None:
            return True

        # Check time window if specified
        if start_time and end_time:
            # Handle time windows that might cross midnight
            if start_time <= end_time:
                return start_time <= check_time < end_time
            else:
                # Crosses midnight
                return check_time >= start_time or check_time < end_time

        return True  # No time restriction means available all day

    def get_available_hours_for_date(self, check_date: date) -> list:
        """
        Get list of available time windows for a specific date.

        Returns:
            List of (start_time, end_time) tuples, or [(None, None)] for all day
        """
        if not self.is_effective_on_date(check_date):
            return []

        if self.pattern_type == PatternType.DATE_RANGE:
            if self.range_start_time and self.range_end_time:
                return [(self.range_start_time, self.range_end_time)]
            return [(None, None)]  # All day

        weekday = check_date.weekday()
        is_available, start_time, end_time = self.get_day_availability(weekday)

        if not is_available:
            return []

        if start_time and end_time:
            return [(start_time, end_time)]

        return [(None, None)]  # All day
