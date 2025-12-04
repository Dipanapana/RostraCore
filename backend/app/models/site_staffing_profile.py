"""Site Staffing Profile model for dynamic staffing requirements."""

from sqlalchemy import Column, Integer, String, Boolean, Time, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class PeriodType(str, enum.Enum):
    """Time period type for staffing profiles."""
    DAY = "day"           # 06:00-18:00
    NIGHT = "night"       # 18:00-06:00
    ALL_DAY = "all_day"   # 00:00-24:00
    CUSTOM = "custom"     # Custom start/end times


class DayType(str, enum.Enum):
    """Day type for staffing profiles."""
    WEEKDAY = "weekday"
    WEEKEND = "weekend"
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"
    PUBLIC_HOLIDAY = "public_holiday"
    ALL = "all"


class PSIRAGradeRequirement(str, enum.Enum):
    """PSIRA grade requirements for staffing."""
    GRADE_A = "A"
    GRADE_B = "B"
    GRADE_C = "C"
    GRADE_D = "D"
    GRADE_E = "E"
    ANY = "any"


class SiteStaffingProfile(Base):
    """
    Site staffing profile for dynamic staffing requirements.

    Allows different numbers of guards and requirements based on:
    - Time of day (day/night/custom hours)
    - Day of week (weekday/weekend/specific days)
    - Special requirements (PSIRA grade, firearm, skills)
    """
    __tablename__ = "site_staffing_profiles"

    profile_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)

    # Profile identification
    profile_name = Column(String(100), nullable=False)  # "Weekday Day", "Weekend Night"

    # Time period
    period_type = Column(SQLEnum(PeriodType), nullable=False, default=PeriodType.ALL_DAY)
    custom_start_time = Column(Time, nullable=True)  # For custom periods
    custom_end_time = Column(Time, nullable=True)    # For custom periods

    # Day type
    day_type = Column(SQLEnum(DayType), nullable=False, default=DayType.ALL)

    # Staffing requirements
    required_staff = Column(Integer, nullable=False, default=1)
    required_skill = Column(String(100), nullable=True)
    required_psira_grade = Column(SQLEnum(PSIRAGradeRequirement), nullable=True, default=PSIRAGradeRequirement.ANY)
    requires_firearm = Column(Boolean, default=False)

    # Priority (higher = takes precedence when multiple profiles match)
    priority = Column(Integer, default=0, nullable=False)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    organization = relationship("Organization")
    site = relationship("Site", back_populates="staffing_profiles")

    def __repr__(self):
        return f"<SiteStaffingProfile {self.profile_id}: {self.profile_name} ({self.site_id})>"

    @staticmethod
    def get_default_period_times(period_type: PeriodType) -> tuple:
        """Get default start/end times for a period type."""
        from datetime import time
        if period_type == PeriodType.DAY:
            return time(6, 0), time(18, 0)
        elif period_type == PeriodType.NIGHT:
            return time(18, 0), time(6, 0)  # Crosses midnight
        elif period_type == PeriodType.ALL_DAY:
            return time(0, 0), time(23, 59)
        return None, None

    def matches_datetime(self, check_date, check_time) -> bool:
        """
        Check if this profile matches a given date and time.

        Args:
            check_date: datetime.date to check
            check_time: datetime.time to check

        Returns:
            True if this profile applies to the given datetime
        """
        from datetime import time

        # Check day type
        weekday = check_date.weekday()  # 0=Monday, 6=Sunday

        if self.day_type == DayType.ALL:
            day_matches = True
        elif self.day_type == DayType.WEEKDAY:
            day_matches = weekday < 5  # Monday-Friday
        elif self.day_type == DayType.WEEKEND:
            day_matches = weekday >= 5  # Saturday-Sunday
        elif self.day_type == DayType.MONDAY:
            day_matches = weekday == 0
        elif self.day_type == DayType.TUESDAY:
            day_matches = weekday == 1
        elif self.day_type == DayType.WEDNESDAY:
            day_matches = weekday == 2
        elif self.day_type == DayType.THURSDAY:
            day_matches = weekday == 3
        elif self.day_type == DayType.FRIDAY:
            day_matches = weekday == 4
        elif self.day_type == DayType.SATURDAY:
            day_matches = weekday == 5
        elif self.day_type == DayType.SUNDAY:
            day_matches = weekday == 6
        elif self.day_type == DayType.PUBLIC_HOLIDAY:
            # TODO: Implement public holiday checking (requires holiday calendar)
            day_matches = False
        else:
            day_matches = False

        if not day_matches:
            return False

        # Check time period
        if self.period_type == PeriodType.ALL_DAY:
            return True
        elif self.period_type == PeriodType.CUSTOM:
            start = self.custom_start_time
            end = self.custom_end_time
        else:
            start, end = self.get_default_period_times(self.period_type)

        if start is None or end is None:
            return True

        # Handle periods that cross midnight
        if start <= end:
            return start <= check_time < end
        else:
            # Night shift crosses midnight
            return check_time >= start or check_time < end
