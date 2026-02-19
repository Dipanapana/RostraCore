"""Employees API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta, date
from pydantic import BaseModel
from app.database import get_db
from app.models.schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.services.employee_service import EmployeeService
from app.services.excel_import_service import ExcelImportService
from app.services.client_filter_service import ClientFilterService
from app.api.deps import get_current_user
from app.models.user import User
from app.models.employee import Employee, EmployeeStatus
from app.models.certification import Certification

router = APIRouter()


def _get_org_id_or_403(current_user: User) -> int:
    """Extract org_id from user, raise 403 if not present (multi-tenancy security)."""
    if not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no organization assigned. Please contact administrator."
        )
    return current_user.org_id


def _check_employee_client_access(db: Session, employee: Employee, current_user: User):
    """Check if user has client-level access to view/modify this employee."""
    if employee.assigned_client_id is not None:
        if not ClientFilterService.is_client_accessible(db, current_user.org_id, employee.assigned_client_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to employees assigned to this client"
            )


@router.get("/dashboard/data-quality")
async def get_data_quality_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get guard data quality metrics for the organization.

    Returns:
    - guards_without_client: List of guards not assigned to any client
    - guards_without_certification: List of guards without any certification
    - guards_without_hourly_rate: List of guards with missing/zero hourly rate
    - guards_with_expired_certs: List of guards with expired certifications
    - guards_with_expiring_certs: List of guards with certs expiring in 30 days
    - total_guards: Total active guard count
    """
    org_id = _get_org_id_or_403(current_user)
    today = datetime.utcnow().date()
    expiring_threshold = today + timedelta(days=30)

    # Base query for active guards in this org
    base_query = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == EmployeeStatus.ACTIVE
    )

    # Total active guards
    total_guards = base_query.count()

    # Guards without client assignment (both fields are NULL/empty)
    guards_without_client = base_query.filter(
        and_(
            or_(Employee.assigned_client_id.is_(None)),
            or_(Employee.assigned_client_ids.is_(None), Employee.assigned_client_ids == [])
        )
    ).all()

    # Guards without any certification
    # Subquery to get employee_ids with at least one certification
    employees_with_certs = db.query(Certification.employee_id).distinct()
    guards_without_certification = base_query.filter(
        ~Employee.employee_id.in_(employees_with_certs)
    ).all()

    # Guards without hourly rate (NULL or 0)
    guards_without_hourly_rate = base_query.filter(
        or_(Employee.hourly_rate.is_(None), Employee.hourly_rate == 0)
    ).all()

    # Guards with expired certifications
    # Get employees with at least one expired cert
    employees_with_expired = db.query(Certification.employee_id).filter(
        Certification.expiry_date < today
    ).distinct()
    guards_with_expired_certs = base_query.filter(
        Employee.employee_id.in_(employees_with_expired)
    ).all()

    # Guards with certifications expiring in 30 days
    employees_with_expiring = db.query(Certification.employee_id).filter(
        and_(
            Certification.expiry_date >= today,
            Certification.expiry_date <= expiring_threshold
        )
    ).distinct()
    guards_with_expiring_certs = base_query.filter(
        Employee.employee_id.in_(employees_with_expiring)
    ).all()

    # Format response
    def format_guard(emp):
        return {
            "employee_id": emp.employee_id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "email": emp.email,
            "phone": emp.phone,
            "hourly_rate": emp.hourly_rate,
            "assigned_client_id": emp.assigned_client_id,
            "assigned_client_ids": emp.assigned_client_ids,
            "psira_grade": emp.psira_grade,
        }

    return {
        "total_guards": total_guards,
        "guards_without_client": {
            "count": len(guards_without_client),
            "guards": [format_guard(g) for g in guards_without_client[:50]]  # Limit to 50
        },
        "guards_without_certification": {
            "count": len(guards_without_certification),
            "guards": [format_guard(g) for g in guards_without_certification[:50]]
        },
        "guards_without_hourly_rate": {
            "count": len(guards_without_hourly_rate),
            "guards": [format_guard(g) for g in guards_without_hourly_rate[:50]]
        },
        "guards_with_expired_certs": {
            "count": len(guards_with_expired_certs),
            "guards": [format_guard(g) for g in guards_with_expired_certs[:50]]
        },
        "guards_with_expiring_certs": {
            "count": len(guards_with_expiring_certs),
            "guards": [format_guard(g) for g in guards_with_expiring_certs[:50]]
        }
    }


