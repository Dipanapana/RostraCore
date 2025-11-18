"""
ShiftAssignment model - tracks individual shift assignments with cost breakdown
"""

from sqlalchemy import Column, Integer, Float, DateTime, Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


class AssignmentStatus(str, enum.Enum):
    """Assignment status workflow enum."""
    PENDING = "pending"          # Auto-assigned by roster, awaiting confirmation
    CONFIRMED = "confirmed"      # Reviewed and approved by admin
    CANCELLED = "cancelled"      # Assignment removed
    COMPLETED = "completed"      # Shift finished


class ShiftAssignment(Base):
    """
    ShiftAssignment entity representing the assignment of an employee to a shift.
    Tracks detailed cost breakdown, confirmation status, and attendance.
    Supports multiple guards per shift.
    """
    __tablename__ = "shift_assignments"
    __table_args__ = (
        UniqueConstraint('shift_id', 'employee_id', name='uq_shift_employee_assignment'),
    )

    assignment_id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.roster_id"), nullable=True, index=True)

    # Assignment metadata
    assigned_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    assigned_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    status = Column(String(20), nullable=False, default=AssignmentStatus.PENDING.value)

    # Hours breakdown
    regular_hours = Column(Float, nullable=False, default=0.0)
    overtime_hours = Column(Float, nullable=False, default=0.0)

    # Cost breakdown
    regular_pay = Column(Float, nullable=False, default=0.0)
    overtime_pay = Column(Float, nullable=False, default=0.0)
    night_premium = Column(Float, nullable=False, default=0.0)  # Extra pay for night shifts
    weekend_premium = Column(Float, nullable=False, default=0.0)  # Extra pay for weekend shifts (deprecated - use sunday_premium)
    sunday_premium = Column(Float, nullable=False, default=0.0)  # BCEA Sunday premium (1.5x base)
    holiday_premium = Column(Float, nullable=False, default=0.0)  # BCEA Public holiday premium (2.0x base)
    travel_reimbursement = Column(Float, nullable=False, default=0.0)
    total_cost = Column(Float, nullable=False, default=0.0)

    # Premium metadata
    premium_type = Column(String(50), nullable=True)  # 'regular', 'sunday', 'holiday:Holiday Name'

    # Confirmation status
    is_confirmed = Column(Boolean, nullable=False, default=False)
    confirmation_datetime = Column(DateTime, nullable=True)

    # Attendance tracking
    checked_in = Column(Boolean, nullable=False, default=False)
    check_in_time = Column(DateTime, nullable=True)
    checked_out = Column(Boolean, nullable=False, default=False)
    check_out_time = Column(DateTime, nullable=True)

    # Relationships
    shift = relationship("Shift", back_populates="shift_assignments")
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
        Calculate BCEA-compliant cost breakdown for this assignment.

        Uses PremiumRateCalculator for:
        - Public holiday work: 2.0x base rate (BCEA compliance)
        - Sunday work: 1.5x base rate (BCEA compliance)
        - Regular days: 1.0x base rate

        Args:
            shift: Shift object
            employee: Employee object
        """
        from app.utils.holidays import PremiumRateCalculator

        # Use paid_hours (meal break adjusted) for calculations
        duration_hours = shift.paid_hours
        shift_date = shift.start_time.date()

        # Calculate BCEA-compliant premium rates
        total_base_cost, premium_amount, premium_type = PremiumRateCalculator.calculate_shift_cost(
            base_hourly_rate=employee.hourly_rate,
            hours=duration_hours,
            shift_date=shift_date,
            include_premiums=True
        )

        # Store premium type for reporting
        self.premium_type = premium_type

        # Determine regular vs overtime hours
        if shift.is_overtime:
            self.overtime_hours = duration_hours
            self.regular_hours = 0
            self.overtime_pay = total_base_cost
            self.regular_pay = 0
        else:
            self.regular_hours = duration_hours
            self.overtime_hours = 0
            self.regular_pay = total_base_cost
            self.overtime_pay = 0

        # Set BCEA premium fields based on type
        if premium_type.startswith('holiday:'):
            self.holiday_premium = premium_amount
            self.sunday_premium = 0
            self.weekend_premium = 0  # Deprecated
        elif premium_type == 'sunday':
            self.sunday_premium = premium_amount
            self.holiday_premium = 0
            self.weekend_premium = premium_amount  # Backwards compatibility
        else:
            self.holiday_premium = 0
            self.sunday_premium = 0
            self.weekend_premium = 0

        # Night premium (additional to BCEA premiums)
        if 18 <= shift.start_time.hour or shift.start_time.hour < 6:
            self.night_premium = employee.hourly_rate * duration_hours * 0.1
        else:
            self.night_premium = 0

        # Travel reimbursement (simplified - would use actual distance in real implementation)
        # Assume R2/km, average 20km distance
        self.travel_reimbursement = 40.0

        # Total cost (BCEA premiums already included in regular_pay/overtime_pay)
        self.total_cost = (
            self.regular_pay +
            self.overtime_pay +
            self.night_premium +
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
            "weekend_premium": self.weekend_premium,  # Deprecated - use sunday_premium
            "sunday_premium": self.sunday_premium,  # BCEA Sunday premium (1.5x)
            "holiday_premium": self.holiday_premium,  # BCEA Holiday premium (2.0x)
            "premium_type": self.premium_type,  # 'regular', 'sunday', 'holiday:Name'
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
