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
    assigned_employee_id = Column(Integer, ForeignKey("employees.employee_id"), index=True)
    status = Column(SQLEnum(ShiftStatus), default=ShiftStatus.PLANNED)
    created_by = Column(String(100))
    is_overtime = Column(Boolean, default=False)
    notes = Column(String(500))

    # Relationships
    site = relationship("Site", back_populates="shifts")
    employee = relationship("Employee", back_populates="shifts")
    attendance = relationship("Attendance", back_populates="shift", uselist=False)

    def __repr__(self):
        return f"<Shift {self.shift_id}: Site {self.site_id} at {self.start_time}>"