@router.get("/", response_model=List[EmployeeResponse])
async def get_employees(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all employees with optional status filter.

    Filtering:
    - Organization: Only employees in user's organization
    - Client Access: If user has managed_client_ids, only employees assigned to those clients
                     (or unassigned employees) are visible
    """
    org_id = _get_org_id_or_403(current_user)

    # Get accessible clients for client-level filtering
    accessible_clients = ClientFilterService.get_accessible_clients_for_user(db, current_user)

    employees = EmployeeService.get_all(
        db,
        skip=skip,
        limit=limit,
        status=status_filter,
        org_id=org_id,
        accessible_client_ids=accessible_clients
    )
    return employees


@router.get("/grade-stats")
async def get_grade_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return workforce breakdown by PSIRA grade (cert_level).
    Used for the Guard Grades overview page.
    """
    from app.models.default_hourly_rate import DefaultHourlyRate

    org_id = _get_org_id_or_403(current_user)
    today = date.today()

    # Fetch all active employees
    employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == EmployeeStatus.ACTIVE,
    ).all()

    # Fetch configured default rates
    default_rates = db.query(DefaultHourlyRate).filter(
        DefaultHourlyRate.org_id == org_id
    ).all()
    rates_by_grade: dict = {}
    for r in default_rates:
        rates_by_grade.setdefault(r.psira_grade, {})[r.role] = float(r.default_hourly_rate)

    GRADES = ["A", "B", "C", "D", "E"]
    grade_data: dict = {
        g: {
            "grade": g,
            "count": 0,
            "avg_actual_rate": None,
            "default_rates": rates_by_grade.get(g, {}),
            "expired_psira": 0,
            "expiring_soon": 0,  # within 30 days
            "no_psira_expiry": 0,
        }
        for g in GRADES
    }

    no_grade_count = 0
    total_active = len(employees)
    rate_sums: dict = {g: [] for g in GRADES}

    for emp in employees:
        grade = (emp.cert_level or "").strip().upper()
        if grade not in GRADES:
            no_grade_count += 1
            continue

        grade_data[grade]["count"] += 1

        if emp.hourly_rate and emp.hourly_rate > 0:
            rate_sums[grade].append(float(emp.hourly_rate))

        if emp.psira_expiry_date:
            days_until = (emp.psira_expiry_date - today).days
            if days_until < 0:
                grade_data[grade]["expired_psira"] += 1
            elif days_until <= 30:
                grade_data[grade]["expiring_soon"] += 1
        else:
            grade_data[grade]["no_psira_expiry"] += 1

    for g in GRADES:
        if rate_sums[g]:
            grade_data[g]["avg_actual_rate"] = round(sum(rate_sums[g]) / len(rate_sums[g]), 2)

    return {
        "grades": list(grade_data.values()),
        "no_grade_count": no_grade_count,
        "total_active": total_active,
        "has_default_rates": len(default_rates) > 0,
    }


