"""Attendance model."""

from sqlalchemy import Column, Integer, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from app.database import Base


class Attendance(Base):
    """Actual clock-in/out model."""

    __tablename__ = "attendance"

    attend_id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=False, unique=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    clock_in = Column(DateTime)
    clock_out = Column(DateTime)
    variance_minutes = Column(Integer, default=0)
    notes = Column(String(500))

    # Relationships
    shift = relationship("Shift", back_populates="attendance")
    employee = relationship("Employee", back_populates="attendance")

    def __repr__(self):
        return f"<Attendance {self.attend_id}: Shift {self.shift_id}>"
