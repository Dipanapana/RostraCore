"""Shift pattern template model for rotation patterns (4-on-4-off, 2-2-3, etc.)."""

from sqlalchemy import Column, Integer, String, Time, Boolean, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PatternType(str, enum.Enum):
    """Type of shift pattern."""
    FOUR_ON_FOUR_OFF = "4_on_4_off"       # 4 days on, 4 days off (most common)
    TWO_TWO_THREE = "2_2_3"               # Continental: 2-2-3 alternating
    SIX_ON_THREE_OFF = "6_on_3_off"       # 6 days on, 3 days off
    FIVE_ON_TWO_OFF = "5_on_2_off"        # Standard Mon-Fri
    CUSTOM = "custom"                      # Custom rotation


class ShiftPatternTemplate(Base):
    """
    Reusable shift rotation pattern templates.

    Examples:
    - 4-on-4-off: Day-Day-Day-Day-OFF-OFF-OFF-OFF, then Night-Night-Night-Night-OFF-OFF-OFF-OFF
    - 2-2-3 Continental: Complex alternating pattern with varying days
    - 6-on-3-off: 6 consecutive days, 3 days off

    BCEA Compliance:
    - Max 45 ordinary hours/week (55 with overtime)
    - 12 hours minimum rest between shifts
    - Max 6 consecutive working days
    - Max 3-4 consecutive night shifts (fatigue management)
    """

    __tablename__ = "shift_pattern_templates"

    template_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Basic info
    name = Column(String(100), nullable=False)  # e.g., "4-on-4-off Day/Night"
    description = Column(Text, nullable=True)
    pattern_type = Column(SQLEnum(PatternType, name='shiftpatterntype'), default=PatternType.FOUR_ON_FOUR_OFF)

    # Shift duration (typically 8 or 12 hours)
    shift_duration_hours = Column(Integer, nullable=False, default=12)

    # Rotation configuration
    days_on = Column(Integer, nullable=False, default=4)         # Consecutive day shifts
    nights_on = Column(Integer, nullable=False, default=4)       # Consecutive night shifts
    rest_after_days = Column(Integer, nullable=False, default=4) # Rest days after day rotation
    rest_after_nights = Column(Integer, nullable=False, default=4)  # Rest days after night rotation

    # Shift timing
    day_shift_start = Column(Time, nullable=False)    # e.g., 06:00
    day_shift_end = Column(Time, nullable=False)      # e.g., 18:00
    night_shift_start = Column(Time, nullable=False)  # e.g., 18:00
    night_shift_end = Column(Time, nullable=False)    # e.g., 06:00

    # BCEA Compliance constraints
    max_consecutive_days = Column(Integer, nullable=False, default=6)    # BCEA: Max 6
    max_consecutive_nights = Column(Integer, nullable=False, default=3)  # Fatigue: 3-4
    min_rest_between_shifts = Column(Integer, nullable=False, default=12)  # BCEA: 12 hours
    max_hours_per_week = Column(Integer, nullable=False, default=45)       # BCEA: 45 ordinary
    max_hours_per_month = Column(Integer, nullable=True)  # Optional cap

    # Meal break configuration
    include_meal_break = Column(Boolean, default=True)
    meal_break_duration_minutes = Column(Integer, default=60)  # BCEA minimum 30 min

    # Usage settings
    is_default = Column(Boolean, default=False)  # Organization default pattern
    is_active = Column(Boolean, default=True)

    # Metadata
    created_at = Column(String(50), server_default=func.now())
    updated_at = Column(String(50), onupdate=func.now())

    # Relationships
    organization = relationship("Organization")
    assigned_employees = relationship("Employee", back_populates="shift_pattern")

    def __repr__(self):
        return f"<ShiftPatternTemplate {self.template_id}: {self.name}>"

    @property
    def cycle_length_days(self) -> int:
        """Calculate full cycle length in days."""
        return self.days_on + self.rest_after_days + self.nights_on + self.rest_after_nights

    @property
    def working_days_per_cycle(self) -> int:
        """Calculate working days per full cycle."""
        return self.days_on + self.nights_on

    @property
    def hours_per_cycle(self) -> float:
        """Calculate total working hours per cycle."""
        return self.working_days_per_cycle * self.shift_duration_hours

    @property
    def average_hours_per_week(self) -> float:
        """Calculate average weekly hours for this pattern."""
        if self.cycle_length_days == 0:
            return 0
        return (self.hours_per_cycle / self.cycle_length_days) * 7

    def validate_bcea_compliance(self) -> tuple[bool, list[str]]:
        """
        Validate pattern against BCEA requirements.

        Returns:
            (is_compliant, list of violation messages)
        """
        violations = []

        # Check max consecutive days
        if self.days_on > self.max_consecutive_days:
            violations.append(
                f"Days on ({self.days_on}) exceeds BCEA max ({self.max_consecutive_days})"
            )

        # Check max consecutive nights
        if self.nights_on > self.max_consecutive_nights:
            violations.append(
                f"Nights on ({self.nights_on}) exceeds fatigue limit ({self.max_consecutive_nights})"
            )

        # Check average weekly hours
        avg_weekly = self.average_hours_per_week
        if avg_weekly > 55:  # BCEA max with overtime
            violations.append(
                f"Average weekly hours ({avg_weekly:.1f}) exceeds BCEA max (55h with OT)"
            )

        # Check minimum rest (implicit in pattern - shifts shouldn't overlap)
        if self.shift_duration_hours > 12:
            # 12-hour shifts with 12-hour rest means 24-hour cycle
            if self.min_rest_between_shifts < 12:
                violations.append(
                    f"Rest between shifts ({self.min_rest_between_shifts}h) below BCEA min (12h)"
                )

        # Check meal break for long shifts
        if self.shift_duration_hours > 5 and not self.include_meal_break:
            violations.append(
                f"Shifts >5 hours ({self.shift_duration_hours}h) require meal breaks per BCEA"
            )

        if self.include_meal_break and self.meal_break_duration_minutes < 30:
            violations.append(
                f"Meal break ({self.meal_break_duration_minutes} min) below BCEA minimum (30 min)"
            )

        return len(violations) == 0, violations

    def calculate_guards_needed(self, posts: int = 1) -> int:
        """
        Calculate minimum guards needed for 24/7 coverage.

        For 12-hour shifts with 4-on-4-off:
        - Need 4 guards per post (2 for day rotation, 2 for night rotation)

        Args:
            posts: Number of concurrent posts to cover

        Returns:
            Minimum number of guards needed
        """
        if self.shift_duration_hours == 12:
            # 12-hour shifts: 2 shifts per day
            # 4-on-4-off needs 4 guards per post (2 teams rotating)
            guards_per_post = 4
        elif self.shift_duration_hours == 8:
            # 8-hour shifts: 3 shifts per day
            # Need more guards for coverage
            guards_per_post = 5  # Approximately
        else:
            # Estimate based on cycle
            coverage_factor = self.cycle_length_days / self.working_days_per_cycle
            guards_per_post = max(2, int(coverage_factor * 2))

        return guards_per_post * posts