@router.get("/hr-analytics")
async def get_hr_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Aggregated HR analytics dashboard data.

    Returns headcount breakdown, certification compliance, performance
    averages, disciplinary summary, leave utilisation, and turnover
    indicators in a single payload for the HR dashboard.
    """
    from app.models.performance import EmployeeEvaluation, DisciplinaryCase
    from app.models.leave import LeaveRequest
    from app.models.guard_restriction import GuardRestriction

    org_id = _get_org_id_or_403(current_user)
    today = date.today()
    year_start = date(today.year, 1, 1)

    # ── Headcount ───────────────────────────────────────────
    all_employees = db.query(Employee).filter(Employee.org_id == org_id).all()
    active = [e for e in all_employees if e.status == EmployeeStatus.ACTIVE]
    inactive = [e for e in all_employees if e.status != EmployeeStatus.ACTIVE]

    # Role breakdown
    role_counts: dict = {}
    for e in active:
        r = (e.role.value if e.role else "unknown").replace("_", " ").title()
        role_counts[r] = role_counts.get(r, 0) + 1

    # Grade breakdown
    grade_counts: dict = {}
    for e in active:
        g = (e.cert_level or "").strip().upper() or "Ungraded"
        grade_counts[g] = grade_counts.get(g, 0) + 1

    # ── Certification Compliance ────────────────────────────
    certs = (
        db.query(Certification)
        .join(Employee, Certification.employee_id == Employee.employee_id)
        .filter(Employee.org_id == org_id, Employee.status == EmployeeStatus.ACTIVE)
        .all()
    )
    certs_expired = sum(1 for c in certs if c.expiry_date and c.expiry_date < today)
    certs_expiring_30d = sum(
        1 for c in certs
        if c.expiry_date and today <= c.expiry_date <= today + timedelta(days=30)
    )
    certs_expiring_90d = sum(
        1 for c in certs
        if c.expiry_date and today <= c.expiry_date <= today + timedelta(days=90)
    )
    certs_valid = sum(
        1 for c in certs
        if c.expiry_date and c.expiry_date > today + timedelta(days=90)
    )

    # PSIRA compliance
    psira_expired = sum(
        1 for e in active
        if e.psira_expiry_date and e.psira_expiry_date < today
    )
    psira_expiring_30d = sum(
        1 for e in active
        if e.psira_expiry_date and today <= e.psira_expiry_date <= today + timedelta(days=30)
    )
    psira_no_date = sum(1 for e in active if not e.psira_expiry_date)

    # ── Performance Averages (this year) ────────────────────
    evals_this_year = (
        db.query(EmployeeEvaluation)
        .filter(
            EmployeeEvaluation.org_id == org_id,
            EmployeeEvaluation.evaluation_date >= year_start,
        )
        .all()
    )
    avg_overall = (
        round(sum(e.overall_score for e in evals_this_year) / len(evals_this_year), 1)
        if evals_this_year else None
    )
    eval_count = len(evals_this_year)

    # Score distribution
    score_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for ev in evals_this_year:
        if 1 <= ev.overall_score <= 5:
            score_dist[ev.overall_score] += 1

    # ── Disciplinary Summary (this year) ────────────────────
    cases_this_year = (
        db.query(DisciplinaryCase)
        .filter(
            DisciplinaryCase.org_id == org_id,
            DisciplinaryCase.incident_date >= year_start,
        )
        .all()
    )
    case_type_counts: dict = {}
    for c in cases_this_year:
        label = (c.case_type or "unknown").replace("_", " ").title()
        case_type_counts[label] = case_type_counts.get(label, 0) + 1

    # ── Leave Utilisation (this year) ────────────────────────
    leave_requests = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.org_id == org_id,
            LeaveRequest.start_date >= year_start,
            LeaveRequest.status == "approved",
        )
        .all()
    )
    leave_type_counts: dict = {}
    total_leave_days = 0
    for lr in leave_requests:
        lt = (lr.leave_type or "unknown").replace("_", " ").title()
        days = (lr.end_date - lr.start_date).days + 1 if lr.end_date and lr.start_date else 0
        leave_type_counts[lt] = leave_type_counts.get(lt, 0) + days
        total_leave_days += days

    # ── Guard Restrictions ──────────────────────────────────
    restriction_count = (
        db.query(func.count(GuardRestriction.restriction_id))
        .filter(GuardRestriction.org_id == org_id)
        .scalar() or 0
    )

    return {
        "as_of": today.isoformat(),
        "headcount": {
            "total": len(all_employees),
            "active": len(active),
            "inactive": len(inactive),
            "by_role": role_counts,
            "by_grade": grade_counts,
        },
        "certifications": {
            "total": len(certs),
            "expired": certs_expired,
            "expiring_30d": certs_expiring_30d,
            "expiring_90d": certs_expiring_90d,
            "valid": certs_valid,
            "psira_expired": psira_expired,
            "psira_expiring_30d": psira_expiring_30d,
            "psira_no_date": psira_no_date,
        },
        "performance": {
            "evaluations_ytd": eval_count,
            "avg_overall_score": avg_overall,
            "score_distribution": score_dist,
        },
        "disciplinary": {
            "cases_ytd": len(cases_this_year),
            "by_type": case_type_counts,
        },
        "leave": {
            "total_days_ytd": total_leave_days,
            "by_type": leave_type_counts,
        },
        "restrictions": {
            "active_count": restriction_count,
        },
    }


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get employee by ID (filtered by organization and client access)."""
    org_id = _get_org_id_or_403(current_user)
    employee = EmployeeService.get_by_id(db, employee_id, org_id=org_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )
    _check_employee_client_access(db, employee, current_user)
    return employee


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new employee (automatically assigned to user's organization)."""
    org_id = _get_org_id_or_403(current_user)

    # Check subscription limits (guard limit enforcement)
    from app.models.organization import Organization
    organization = db.query(Organization).filter(Organization.org_id == org_id).first()
    if organization:
        current_employee_count = db.query(Employee).filter(
            Employee.org_id == org_id,
            Employee.status == EmployeeStatus.ACTIVE
        ).count()

        # Check if adding a new employee would exceed the limit
        allowed, message = organization.check_limit('employees', current_employee_count)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Employee limit reached. {message}. Upgrade your subscription to add more guards."
            )

    # Check if ID number already exists in this organization
    existing = EmployeeService.get_by_id_number(db, employee_data.id_number, org_id=org_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee with ID number {employee_data.id_number} already exists"
        )

    # Set org_id from current user if not provided
    if employee_data.org_id is None:
        employee_data.org_id = org_id

    employee = EmployeeService.create(db, employee_data)
    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update employee (filtered by organization and client access)."""
    org_id = _get_org_id_or_403(current_user)
    # First check if employee exists and user has access
    existing_employee = EmployeeService.get_by_id(db, employee_id, org_id=org_id)
    if not existing_employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )
    _check_employee_client_access(db, existing_employee, current_user)

    employee = EmployeeService.update(db, employee_id, employee_data, org_id=org_id)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete employee (filtered by organization and client access)."""
    org_id = _get_org_id_or_403(current_user)
    # First check if employee exists and user has access
    existing_employee = EmployeeService.get_by_id(db, employee_id, org_id=org_id)
    if not existing_employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )
    _check_employee_client_access(db, existing_employee, current_user)

    EmployeeService.delete(db, employee_id, org_id=org_id)
    return None


