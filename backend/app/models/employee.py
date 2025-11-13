"""Employee model."""

from sqlalchemy import Column, Integer, String, Float, Boolean, Date, Text, DateTime, Numeric, ForeignKey, Enum as SQLEnum
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

    # Self-service portal fields
    hashed_password = Column(String(255), nullable=True)  # For employee login
    psira_number = Column(String(50), nullable=True)
    psira_expiry_date = Column(Date, nullable=True)
    psira_grade = Column(String(50), nullable=True)  # A, B, C, D, E
    address = Column(Text, nullable=True)
    emergency_contact_name = Column(String(200), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    is_active_account = Column(Boolean, default=False)  # Whether employee can login
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Supervisor and geographical fields
    is_supervisor = Column(Boolean, default=False)  # Whether employee is a supervisor
    province = Column(String(50), nullable=True)  # North West, Northern Cape, Gauteng, etc.

    # Marketplace/Rating fields
    average_rating = Column(Numeric(3, 2), nullable=True)  # Average rating from guard_ratings
    total_ratings = Column(Integer, default=0)  # Total number of ratings received
    hired_from_marketplace = Column(Boolean, default=False)  # Was this employee hired via job marketplace?
    marketplace_applicant_id = Column(Integer, ForeignKey("guard_applicants.applicant_id", ondelete="SET NULL"), nullable=True)

    # Relationships
    shifts = relationship("Shift", back_populates="employee")
    certifications = relationship("Certification", back_populates="employee")
    availability = relationship("Availability", back_populates="employee")
    expenses = relationship("Expense", back_populates="employee")
    attendance = relationship("Attendance", back_populates="employee")
    payroll_summary = relationship("PayrollSummary", back_populates="employee")
    skills = relationship("SkillsMatrix", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")
    incident_reports = relationship("IncidentReport", foreign_keys="[IncidentReport.employee_id]", back_populates="employee")
    daily_reports = relationship("DailyOccurrenceBook", foreign_keys="[DailyOccurrenceBook.employee_id]", back_populates="employee")
    ratings = relationship("GuardRating", foreign_keys="[GuardRating.employee_id]", back_populates="employee")
    ob_entries = relationship("OBEntry", foreign_keys="[OBEntry.employee_id]", back_populates="employee")

    def __repr__(self):
        return f"<Employee {self.employee_id}: {self.first_name} {self.last_name}>"
