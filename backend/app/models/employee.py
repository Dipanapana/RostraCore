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


class Gender(str, enum.Enum):
    """Gender enum for employee demographics."""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class Employee(Base):
    """Employee (guard/staff) model."""

    __tablename__ = "employees"

    employee_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy: Employee belongs to an organization
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

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
    gender = Column(SQLEnum(Gender), nullable=True)  # For shift preference matching
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

    # Relationships (MVP core only)
    organization = relationship("Organization", back_populates="employees")
    certifications = relationship("Certification", back_populates="employee")
    availability = relationship("Availability", back_populates="employee")
    payroll_summary = relationship("PayrollSummary", back_populates="employee")

    def __repr__(self):
        return f"<Employee {self.employee_id}: {self.first_name} {self.last_name}>"