@router.post("/import-excel")
async def import_employees_from_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import employees from Excel file.

    Upload an Excel file (.xlsx) with employee data to bulk import.

    Required columns: first_name, last_name, id_number
    Optional columns: email, phone, role (armed/unarmed), psira_number, hourly_rate,
                     home_address, emergency_contact, emergency_phone

    Returns detailed import results with success/error counts.
    """
    # Verify file is Excel
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an Excel file (.xlsx or .xls)"
        )

    # Read file content
    content = await file.read()

    # Import employees
    org_id = _get_org_id_or_403(current_user)
    result = ExcelImportService.import_employees(
        db=db,
        file_content=content,
        organization_id=org_id
    )

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@router.get("/download-template")
async def download_employee_template():
    """
    Download Excel template for employee import.

    Returns an Excel file with sample data and correct column headers.
    """
    template_bytes = ExcelImportService.generate_employee_template()

    return Response(
        content=template_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=employee_import_template.xlsx"
        }
    )


@router.get("/{employee_id}/shifts", response_model=List[dict])
async def get_employee_shifts(
    employee_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all shift assignments for an employee.
    Returns shifts with assignment details.
    Filtered by organization and client access.
    """
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.shift import Shift

    org_id = _get_org_id_or_403(current_user)

    # Verify employee exists in user's organization
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id,
        Employee.org_id == org_id
    ).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    # Check client-level access
    _check_employee_client_access(db, employee, current_user)
    
    # Build query
    query = db.query(ShiftAssignment).join(Shift).filter(
        ShiftAssignment.employee_id == employee_id
    )
    
    # Apply filters
    if status_filter:
        query = query.filter(ShiftAssignment.status == status_filter)
    
    if start_date:
        query = query.filter(Shift.start_time >= start_date)
    
    if end_date:
        query = query.filter(Shift.end_time <= end_date)
    
    assignments = query.order_by(Shift.start_time).all()
    
    # Return assignments with shift details
    result = []
    for assignment in assignments:
        result.append({
            "assignment_id": assignment.assignment_id,
            "shift_id": assignment.shift_id,
            "shift": {
                "shift_id": assignment.shift.shift_id,
                "site_id": assignment.shift.site_id,
                "start_time": assignment.shift.start_time.isoformat(),
                "end_time": assignment.shift.end_time.isoformat(),
                "status": assignment.shift.status.value,
            },
            "status": assignment.status,
            "assigned_at": assignment.assigned_at.isoformat(),
            "total_cost": assignment.total_cost,
            "is_confirmed": assignment.is_confirmed
        })

    return result


