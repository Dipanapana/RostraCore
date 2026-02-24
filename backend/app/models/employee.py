"""Employee model."""

from sqlalchemy import Column, Integer, String, Float, Boolean, Date, Text, DateTime, Numeric, ForeignKey, Enum as SQLEnum, CheckConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class PayType(str, enum.Enum):
    """Employee pay type."""
    HOURLY = "hourly"                # Paid per hour worked (security guards, casual staff)
    MONTHLY_FIXED = "monthly_fixed"  # Fixed monthly salary (office staff, managers, salaried)


class EmployeeRole(str, enum.Enum):
    """Employee role enum — universal across industries."""
    # Security-specific
    ARMED = "armed"
    UNARMED = "unarmed"
    # Universal roles
    SUPERVISOR = "supervisor"
    MANAGER = "manager"
    ADMIN = "admin"
    OFFICE_STAFF = "office_staff"
    FIELD_WORKER = "field_worker"
    CONTRACTOR = "contractor"
    OTHER = "other"


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

    # Client assignment: Employee can be assigned to specific client(s)
    # NULL/empty = can work for any client in the organization
    # Legacy single-client field (kept for backward compatibility)
    assigned_client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="SET NULL"), nullable=True, index=True)
    # New multi-client field: array of client IDs
    assigned_client_ids = Column(ARRAY(Integer), nullable=True)
    # Preferred sites: sites where employee is preferentially deployed
    preferred_site_ids = Column(ARRAY(Integer), nullable=True)

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    id_number = Column(String(50), unique=True, nullable=False, index=True)
    role = Column(SQLEnum(EmployeeRole), nullable=False)

    # Pay configuration
    pay_type = Column(String(20), default="hourly", nullable=False)
    hourly_rate = Column(Float, nullable=True)       # Required when pay_type='hourly'
    monthly_salary = Column(Numeric(10, 2), nullable=True)  # Required when pay_type='monthly_fixed'

    max_hours_week = Column(Integer, default=48)
    cert_level = Column(String(50))
    home_location = Column(String(200))
    home_gps_lat = Column(Float)
    home_gps_lng = Column(Float)
    status = Column(SQLEnum(EmployeeStatus), default=EmployeeStatus.ACTIVE)
    gender = Column(SQLEnum(Gender), nullable=True)  # For shift preference matching
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(20))

    # Banking details for payroll
    bank_name = Column(String(100), nullable=True)  # e.g., FNB, ABSA, Standard Bank, Nedbank
    account_number = Column(String(50), nullable=True)  # Bank account number
    branch_code = Column(String(20), nullable=True)  # Branch code for EFT
    account_type = Column(String(20), nullable=True)  # cheque, savings, transmission

    # Tax details
    tax_number = Column(String(20), nullable=True)  # SA tax reference number

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

    # Employment dates (for turnover / retention analytics)
    hire_date = Column(Date, nullable=True)
    termination_date = Column(Date, nullable=True)

    # Supervisor and geographical fields
    is_supervisor = Column(Boolean, default=False)  # Whether employee is a supervisor
    province = Column(String(50), nullable=True)  # North West, Northern Cape, Gauteng, etc.

    # Shift pattern assignment for auto-generated availability
    shift_pattern_id = Column(Integer, ForeignKey("shift_pattern_templates.template_id", ondelete="SET NULL"), nullable=True)
    rotation_group = Column(String(1), nullable=True)  # A, B, C, D - position in rotation cycle
    pattern_start_date = Column(Date, nullable=True)  # When their rotation cycle started

    # Relationships (MVP core only)
    organization = relationship("Organization", back_populates="employees")
    assigned_client = relationship("Client", foreign_keys=[assigned_client_id])
    certifications = relationship("Certification", back_populates="employee")
    availability = relationship("Availability", back_populates="employee")
    payroll_summary = relationship("PayrollSummary", back_populates="employee")
    roster_preferences = relationship("RosterPreferences", back_populates="employee", cascade="all, delete-orphan")
    availability_patterns = relationship("AvailabilityPattern", back_populates="employee", cascade="all, delete-orphan")
    shift_pattern = relationship("ShiftPatternTemplate", back_populates="assigned_employees")

    def __repr__(self):
        return f"<Employee {self.employee_id}: {self.first_name} {self.last_name}>"