# Pre-defined common patterns (for seeding)
COMMON_PATTERNS = [
    {
        "name": "4-on-4-off (12-hour)",
        "description": "Standard 12-hour rotation: 4 day shifts, 4 off, 4 night shifts, 4 off",
        "pattern_type": PatternType.FOUR_ON_FOUR_OFF,
        "shift_duration_hours": 12,
        "days_on": 4,
        "nights_on": 4,
        "rest_after_days": 4,
        "rest_after_nights": 4,
        "day_shift_start": "06:00",
        "day_shift_end": "18:00",
        "night_shift_start": "18:00",
        "night_shift_end": "06:00",
        "max_consecutive_days": 6,
        "max_consecutive_nights": 4,
    },
    {
        "name": "2-2-3 Continental (12-hour)",
        "description": "Continental rotation with alternating weekends off",
        "pattern_type": PatternType.TWO_TWO_THREE,
        "shift_duration_hours": 12,
        "days_on": 2,  # Varies in actual pattern
        "nights_on": 2,
        "rest_after_days": 2,
        "rest_after_nights": 3,
        "day_shift_start": "06:00",
        "day_shift_end": "18:00",
        "night_shift_start": "18:00",
        "night_shift_end": "06:00",
        "max_consecutive_days": 3,
        "max_consecutive_nights": 3,
    },
    {
        "name": "6-on-3-off (8-hour)",
        "description": "Traditional pattern: 6 days on, 3 days off",
        "pattern_type": PatternType.SIX_ON_THREE_OFF,
        "shift_duration_hours": 8,
        "days_on": 6,
        "nights_on": 0,
        "rest_after_days": 3,
        "rest_after_nights": 0,
        "day_shift_start": "08:00",
        "day_shift_end": "16:00",
        "night_shift_start": "16:00",
        "night_shift_end": "00:00",
        "max_consecutive_days": 6,
        "max_consecutive_nights": 6,
    },
    {
        "name": "5-on-2-off (8-hour Mon-Fri)",
        "description": "Standard weekday pattern: Monday to Friday",
        "pattern_type": PatternType.FIVE_ON_TWO_OFF,
        "shift_duration_hours": 8,
        "days_on": 5,
        "nights_on": 0,
        "rest_after_days": 2,
        "rest_after_nights": 0,
        "day_shift_start": "08:00",
        "day_shift_end": "17:00",
        "night_shift_start": "17:00",
        "night_shift_end": "01:00",
        "max_consecutive_days": 5,
        "max_consecutive_nights": 5,
    },
]
