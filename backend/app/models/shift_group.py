"""Shift Group model for managing multi-guard shifts."""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ShiftGroupStatus(str, enum.Enum):
    """Shift group status enum."""
    DRAFT = "draft"
    PUBLISHED = "published"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ShiftGroup(Base):
    """
    Shift Group entity for managing multi-guard shifts.

    A shift group represents a single time slot at a site that requires
    multiple guards in different positions (supervisor, patrol, gate, etc.).

    When published, a shift group creates individual shifts for each position.
    """
    __tablename__ = "shift_groups"

    shift_group_id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)

    # Group identification
    group_name = Column(String(100), nullable=True)
    # Example: "Mall Day Shift - Team A"
    group_code = Column(String(50), nullable=True)
    # Example: "MALL-DAY-A"

    # Timing
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)

    # Staffing requirements
    required_guards = Column(Integer, nullable=False)
    required_supervisors = Column(Integer, default=0, nullable=False)

    # Status
    status = Column(SQLEnum(ShiftGroupStatus), default=ShiftGroupStatus.DRAFT, nullable=False, index=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    created_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    # TODO: Add back when Shift model is updated with shift_group_id foreign key
    # shifts = relationship("Shift", back_populates="shift_group")

    def __repr__(self):
        return f"<ShiftGroup(id={self.shift_group_id}, site_id={self.site_id}, guards={self.required_guards}, status='{self.status.value}')>"

    @property
    def duration_hours(self) -> float:
        """Calculate shift duration in hours."""
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds() / 3600
        return 0.0

    @property
    def total_positions(self) -> int:
        """Total number of positions (guards + supervisors)."""
        return self.required_guards + self.required_supervisors

    def validate_staffing(self) -> tuple[bool, str]:
        """
        Validate staffing requirements.

        Returns:
            (is_valid: bool, message: str)
        """
        if self.required_guards < 1:
            return False, "Must have at least 1 guard"

        if self.required_supervisors > 0:
            # Check supervisor ratio (1 supervisor per 5-8 guards)
            guard_to_supervisor_ratio = self.required_guards / self.required_supervisors
            if guard_to_supervisor_ratio > 8:
                return False, f"Supervisor ratio too high: 1:{guard_to_supervisor_ratio:.0f} (max 1:8)"

        return True, "Staffing valid"

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "shift_group_id": self.shift_group_id,
            "tenant_id": self.tenant_id,
            "site_id": self.site_id,
            "group_name": self.group_name,
            "group_code": self.group_code,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "required_guards": self.required_guards,
            "required_supervisors": self.required_supervisors,
            "total_positions": self.total_positions,
            "duration_hours": self.duration_hours,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by,
            "notes": self.notes
        }
