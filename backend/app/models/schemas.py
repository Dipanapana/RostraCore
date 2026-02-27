"""Pydantic schemas for API request/response validation - MVP Core Only."""

from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List
from datetime import datetime, date, time
from app.models.employee import EmployeeRole, EmployeeStatus, Gender, PayType
from app.models.shift import ShiftStatus
from app.models.certification import PSIRAGrade, FirearmCompetencyType


# Employee Schemas
class EmployeeBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    id_number: str = Field(..., min_length=1, max_length=50)
    role: EmployeeRole
    pay_type: PayType = PayType.HOURLY
    hourly_rate: Optional[float] = Field(None, gt=0)  # Required when pay_type=hourly
    monthly_salary: Optional[float] = Field(None, gt=0)  # Required when pay_type=monthly_fixed
    max_hours_week: int = Field(default=48, ge=0, le=168)
    cert_level: Optional[str] = None
    home_location: Optional[str] = None
    home_gps_lat: Optional[float] = None
    home_gps_lng: Optional[float] = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    gender: Optional[Gender] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    hire_date: Optional[date] = None
    termination_date: Optional[date] = None

    @model_validator(mode='after')
    def validate_pay_fields(self):
        """Ensure the correct pay field is provided based on pay_type."""
        if self.pay_type == PayType.HOURLY and not self.hourly_rate:
            raise ValueError('hourly_rate is required for hourly employees')
        if self.pay_type == PayType.MONTHLY_FIXED and not self.monthly_salary:
            raise ValueError('monthly_salary is required for salaried employees')
        return self


class EmployeeCreate(EmployeeBase):
    org_id: Optional[int] = None  # Set automatically from current user if not provided
    assigned_client_id: Optional[int] = None  # Optional client assignment (legacy)
    assigned_client_ids: Optional[List[int]] = None  # Multiple client assignment
    preferred_site_ids: Optional[List[int]] = None  # Preferred site assignment

    # Banking details
    bank_name: Optional[str] = None  # e.g., FNB, ABSA, Standard Bank, Nedbank
    account_number: Optional[str] = None  # Bank account number (masked in responses)
    branch_code: Optional[str] = None  # Branch code for EFT
    account_type: Optional[str] = None  # cheque, savings, transmission

    # Tax details
    tax_number: Optional[str] = None  # SA tax reference number


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[EmployeeRole] = None
    pay_type: Optional[PayType] = None
    hourly_rate: Optional[float] = None
    monthly_salary: Optional[float] = None
    max_hours_week: Optional[int] = None
    cert_level: Optional[str] = None
    home_location: Optional[str] = None
    home_gps_lat: Optional[float] = None
    home_gps_lng: Optional[float] = None
    status: Optional[EmployeeStatus] = None
    gender: Optional[Gender] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    hire_date: Optional[date] = None
    termination_date: Optional[date] = None
    assigned_client_id: Optional[int] = None  # Allow updating client assignment (legacy)
    assigned_client_ids: Optional[List[int]] = None  # Allow updating multiple client assignment
    preferred_site_ids: Optional[List[int]] = None  # Preferred site assignment

    # Banking details
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    branch_code: Optional[str] = None
    account_type: Optional[str] = None

    # Tax details
    tax_number: Optional[str] = None


class EmployeeResponse(EmployeeBase):
    employee_id: int
    org_id: int  # Include organization in response
    assigned_client_id: Optional[int] = None  # Include client assignment in response (legacy)
    assigned_client_ids: Optional[List[int]] = None  # Include multiple client assignment in response
    preferred_site_ids: Optional[List[int]] = None  # Preferred site assignment
    max_hours_week: Optional[int] = 48  # Override to allow NULL from database

    # Pay fields (override base to make optional in response)
    pay_type: PayType = PayType.HOURLY
    hourly_rate: Optional[float] = None
    monthly_salary: Optional[float] = None

    # Banking details (account number is masked for security)
    bank_name: Optional[str] = None
    account_number: Optional[str] = None  # Will be masked in service layer
    branch_code: Optional[str] = None
    account_type: Optional[str] = None

    # Tax details
    tax_number: Optional[str] = None

    # PSIRA details
    psira_number: Optional[str] = None
    psira_grade: Optional[str] = None
    psira_expiry_date: Optional[date] = None

    # Personal details
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    province: Optional[str] = None
    is_supervisor: Optional[bool] = None

    # Shift pattern assignment fields
    shift_pattern_id: Optional[int] = None
    rotation_group: Optional[str] = None  # A, B, C, D
    pattern_start_date: Optional[date] = None

    class Config:
        from_attributes = True

    @model_validator(mode='after')
    def skip_pay_validation_for_response(self):
        """Skip pay field validation for response objects (data comes from DB)."""
        return self


# Site Schemas
class SiteBase(BaseModel):
    site_name: Optional[str] = None
    client_name: str = Field(..., min_length=1, max_length=200)
    address: str = Field(..., min_length=1, max_length=500)

    # Detailed location fields
    street_address: Optional[str] = None
    suburb: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = Field(default="South Africa")

    # GPS coordinates
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    gps_accuracy: Optional[float] = None
    location_notes: Optional[str] = None

    shift_pattern: Optional[str] = None
    required_skill: Optional[str] = None
    billing_rate: Optional[float] = None
    min_staff: int = Field(default=1, ge=1)
    notes: Optional[str] = None
    supervisor_id: Optional[int] = None


class SiteCreate(SiteBase):
    client_id: Optional[int] = None  # Optional client association