# =============================================================================
# SHIFT PATTERN ASSIGNMENT ENDPOINTS
# =============================================================================

class PatternAssignmentRequest(BaseModel):
    """Request body for assigning a shift pattern to an employee."""
    pattern_id: int
    rotation_group: str  # A, B, C, D
    pattern_start_date: date
    generate_until: date


class PatternPreviewRequest(BaseModel):
    """Request body for previewing a pattern schedule."""
    pattern_id: int
    rotation_group: str
    start_date: date
    num_days: int = 28


@router.patch("/{employee_id}/assign-pattern")
async def assign_shift_pattern(
    employee_id: int,
    request: PatternAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assign a shift pattern to an employee with a rotation group.

    This will:
    1. Update the employee's pattern assignment fields
    2. Generate availability records based on the pattern

    Rotation Groups:
    - A: Starts with day shifts
    - B: Starts with off (then night)
    - C: Starts with night shifts
    - D: Starts with off (then day)

    For a 4-on-4-off pattern, you need 4 guards (one per group) for 24/7 coverage.
    """
    from app.models.shift_pattern_template import ShiftPatternTemplate
    from app.services.pattern_availability_service import PatternAvailabilityService

    org_id = _get_org_id_or_403(current_user)

    # Validate rotation group
    if request.rotation_group.upper() not in ['A', 'B', 'C', 'D']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rotation group must be A, B, C, or D"
        )

    # Get employee
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id,
        Employee.org_id == org_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    # Get pattern
    pattern = db.query(ShiftPatternTemplate).filter(
        ShiftPatternTemplate.template_id == request.pattern_id,
        ShiftPatternTemplate.org_id == org_id
    ).first()

    if not pattern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift pattern with ID {request.pattern_id} not found"
        )

    # Update employee's pattern assignment
    employee.shift_pattern_id = request.pattern_id
    employee.rotation_group = request.rotation_group.upper()
    employee.pattern_start_date = request.pattern_start_date

    # Generate availability records
    today = date.today()
    start_date = max(today, request.pattern_start_date)

    availability_records = PatternAvailabilityService.generate_availability_for_employee(
        db=db,
        employee_id=employee_id,
        pattern=pattern,
        rotation_group=request.rotation_group.upper(),
        pattern_start_date=request.pattern_start_date,
        start_date=start_date,
        end_date=request.generate_until,
        clear_existing=True
    )

    db.commit()

    return {
        "message": f"Pattern assigned successfully",
        "employee_id": employee_id,
        "pattern_id": request.pattern_id,
        "pattern_name": pattern.name,
        "rotation_group": request.rotation_group.upper(),
        "pattern_start_date": request.pattern_start_date.isoformat(),
        "availability_generated": {
            "from": start_date.isoformat(),
            "to": request.generate_until.isoformat(),
            "days_count": len(availability_records)
        }
    }


@router.post("/{employee_id}/regenerate-availability")
async def regenerate_pattern_availability(
    employee_id: int,
    start_date: date = Query(..., description="Start date for regeneration"),
    end_date: date = Query(..., description="End date for regeneration"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Regenerate availability records for an employee based on their assigned pattern.

    Use this when:
    - Extending availability into the future
    - Pattern start date has changed
    - Correcting availability after manual edits
    """
    from app.models.shift_pattern_template import ShiftPatternTemplate
    from app.services.pattern_availability_service import PatternAvailabilityService

    org_id = _get_org_id_or_403(current_user)

    # Get employee
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id,
        Employee.org_id == org_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    if not employee.shift_pattern_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee has no shift pattern assigned"
        )

    # Get pattern
    pattern = db.query(ShiftPatternTemplate).filter(
        ShiftPatternTemplate.template_id == employee.shift_pattern_id
    ).first()

    if not pattern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned shift pattern not found"
        )

    # Regenerate availability
    availability_records = PatternAvailabilityService.generate_availability_for_employee(
        db=db,
        employee_id=employee_id,
        pattern=pattern,
        rotation_group=employee.rotation_group,
        pattern_start_date=employee.pattern_start_date,
        start_date=start_date,
        end_date=end_date,
        clear_existing=True
    )

    return {
        "message": "Availability regenerated successfully",
        "employee_id": employee_id,
        "pattern_name": pattern.name,
        "rotation_group": employee.rotation_group,
        "availability_generated": {
            "from": start_date.isoformat(),
            "to": end_date.isoformat(),
            "days_count": len(availability_records)
        }
    }


