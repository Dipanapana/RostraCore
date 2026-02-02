"""Employee model."""

from sqlalchemy import Column, Integer, String, Float, Boolean, Date, Text, DateTime, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class EmployeeRole(str, enum.Enum):
    """Employee role enum - Extended for Phase 1 multi-type HR."""
    # Existing roles (keep unchanged for backward compatibility)
    ARMED = "armed"
    UNARMED = "unarmed"
    SUPERVISOR = "supervisor"

    # New roles (Phase 1: Multi-type HR platform)
    OFFICE_STAFF = "office_staff"
    CONTRACTOR = "contractor"
    CONSULTANT = "consultant"


class EmploymentType(str, enum.Enum):
    """Employment contract type classification."""
    PERMANENT = "permanent"
    CONTRACT = "contract"           # Fixed-term employment contract
    CONSULTANT = "consultant"       # Independent contractor (SARS rules)
    PART_TIME = "part_time"
    TEMPORARY = "temporary"         # Seasonal/casual workers


class WorkPatternType(str, enum.Enum):
    """Work scheduling pattern type."""
    SHIFT_BASED = "shift_based"     # Existing: 4-on-4-off, 2-2-3, etc.
    OFFICE_HOURS = "office_hours"   # Standard business hours (M-F 9-5)
    PROJECT_BASED = "project_based" # No fixed schedule, deliverable-based
    FLEXIBLE = "flexible"           # Core hours + flex time
    CUSTOM = "custom"               # Organization-specific pattern


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

    # Supervisor and geographical fields
    is_supervisor = Column(Boolean, default=False)  # Whether employee is a supervisor
    province = Column(String(50), nullable=True)  # North West, Northern Cape, Gauteng, etc.

    # Shift pattern assignment for auto-generated availability
    shift_pattern_id = Column(Integer, ForeignKey("shift_pattern_templates.template_id", ondelete="SET NULL"), nullable=True)
    rotation_group = Column(String(1), nullable=True)  # A, B, C, D - position in rotation cycle
    pattern_start_date = Column(Date, nullable=True)  # When their rotation cycle started

    # Phase 1: Multi-type HR platform fields (all nullable for backward compatibility)
    # Employment classification
    employment_type = Column(SQLEnum(EmploymentType), nullable=True, default=EmploymentType.PERMANENT)
    work_pattern_type = Column(SQLEnum(WorkPatternType), nullable=True, default=WorkPatternType.SHIFT_BASED)

    # Contractor/Consultant specific fields
    contract_start_date = Column(Date, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    daily_rate = Column(Numeric(10, 2), nullable=True)  # For consultants (alternative to hourly_rate)
    project_name = Column(String(200), nullable=True)  # Current project assignment
    invoicing_frequency = Column(String(50), nullable=True)  # weekly, monthly, milestone

    # Skills/specialization (beyond security certifications)
    skills = Column(ARRAY(String), nullable=True)  # ["Excel", "Python", "Project Management"]
    department = Column(String(100), nullable=True)  # HR, Finance, IT, Operations
    job_title = Column(String(100), nullable=True)  # "Office Manager", "IT Consultant"

    # Part-time specific
    max_hours_month = Column(Integer, nullable=True)  # Monthly hour limit for part-time workers
    preferred_days = Column(ARRAY(String), nullable=True)  # ["Monday", "Wednesday", "Friday"]

    # Office hours specific
    standard_work_hours_start = Column(String(5), nullable=True)  # e.g., "09:00"
    standard_work_hours_end = Column(String(5), nullable=True)    # e.g., "17:00"
    core_hours_start = Column(String(5), nullable=True)           # For flexible schedules
    core_hours_end = Column(String(5), nullable=True)             # For flexible schedules

    # Tax classification (SARS compliance)
    is_independent_contractor = Column(Boolean, default=False)  # True for consultants (no PAYE withholding)

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
