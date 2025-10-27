"""Employee model."""

from sqlalchemy import Column, Integer, String, Float, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class EmployeeRole(str, enum.Enum):
    """Employee role enum."""
    ARMED = "armed"
    UNARMED = "unarmed"
    SUPERVISOR = "supervisor"


class EmployeeStatus(str, enum.Enum):
    """Employee status enum."""
    ACTIVE = "active"
    INACTIVE = "inactive"


class Employee(Base):
    """Employee (guard/staff) model."""

    __tablename__ = "employees"

    employee_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    id_number = Column(String(50), unique=True, nullable=False, index=True)
    role = Column(SQLEnum(EmployeeRole), nullable=False)
    hourly_rate = Column(Float, nullable=False)
    max_hours_week = Column(Integer, default=48)
    cert_level = Column(String(50))
    home_location = Column(String(200))
    home_gps_lat = Column(Float)
    home_gps_lng = Column(Float)
    status = Column(SQLEnum(EmployeeStatus), default=EmployeeStatus.ACTIVE)
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(20))

    # Relationships
    shifts = relationship("Shift", back_populates="employee")
    certifications = relationship("Certification", back_populates="employee")
    availability = relationship("Availability", back_populates="employee")
    expenses = relationship("Expense", back_populates="employee")
    attendance = relationship("Attendance", back_populates="employee")
    payroll_summary = relationship("PayrollSummary", back_populates="employee")
    skills = relationship("SkillsMatrix", back_populates="employee")

    def __repr__(self):
        return f"<Employee {self.employee_id}: {self.first_name} {self.last_name}>"
