"""Pydantic schemas for API request/response validation."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date, time
from app.models.employee import EmployeeRole, EmployeeStatus
from app.models.shift import ShiftStatus
from app.models.expense import ExpenseType


# Employee Schemas
class EmployeeBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    id_number: str = Field(..., min_length=1, max_length=50)
    role: EmployeeRole
    hourly_rate: float = Field(..., gt=0)
    max_hours_week: int = Field(default=48, ge=0, le=168)
    cert_level: Optional[str] = None
    home_location: Optional[str] = None
    home_gps_lat: Optional[float] = None
    home_gps_lng: Optional[float] = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[EmployeeRole] = None
    hourly_rate: Optional[float] = None
    max_hours_week: Optional[int] = None
    cert_level: Optional[str] = None
    home_location: Optional[str] = None
    home_gps_lat: Optional[float] = None
    home_gps_lng: Optional[float] = None
    status: Optional[EmployeeStatus] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class EmployeeResponse(EmployeeBase):
    employee_id: int

    class Config:
        from_attributes = True


# Site Schemas
class SiteBase(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=200)
    address: str = Field(..., min_length=1, max_length=500)
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    shift_pattern: Optional[str] = None
    required_skill: Optional[str] = None
    billing_rate: Optional[float] = None
    min_staff: int = Field(default=1, ge=1)
    notes: Optional[str] = None


class SiteCreate(SiteBase):
    pass


class SiteUpdate(BaseModel):
    client_name: Optional[str] = None
    address: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    shift_pattern: Optional[str] = None
    required_skill: Optional[str] = None
    billing_rate: Optional[float] = None
    min_staff: Optional[int] = None
    notes: Optional[str] = None


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
    assigned_employee_id: Optional[int] = None
    status: ShiftStatus = ShiftStatus.PLANNED
    created_by: Optional[str] = None
    is_overtime: bool = False
    notes: Optional[str] = None


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    site_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    required_skill: Optional[str] = None
    assigned_employee_id: Optional[int] = None
    status: Optional[ShiftStatus] = None
    is_overtime: Optional[bool] = None
    notes: Optional[str] = None


class ShiftResponse(ShiftBase):
    shift_id: int

    class Config:
        from_attributes = True


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


class CertificationCreate(CertificationBase):
    pass


class CertificationUpdate(BaseModel):
    cert_type: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    verified: Optional[bool] = None
    cert_number: Optional[str] = None
    issuing_authority: Optional[str] = None


class CertificationResponse(CertificationBase):
    cert_id: int

    class Config:
        from_attributes = True


# Expense Schemas
class ExpenseBase(BaseModel):
    employee_id: Optional[int] = None
    site_id: Optional[int] = None
    type: ExpenseType
    amount: float = Field(..., gt=0)
    date_incurred: date
    approved: bool = False
    description: Optional[str] = None
    receipt_url: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    type: Optional[ExpenseType] = None
    amount: Optional[float] = None
    date_incurred: Optional[date] = None
    approved: Optional[bool] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    expense_id: int

    class Config:
        from_attributes = True


# Attendance Schemas
class AttendanceBase(BaseModel):
    shift_id: int
    employee_id: int
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    variance_minutes: int = 0
    notes: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    variance_minutes: Optional[int] = None
    notes: Optional[str] = None


class AttendanceResponse(AttendanceBase):
    attend_id: int

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
    budget_limit: Optional[float] = None


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
