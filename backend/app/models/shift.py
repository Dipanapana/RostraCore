"""Shift model."""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ShiftStatus(str, enum.Enum):
    """Shift status enum."""
    PLANNED = "planned"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Shift(Base):
    """Planned work period model."""

    __tablename__ = "shifts"

    shift_id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    required_skill = Column(String(100))
    required_staff = Column(Integer, nullable=False, default=1)  # Number of guards needed
    status = Column(SQLEnum(ShiftStatus), default=ShiftStatus.PLANNED)
    created_by = Column(String(100))
    is_overtime = Column(Boolean, default=False)
    notes = Column(String(500))

    # BCEA Compliance - Meal Breaks
    # BCEA requires meal break after 5 hours of continuous work
    includes_meal_break = Column(Boolean, default=True)  # True for shifts >5h
    meal_break_duration_minutes = Column(Integer, default=60)  # Default 60 min unpaid break

    # Relationships
    site = relationship("Site", back_populates="shifts")
    shift_assignments = relationship("ShiftAssignment", back_populates="shift", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Shift {self.shift_id}: Site {self.site_id} at {self.start_time}>"

    @property
    def effective_required_skill(self) -> str:
        """
        Get the effective required skill for this shift.

        FIXED: If shift-specific required_skill is not set, inherit from site.
        This resolves confusion between Site.required_skill and Shift.required_skill.

        Returns:
            Required skill string (shift-specific if set, otherwise site's skill)
        """
        if self.required_skill:
            return self.required_skill
        # Inherit from site if not specified
        if self.site and self.site.required_skill:
            return self.site.required_skill
        return ""  # No skill requirement

    @property
    def duration_hours(self) -> float:
        """Calculate shift duration in hours"""
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds() / 3600
        return 0.0

    @property
    def paid_hours(self) -> float:
        """Calculate paid hours (excluding meal break if applicable)"""
        total_hours = self.duration_hours
        if self.includes_meal_break and self.meal_break_duration_minutes:
            # Meal break is unpaid, subtract from total
            meal_break_hours = self.meal_break_duration_minutes / 60
            return max(0, total_hours - meal_break_hours)
        return total_hours

    @property
    def requires_meal_break(self) -> bool:
        """Check if shift duration requires a meal break per BCEA (>5 hours)"""
        return self.duration_hours > 5.0

    def validate_meal_break(self) -> tuple[bool, str]:
        """
        Validate meal break compliance.
        Returns: (is_valid, error_message)
        """
        if self.requires_meal_break and not self.includes_meal_break:
            return False, f"Shift duration {self.duration_hours:.1f}h requires meal break (BCEA: >5h)"

        if self.includes_meal_break and self.meal_break_duration_minutes < 30:
            return False, "Meal break must be at least 30 minutes (BCEA requirement)"

        return True, ""