class SiteUpdate(BaseModel):
    site_name: Optional[str] = None
    client_name: Optional[str] = None
    address: Optional[str] = None

    # Detailed location fields
    street_address: Optional[str] = None
    suburb: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

    # GPS coordinates
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    gps_accuracy: Optional[float] = None
    location_notes: Optional[str] = None

    shift_pattern: Optional[str] = None
    required_skill: Optional[str] = None
    billing_rate: Optional[float] = None
    min_staff: Optional[int] = None
    notes: Optional[str] = None
    supervisor_id: Optional[int] = None


class SiteResponse(SiteBase):
    site_id: int

    class Config:
        from_attributes = True


# Shift Schemas
class ShiftBase(BaseModel):
    site_id: int
    start_time: datetime
    end_time: datetime
    required_skill: Optional[str] = None
    required_staff: int = 1  # Number of guards needed for this shift
    status: ShiftStatus = ShiftStatus.PLANNED
    created_by: Optional[str] = None
    is_overtime: bool = False
    notes: Optional[str] = None
    assigned_employee_id: Optional[int] = None


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    site_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    required_skill: Optional[str] = None
    required_staff: Optional[int] = None
    status: Optional[ShiftStatus] = None
    is_overtime: Optional[bool] = None
    notes: Optional[str] = None
    assigned_employee_id: Optional[int] = None


class ShiftResponse(ShiftBase):
    shift_id: int

    class Config:
        from_attributes = True


# Shift Assignment Schemas
class ShiftAssignmentBase(BaseModel):
    shift_id: int
    employee_id: int
    status: str = "pending"


class ShiftAssignmentCreate(ShiftAssignmentBase):
    pass


class ShiftAssignmentResponse(ShiftAssignmentBase):
    assignment_id: int
    assigned_at: datetime
    total_cost: float = 0.0

    class Config:
        from_attributes = True


# Bulk Shift Generation Schemas
class ShiftTemplateInput(BaseModel):
    """A single shift template for bulk generation."""
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: time  # e.g., "06:00"
    end_time: time  # e.g., "18:00"
    required_staff: int = 1
    required_skill: Optional[str] = None


class BulkShiftGenerateRequest(BaseModel):
    """Request body for bulk shift generation."""
    site_ids: List[int]  # Sites to generate shifts for
    start_date: date  # Start of date range
    end_date: date  # End of date range (inclusive)
    pattern: str = "weekly"  # "weekly", "bi-weekly", "custom"
    shift_templates: Optional[List[ShiftTemplateInput]] = None  # Custom templates
    use_site_templates: bool = False  # Use existing ShiftTemplate records from DB
    default_required_staff: int = 1  # Fallback if not specified
    default_required_skill: Optional[str] = None


class BulkShiftGenerateResponse(BaseModel):
    """Response for bulk shift generation."""
    success: bool
    shifts_created: int
    sites_processed: int
    date_range: str
    details: List[dict]  # Per-site breakdown
    errors: List[str] = []


# Availability Schemas
class AvailabilityBase(BaseModel):
    employee_id: int
    date: date
    start_time: time
    end_time: time
    available: bool = True


class AvailabilityCreate(AvailabilityBase):
    pass


class AvailabilityResponse(AvailabilityBase):
    avail_id: int

    class Config:
        from_attributes = True


# Certification Schemas
class CertificationBase(BaseModel):
    employee_id: int
    cert_type: str
    issue_date: date
    expiry_date: date
    verified: bool = False
    cert_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    # PSIRA-specific fields
    psira_grade: Optional[PSIRAGrade] = None
    firearm_competency: Optional[FirearmCompetencyType] = None


class CertificationCreate(CertificationBase):
    pass


class CertificationUpdate(BaseModel):
    cert_type: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    verified: Optional[bool] = None
    cert_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    psira_grade: Optional[PSIRAGrade] = None
    firearm_competency: Optional[FirearmCompetencyType] = None


class CertificationResponse(CertificationBase):
    cert_id: int

    class Config:
        from_attributes = True


# Payroll Schemas
class PayrollBase(BaseModel):
    employee_id: int
    period_start: date
    period_end: date
    total_hours: float = 0.0
    overtime_hours: float = 0.0
    gross_pay: float = 0.0
    expenses_total: float = 0.0
    net_pay: float = 0.0


class PayrollCreate(PayrollBase):
    pass


class PayrollResponse(PayrollBase):
    payroll_id: int

    class Config:
        from_attributes = True


# Roster Generation Schemas
class RosterGenerateRequest(BaseModel):
    start_date: date
    end_date: date
    site_ids: Optional[list[int]] = None
    client_ids: Optional[list[int]] = None  # Generate roster for specific clients

    # Budget constraints - all optional, None means no limit
    budget_limit: Optional[float] = None  # Total budget limit for roster period
    budget_per_client: Optional[dict[int, float]] = None  # Budget limits per client {client_id: limit}
    budget_per_site: Optional[dict[int, float]] = None  # Budget limits per site {site_id: limit}


class RosterAssignment(BaseModel):
    employee_id: int
    shift_id: int
    cost: float


class RosterSummary(BaseModel):
    total_cost: float
    total_shifts_filled: int
    employee_hours: dict[int, float]
    average_cost_per_shift: float
    fill_rate: float
    employees_utilized: int


class RosterGenerateResponse(BaseModel):
    assignments: list[RosterAssignment]
    summary: RosterSummary
    unfilled_shifts: list[ShiftResponse]