@router.get("/{employee_id}/pattern-schedule")
async def get_employee_pattern_schedule(
    employee_id: int,
    start_date: Optional[date] = None,
    num_days: int = Query(default=28, le=90, description="Number of days to show (max 90)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a preview of the employee's schedule based on their pattern assignment.

    Returns a day-by-day breakdown of their rotation showing:
    - Which days they work
    - Whether it's a day or night shift
    - Shift times
    """
    from app.models.shift_pattern_template import ShiftPatternTemplate
    from app.services.pattern_availability_service import PatternAvailabilityService

    org_id = _get_org_id_or_403(current_user)

    # Get employee
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id,
        Employee.org_id == org_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    if not employee.shift_pattern_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee has no shift pattern assigned"
        )

    # Get pattern
    pattern = db.query(ShiftPatternTemplate).filter(
        ShiftPatternTemplate.template_id == employee.shift_pattern_id
    ).first()

    if not pattern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned shift pattern not found"
        )

    # Generate preview
    preview_start = start_date or date.today()
    schedule = PatternAvailabilityService.preview_schedule(
        pattern=pattern,
        rotation_group=employee.rotation_group,
        pattern_start_date=employee.pattern_start_date,
        num_days=num_days
    )

    # Adjust dates to start from requested start_date
    if start_date and start_date != employee.pattern_start_date:
        schedule = []
        current = start_date
        for i in range(num_days):
            is_working, shift_type, shift_start, shift_end = PatternAvailabilityService.get_shift_for_date(
                pattern, employee.rotation_group, current, employee.pattern_start_date
            )
            schedule.append({
                'date': current.isoformat(),
                'is_working': is_working,
                'shift_type': shift_type,
                'start_time': shift_start.isoformat() if shift_start else None,
                'end_time': shift_end.isoformat() if shift_end else None,
                'cycle_position': PatternAvailabilityService.calculate_cycle_position(
                    pattern, employee.rotation_group, current, employee.pattern_start_date
                )
            })
            current += timedelta(days=1)

    return {
        "employee_id": employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "pattern": {
            "id": pattern.template_id,
            "name": pattern.name,
            "cycle_length": pattern.cycle_length_days,
            "type": pattern.pattern_type.value
        },
        "rotation_group": employee.rotation_group,
        "pattern_start_date": employee.pattern_start_date.isoformat(),
        "schedule": schedule
    }


@router.delete("/{employee_id}/pattern-assignment")
async def remove_pattern_assignment(
    employee_id: int,
    clear_availability: bool = Query(default=False, description="Also clear generated availability"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove the shift pattern assignment from an employee.

    Optionally clears the auto-generated availability records.
    """
    from app.models.availability import Availability

    org_id = _get_org_id_or_403(current_user)

    # Get employee
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id,
        Employee.org_id == org_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    # Clear pattern assignment
    employee.shift_pattern_id = None
    employee.rotation_group = None
    employee.pattern_start_date = None

    # Optionally clear availability
    cleared_count = 0
    if clear_availability:
        cleared_count = db.query(Availability).filter(
            Availability.employee_id == employee_id,
            Availability.date >= date.today()
        ).delete()

    db.commit()

    return {
        "message": "Pattern assignment removed",
        "employee_id": employee_id,
        "availability_cleared": cleared_count if clear_availability else "not requested"
    }


# =============================================================================
# PERFORMANCE EVALUATIONS
# =============================================================================

class EvaluationCreate(BaseModel):
    evaluation_date: date
    overall_score: int  # 1–5
    punctuality_score: Optional[int] = None
    conduct_score: Optional[int] = None
    performance_score: Optional[int] = None
    appearance_score: Optional[int] = None
    communication_score: Optional[int] = None
    notes: Optional[str] = None


@router.get("/{employee_id}/evaluations")
async def list_evaluations(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all performance evaluations for an employee."""
    from app.models.performance import EmployeeEvaluation

    org_id = _get_org_id_or_403(current_user)
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id, Employee.org_id == org_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    evals = (
        db.query(EmployeeEvaluation)
        .filter(
            EmployeeEvaluation.employee_id == employee_id,
            EmployeeEvaluation.org_id == org_id,
        )
        .order_by(EmployeeEvaluation.evaluation_date.desc())
        .all()
    )
    return [e.to_dict() for e in evals]


@router.post("/{employee_id}/evaluations", status_code=201)
async def create_evaluation(
    employee_id: int,
    payload: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new performance evaluation for an employee."""
    from app.models.performance import EmployeeEvaluation

    org_id = _get_org_id_or_403(current_user)
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id, Employee.org_id == org_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not (1 <= payload.overall_score <= 5):
        raise HTTPException(status_code=400, detail="overall_score must be between 1 and 5")

    ev = EmployeeEvaluation(
        org_id=org_id,
        employee_id=employee_id,
        evaluation_date=payload.evaluation_date,
        evaluator_id=current_user.user_id,
        evaluator_name=f"{getattr(current_user, 'first_name', '')} {getattr(current_user, 'last_name', '')}".strip() or current_user.email,
        overall_score=payload.overall_score,
        punctuality_score=payload.punctuality_score,
        conduct_score=payload.conduct_score,
        performance_score=payload.performance_score,
        appearance_score=payload.appearance_score,
        communication_score=payload.communication_score,
        notes=payload.notes,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev.to_dict()


@router.delete("/{employee_id}/evaluations/{evaluation_id}", status_code=204)
async def delete_evaluation(
    employee_id: int,
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a performance evaluation."""
    from app.models.performance import EmployeeEvaluation

    org_id = _get_org_id_or_403(current_user)
    ev = db.query(EmployeeEvaluation).filter(
        EmployeeEvaluation.evaluation_id == evaluation_id,
        EmployeeEvaluation.employee_id == employee_id,
        EmployeeEvaluation.org_id == org_id,
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    db.delete(ev)
    db.commit()
    return None


# =============================================================================
# DISCIPLINARY CASES
# =============================================================================

VALID_CASE_TYPES = {
    "verbal_warning", "written_warning", "final_warning", "suspension", "dismissal"
}


class DisciplinaryCaseCreate(BaseModel):
    incident_date: date
    case_type: str  # verbal_warning | written_warning | final_warning | suspension | dismissal
    reason: str
    outcome: Optional[str] = None


@router.get("/{employee_id}/disciplinary")
async def list_disciplinary(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all disciplinary cases for an employee."""
    from app.models.performance import DisciplinaryCase

    org_id = _get_org_id_or_403(current_user)
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id, Employee.org_id == org_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    cases = (
        db.query(DisciplinaryCase)
        .filter(
            DisciplinaryCase.employee_id == employee_id,
            DisciplinaryCase.org_id == org_id,
        )
        .order_by(DisciplinaryCase.incident_date.desc())
        .all()
    )
    return [c.to_dict() for c in cases]


@router.post("/{employee_id}/disciplinary", status_code=201)
async def create_disciplinary(
    employee_id: int,
    payload: DisciplinaryCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new disciplinary case for an employee."""
    from app.models.performance import DisciplinaryCase

    org_id = _get_org_id_or_403(current_user)
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id, Employee.org_id == org_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if payload.case_type not in VALID_CASE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"case_type must be one of: {', '.join(sorted(VALID_CASE_TYPES))}"
        )

    issuer_name = (
        f"{getattr(current_user, 'first_name', '')} {getattr(current_user, 'last_name', '')}".strip()
        or current_user.email
    )

    dc = DisciplinaryCase(
        org_id=org_id,
        employee_id=employee_id,
        incident_date=payload.incident_date,
        case_type=payload.case_type,
        reason=payload.reason,
        outcome=payload.outcome,
        issued_by_id=current_user.user_id,
        issued_by_name=issuer_name,
    )
    db.add(dc)
    db.commit()
    db.refresh(dc)
    return dc.to_dict()


@router.delete("/{employee_id}/disciplinary/{case_id}", status_code=204)
async def delete_disciplinary(
    employee_id: int,
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a disciplinary case."""
    from app.models.performance import DisciplinaryCase

    org_id = _get_org_id_or_403(current_user)
    dc = db.query(DisciplinaryCase).filter(
        DisciplinaryCase.case_id == case_id,
        DisciplinaryCase.employee_id == employee_id,
        DisciplinaryCase.org_id == org_id,
    ).first()
    if not dc:
        raise HTTPException(status_code=404, detail="Disciplinary case not found")
    db.delete(dc)
    db.commit()
    return None
