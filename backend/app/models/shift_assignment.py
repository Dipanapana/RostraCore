"""
ShiftAssignment model - tracks individual shift assignments with cost breakdown
"""

from sqlalchemy import Column, Integer, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class ShiftAssignment(Base):
    """
    ShiftAssignment entity representing the assignment of an employee to a shift.
    Tracks detailed cost breakdown, confirmation status, and attendance.
    """
    __tablename__ = "shift_assignments"

    assignment_id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.roster_id"), nullable=False, index=True)

    # Assignment metadata
    assigned_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    assigned_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    # Hours breakdown
    regular_hours = Column(Float, nullable=False, default=0.0)
    overtime_hours = Column(Float, nullable=False, default=0.0)

    # Cost breakdown
    regular_pay = Column(Float, nullable=False, default=0.0)
    overtime_pay = Column(Float, nullable=False, default=0.0)
    night_premium = Column(Float, nullable=False, default=0.0)  # Extra pay for night shifts
    weekend_premium = Column(Float, nullable=False, default=0.0)  # Extra pay for weekend shifts
    travel_reimbursement = Column(Float, nullable=False, default=0.0)
    total_cost = Column(Float, nullable=False, default=0.0)

    # Confirmation status
    is_confirmed = Column(Boolean, nullable=False, default=False)
    confirmation_datetime = Column(DateTime, nullable=True)

    # Attendance tracking
    checked_in = Column(Boolean, nullable=False, default=False)
    check_in_time = Column(DateTime, nullable=True)
    checked_out = Column(Boolean, nullable=False, default=False)
    check_out_time = Column(DateTime, nullable=True)

    # Relationships
    shift = relationship("Shift", back_populates="shift_assignment")
    employee = relationship("Employee")
    roster = relationship("Roster", back_populates="shift_assignments")
    assigner = relationship("User", foreign_keys=[assigned_by])

    def __repr__(self):
        return f"<ShiftAssignment(id={self.assignment_id}, shift_id={self.shift_id}, employee_id={self.employee_id}, cost={self.total_cost})>"

    @property
    def total_hours(self) -> float:
        """Calculate total hours (regular + overtime)"""
        return self.regular_hours + self.overtime_hours

    @property
    def is_overtime(self) -> bool:
        """Check if this assignment includes overtime"""
        return self.overtime_hours > 0

    @property
    def is_premium_shift(self) -> bool:
        """Check if this is a premium shift (night or weekend)"""
        return self.night_premium > 0 or self.weekend_premium > 0

    @property
    def attendance_status(self) -> str:
        """Get attendance status string"""
        if self.checked_in and self.checked_out:
            return "completed"
        elif self.checked_in:
            return "in_progress"
        elif self.is_confirmed:
            return "confirmed"
        else:
            return "pending"

    def calculate_cost(self, shift, employee):
        """
        Calculate cost breakdown for this assignment.

        Args:
            shift: Shift object
            employee: Employee object
        """
        duration_hours = (shift.end_time - shift.start_time).total_seconds() / 3600

        # Determine regular vs overtime hours
        # For simplicity, first 45h/week is regular, 46-48h is overtime
        # This would need weekly context in real implementation
        if shift.is_overtime:
            self.overtime_hours = duration_hours
            self.regular_hours = 0
            self.overtime_pay = duration_hours * employee.hourly_rate * 1.5
            self.regular_pay = 0
        else:
            self.regular_hours = duration_hours
            self.overtime_hours = 0
            self.regular_pay = duration_hours * employee.hourly_rate
            self.overtime_pay = 0

        # Night premium (10% extra for shifts starting between 18:00-06:00)
        if 18 <= shift.start_time.hour or shift.start_time.hour < 6:
            self.night_premium = self.regular_pay * 0.1

        # Weekend premium (15% extra for Sat/Sun)
        if shift.start_time.weekday() >= 5:  # 5=Saturday, 6=Sunday
            self.weekend_premium = (self.regular_pay + self.overtime_pay) * 0.15

        # Travel reimbursement (simplified - would use actual distance in real implementation)
        # Assume R2/km, average 20km distance
        self.travel_reimbursement = 40.0

        # Total cost
        self.total_cost = (
            self.regular_pay +
            self.overtime_pay +
            self.night_premium +
            self.weekend_premium +
            self.travel_reimbursement
        )

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "assignment_id": self.assignment_id,
            "shift_id": self.shift_id,
            "employee_id": self.employee_id,
            "roster_id": self.roster_id,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "regular_hours": self.regular_hours,
            "overtime_hours": self.overtime_hours,
            "total_hours": self.total_hours,
            "regular_pay": self.regular_pay,
            "overtime_pay": self.overtime_pay,
            "night_premium": self.night_premium,
            "weekend_premium": self.weekend_premium,
            "travel_reimbursement": self.travel_reimbursement,
            "total_cost": self.total_cost,
            "is_confirmed": self.is_confirmed,
            "confirmation_datetime": self.confirmation_datetime.isoformat() if self.confirmation_datetime else None,
            "attendance_status": self.attendance_status,
            "checked_in": self.checked_in,
            "check_in_time": self.check_in_time.isoformat() if self.check_in_time else None,
            "checked_out": self.checked_out,
            "check_out_time": self.check_out_time.isoformat() if self.check_out_time else None
        }
