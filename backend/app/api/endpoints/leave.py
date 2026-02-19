"""Leave management API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, Field

from app.database import get_db
from app.auth.security import get_current_org_id, get_current_user
from app.models.leave import LeaveRequest, LeaveBalance, LeaveType, LeaveStatus, BCEA_LEAVE_ENTITLEMENTS
from app.models.employee import Employee
from app.models.user import User


router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class LeaveRequestCreate(BaseModel):
    """Schema for creating a leave request."""
    employee_id: int
    leave_type: str  # Using string to match DB VARCHAR
    start_date: date
    end_date: date
    reason: Optional[str] = None


class LeaveRequestUpdate(BaseModel):
    """Schema for updating a leave request."""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None


class LeaveApprovalRequest(BaseModel):
    """Schema for approving/rejecting leave."""
    rejection_reason: Optional[str] = None


class LeaveRequestResponse(BaseModel):
    """Schema for leave request response."""
    leave_id: int  # Maps to request_id in DB
    org_id: int
    employee_id: int
    employee_name: Optional[str] = None
    leave_type: str  # DB uses VARCHAR
    start_date: date
    end_date: date
    total_days: Optional[float] = None  # Maps to days_requested in DB
    reason: Optional[str] = None
    status: str  # DB uses VARCHAR
    reviewed_by: Optional[int] = None  # Maps to approved_by in DB
    reviewed_at: Optional[datetime] = None  # Maps to approval_date in DB
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SingleLeaveBalanceResponse(BaseModel):
    """Schema for a single leave type balance."""
    balance_id: int
    employee_id: int
    leave_type: str
    entitled_days: float
    used_days: float
    pending_days: float
    remaining: float
    cycle_start: Optional[date] = None
    cycle_end: Optional[date] = None

    class Config:
        from_attributes = True


class LeaveBalanceResponse(BaseModel):
    """Schema for aggregated leave balance response (for backward compatibility)."""
    employee_id: int
    year: int
    annual_entitlement: float = 15
    annual_used: float = 0
    annual_pending: float = 0
    annual_remaining: float = 15
    sick_entitlement: float = 30
    sick_used: float = 0
    sick_remaining: float = 30
    family_entitlement: float = 3
    family_used: float = 0
    family_remaining: float = 3
    study_entitlement: float = 0
    study_used: float = 0

    class Config:
        from_attributes = True


class LeaveEntitlementInfo(BaseModel):
    """Schema for BCEA leave entitlement info."""
    leave_type: str
    days: int
    description: str


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def calculate_working_days(start_date: date, end_date: date) -> int:
    """Calculate working days between two dates (excluding weekends)."""
    days = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:  # Monday = 0, Friday = 4
            days += 1
        current = date.fromordinal(current.toordinal() + 1)
    return days


def get_or_create_balance(db: Session, employee_id: int, leave_type: str) -> LeaveBalance:
    """Get or create a leave balance for an employee and leave type.

    The leave_balances table uses one record per (employee, leave_type) with cycle tracking.
    Tenancy is enforced via employee relationship.
    """
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.leave_type == leave_type.lower()
    ).first()

    if not balance:
        # Set default entitlements based on leave type (BCEA minimums)
        defaults = {
            "annual": 15,
            "sick": 30,
            "family_responsibility": 3,
            "maternity": 120,
            "parental": 10,
            "study": 0,
            "unpaid": 0,
            "compassionate": 0,
            # Non-productive time exceptions — no fixed entitlement cap
            "iod": 0,
            "training": 0,
            "suspension": 0,
        }
        entitled = defaults.get(leave_type.lower(), 0)

        # Set cycle dates
        today = date.today()
        if leave_type.lower() == "sick":
            # Sick leave: 36-month cycle starting from hire date or today
            cycle_start = today
            cycle_end = date(today.year + 3, today.month, today.day)
        else:
            # Annual and other types: calendar year
            cycle_start = date(today.year, 1, 1)
            cycle_end = date(today.year, 12, 31)

        balance = LeaveBalance(
            employee_id=employee_id,
            leave_type=leave_type.lower(),
            cycle_start=cycle_start,
            cycle_end=cycle_end,
            entitled_days=entitled,
            used_days=0,
            pending_days=0
        )
        db.add(balance)
        db.commit()
        db.refresh(balance)

    return balance


# =============================================================================
# LEAVE REQUEST ENDPOINTS
# =============================================================================

# Non-productive time types — used for exception tracking (IOD, training, suspension)
NON_PRODUCTIVE_TYPES = {"iod", "training", "suspension"}


@router.get("/non-productive-summary")
async def get_non_productive_summary(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Return a summary of employees currently on non-productive time (IOD, training, suspension).

    An employee is counted if they have an APPROVED request of that type whose
    date range includes today.
    """
    today = date.today()
    result = {}

    for np_type in NON_PRODUCTIVE_TYPES:
        rows = (
            db.query(LeaveRequest, Employee)
            .join(Employee, LeaveRequest.employee_id == Employee.employee_id)
            .filter(
                LeaveRequest.org_id == org_id,
                LeaveRequest.leave_type == np_type,
                LeaveRequest.status == "approved",
                LeaveRequest.start_date <= today,
                LeaveRequest.end_date >= today,
            )
            .all()
        )
        result[np_type] = [
            {
                "employee_id": emp.employee_id,
                "employee_name": f"{emp.first_name} {emp.last_name}",
                "start_date": req.start_date.isoformat(),
                "end_date": req.end_date.isoformat(),
                "reason": req.reason,
            }
            for req, emp in rows
        ]

    return {
        "date": today.isoformat(),
        "iod": result["iod"],
        "training": result["training"],
        "suspension": result["suspension"],
        "total_non_productive": sum(len(v) for v in result.values()),
    }


@router.get("/requests", response_model=List[LeaveRequestResponse])
async def list_leave_requests(
    status_filter: Optional[str] = Query(default=None, description="Filter by status"),
    employee_id: Optional[int] = Query(default=None, description="Filter by employee"),
    leave_type: Optional[str] = Query(default=None, description="Filter by leave type"),
    from_date: Optional[date] = Query(default=None, description="Filter from date"),
    to_date: Optional[date] = Query(default=None, description="Filter to date"),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    List all leave requests for the organization.

    Supports filtering by status, employee, leave type, and date range.
    """
    query = db.query(LeaveRequest).filter(LeaveRequest.org_id == org_id)

    if status_filter:
        query = query.filter(LeaveRequest.status == status_filter)
    if employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    if leave_type:
        query = query.filter(LeaveRequest.leave_type == leave_type)
    if from_date:
        query = query.filter(LeaveRequest.start_date >= from_date)
    if to_date:
        query = query.filter(LeaveRequest.end_date <= to_date)

    requests = query.order_by(LeaveRequest.created_at.desc()).all()

    # Add employee names
    result = []
    for req in requests:
        employee = db.query(Employee).filter(Employee.employee_id == req.employee_id).first()
        response = LeaveRequestResponse(
            leave_id=req.request_id,  # Map request_id to leave_id
            org_id=req.org_id,
            employee_id=req.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}" if employee else None,
            leave_type=req.leave_type,
            start_date=req.start_date,
            end_date=req.end_date,
            total_days=float(req.days_requested) if req.days_requested else None,
            reason=req.reason,
            status=req.status,
            reviewed_by=req.approved_by,
            reviewed_at=req.approval_date,
            rejection_reason=req.rejection_reason,
            created_at=req.created_at
        )
        result.append(response)

    return result


@router.post("/requests", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_leave_request(
    request_data: LeaveRequestCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a leave request on behalf of an employee.

    This is for admin-created leave requests. Guards do not have portal access.
    Validates that the employee exists and has sufficient leave balance.
    """
    # Verify employee exists and belongs to org
    employee = db.query(Employee).filter(
        Employee.employee_id == request_data.employee_id,
        Employee.org_id == org_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate dates
    if request_data.end_date < request_data.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    # Calculate working days
    total_days = calculate_working_days(request_data.start_date, request_data.end_date)

    if total_days <= 0:
        raise HTTPException(status_code=400, detail="Leave period must include at least one working day")

    # Check leave balance for the specific leave type
    leave_type_lower = request_data.leave_type.lower()
    balance = get_or_create_balance(db, request_data.employee_id, leave_type_lower)

    # Validate sufficient balance (skip for types with no fixed entitlement)
    _NO_BALANCE_CHECK = {"unpaid", "iod", "training", "suspension"}
    if leave_type_lower not in _NO_BALANCE_CHECK and total_days > balance.remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient {leave_type_lower.replace('_', ' ')} leave. Available: {balance.remaining} days, Requested: {total_days} days"
        )

    # Create leave request (using new column names)
    leave_request = LeaveRequest(
        org_id=org_id,
        employee_id=request_data.employee_id,
        leave_type=request_data.leave_type,
        start_date=request_data.start_date,
        end_date=request_data.end_date,
        days_requested=total_days,
        reason=request_data.reason,
        status="pending"
    )

    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)

    return LeaveRequestResponse(
        leave_id=leave_request.request_id,
        org_id=leave_request.org_id,
        employee_id=leave_request.employee_id,
        employee_name=f"{employee.first_name} {employee.last_name}",
        leave_type=leave_request.leave_type,
        start_date=leave_request.start_date,
        end_date=leave_request.end_date,
        total_days=float(leave_request.days_requested) if leave_request.days_requested else None,
        reason=leave_request.reason,
        status=leave_request.status,
        reviewed_by=leave_request.approved_by,
        reviewed_at=leave_request.approval_date,
        rejection_reason=leave_request.rejection_reason,
        created_at=leave_request.created_at
    )


@router.get("/requests/{leave_id}", response_model=LeaveRequestResponse)
async def get_leave_request(
    leave_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get a specific leave request by ID."""
    leave_request = db.query(LeaveRequest).filter(
        LeaveRequest.request_id == leave_id,
        LeaveRequest.org_id == org_id
    ).first()

    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")

    employee = db.query(Employee).filter(Employee.employee_id == leave_request.employee_id).first()

    return LeaveRequestResponse(
        leave_id=leave_request.request_id,
        org_id=leave_request.org_id,
        employee_id=leave_request.employee_id,
        employee_name=f"{employee.first_name} {employee.last_name}" if employee else None,
        leave_type=leave_request.leave_type,
        start_date=leave_request.start_date,
        end_date=leave_request.end_date,
        total_days=float(leave_request.days_requested) if leave_request.days_requested else None,
        reason=leave_request.reason,
        status=leave_request.status,
        reviewed_by=leave_request.approved_by,
        reviewed_at=leave_request.approval_date,
        rejection_reason=leave_request.rejection_reason,
        created_at=leave_request.created_at
    )


@router.patch("/requests/{leave_id}/approve", response_model=LeaveRequestResponse)
async def approve_leave_request(
    leave_id: int,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve a pending leave request.

    Updates the leave balance to deduct the approved days.
    """
    leave_request = db.query(LeaveRequest).filter(
        LeaveRequest.request_id == leave_id,
        LeaveRequest.org_id == org_id
    ).first()

    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave_request.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve request with status: {leave_request.status}")

    # Update balance for the specific leave type
    leave_type_lower = leave_request.leave_type.lower() if leave_request.leave_type else "annual"
    balance = get_or_create_balance(db, leave_request.employee_id, leave_type_lower)
    days = float(leave_request.days_requested) if leave_request.days_requested else 0

    # Add to used days for this leave type
    balance.used_days = float(balance.used_days or 0) + days

    # Update request status
    leave_request.status = "approved"
    leave_request.approved_by = current_user.user_id
    leave_request.approval_date = datetime.utcnow()

    db.commit()
    db.refresh(leave_request)

    from app.services.push_service import PushService
    PushService(db).notify_leave_approved(leave_request.employee_id, leave_request, org_id)

    employee = db.query(Employee).filter(Employee.employee_id == leave_request.employee_id).first()

    return LeaveRequestResponse(
        leave_id=leave_request.request_id,
        org_id=leave_request.org_id,
        employee_id=leave_request.employee_id,
        employee_name=f"{employee.first_name} {employee.last_name}" if employee else None,
        leave_type=leave_request.leave_type,
        start_date=leave_request.start_date,
        end_date=leave_request.end_date,
        total_days=float(leave_request.days_requested) if leave_request.days_requested else None,
        reason=leave_request.reason,
        status=leave_request.status,
        reviewed_by=leave_request.approved_by,
        reviewed_at=leave_request.approval_date,
        rejection_reason=leave_request.rejection_reason,
        created_at=leave_request.created_at
    )


@router.patch("/requests/{leave_id}/reject", response_model=LeaveRequestResponse)
async def reject_leave_request(
    leave_id: int,
    approval_data: LeaveApprovalRequest,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a pending leave request."""
    leave_request = db.query(LeaveRequest).filter(
        LeaveRequest.request_id == leave_id,
        LeaveRequest.org_id == org_id
    ).first()

    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave_request.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject request with status: {leave_request.status}")

    leave_request.status = "rejected"
    leave_request.approved_by = current_user.user_id
    leave_request.approval_date = datetime.utcnow()
    leave_request.rejection_reason = approval_data.rejection_reason

    db.commit()
    db.refresh(leave_request)

    from app.services.push_service import PushService
    PushService(db).notify_leave_rejected(leave_request.employee_id, leave_request, org_id)

    employee = db.query(Employee).filter(Employee.employee_id == leave_request.employee_id).first()

    return LeaveRequestResponse(
        leave_id=leave_request.request_id,
        org_id=leave_request.org_id,
        employee_id=leave_request.employee_id,
        employee_name=f"{employee.first_name} {employee.last_name}" if employee else None,
        leave_type=leave_request.leave_type,
        start_date=leave_request.start_date,
        end_date=leave_request.end_date,
        total_days=float(leave_request.days_requested) if leave_request.days_requested else None,
        reason=leave_request.reason,
        status=leave_request.status,
        reviewed_by=leave_request.approved_by,
        reviewed_at=leave_request.approval_date,
        rejection_reason=leave_request.rejection_reason,
        created_at=leave_request.created_at
    )


@router.delete("/requests/{leave_id}")
async def cancel_leave_request(
    leave_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Cancel a leave request.

    Can only cancel pending requests. Approved requests must be reverted manually.
    """
    leave_request = db.query(LeaveRequest).filter(
        LeaveRequest.request_id == leave_id,
        LeaveRequest.org_id == org_id
    ).first()

    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave_request.status == "approved":
        # Refund the balance for the specific leave type
        leave_type_lower = leave_request.leave_type.lower() if leave_request.leave_type else "annual"
        balance = get_or_create_balance(db, leave_request.employee_id, leave_type_lower)
        days = float(leave_request.days_requested) if leave_request.days_requested else 0

        # Subtract from used days
        balance.used_days = max(0, float(balance.used_days or 0) - days)

    leave_request.status = "cancelled"
    db.commit()

    return {"message": "Leave request cancelled successfully"}


# =============================================================================
# LEAVE BALANCE ENDPOINTS
# =============================================================================

@router.get("/balances/{employee_id}", response_model=LeaveBalanceResponse)
async def get_employee_balance(
    employee_id: int,
    year: Optional[int] = Query(default=None, description="Year (defaults to current)"),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get leave balance for a specific employee."""
    if year is None:
        year = date.today().year

    # Verify employee belongs to org
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id,
        Employee.org_id == org_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Query all balance records for this employee
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id
    ).all()

    # Build aggregated response with defaults for BCEA minimums
    response_data = {
        "employee_id": employee_id,
        "year": year,
        "annual_entitlement": 15, "annual_used": 0, "annual_pending": 0, "annual_remaining": 15,
        "sick_entitlement": 30, "sick_used": 0, "sick_remaining": 30,
        "family_entitlement": 3, "family_used": 0, "family_remaining": 3,
        "study_entitlement": 0, "study_used": 0
    }

    # Update from actual balance records
    for bal in balances:
        lt = bal.leave_type.lower() if bal.leave_type else ""
        entitled = float(bal.entitled_days or 0)
        used = float(bal.used_days or 0)
        pending = float(bal.pending_days or 0)
        remaining = entitled - used - pending

        if lt == "annual":
            response_data.update({"annual_entitlement": entitled, "annual_used": used, "annual_pending": pending, "annual_remaining": remaining})
        elif lt == "sick":
            response_data.update({"sick_entitlement": entitled, "sick_used": used, "sick_remaining": remaining})
        elif lt == "family_responsibility":
            response_data.update({"family_entitlement": entitled, "family_used": used, "family_remaining": remaining})
        elif lt == "study":
            response_data.update({"study_entitlement": entitled, "study_used": used})

    return LeaveBalanceResponse(**response_data)


@router.patch("/balances/{employee_id}")
async def update_employee_balance(
    employee_id: int,
    annual_entitlement: Optional[float] = Query(default=None),
    sick_entitlement: Optional[float] = Query(default=None),
    family_entitlement: Optional[float] = Query(default=None),
    study_entitlement: Optional[float] = Query(default=None),
    year: Optional[int] = Query(default=None),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Update leave entitlements for an employee.

    Used when an employee's contract provides more than BCEA minimums.
    """
    # Update each leave type's balance record
    if annual_entitlement is not None:
        balance = get_or_create_balance(db, employee_id, "annual")
        balance.entitled_days = annual_entitlement

    if sick_entitlement is not None:
        balance = get_or_create_balance(db, employee_id, "sick")
        balance.entitled_days = sick_entitlement

    if family_entitlement is not None:
        balance = get_or_create_balance(db, employee_id, "family_responsibility")
        balance.entitled_days = family_entitlement

    if study_entitlement is not None:
        balance = get_or_create_balance(db, employee_id, "study")
        balance.entitled_days = study_entitlement

    db.commit()

    return {"message": "Leave balance updated successfully"}


# =============================================================================
# REFERENCE ENDPOINTS
# =============================================================================

@router.get("/entitlements", response_model=List[LeaveEntitlementInfo])
async def get_bcea_entitlements():
    """
    Get BCEA minimum leave entitlements reference.

    Returns information about statutory leave requirements in South Africa.
    """
    return [
        LeaveEntitlementInfo(
            leave_type=lt.value,
            days=info["days"],
            description=info["description"]
        )
        for lt, info in BCEA_LEAVE_ENTITLEMENTS.items()
    ]


# =============================================================================
# MOBILE ENDPOINTS  (guard self-service — no employee_id required)
# =============================================================================

class MobileLeaveCreate(BaseModel):
    """Schema for guard self-service leave creation (no employee_id required)."""
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None


@router.get("/my-requests", response_model=List[LeaveRequestResponse])
async def get_my_leave_requests(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Return the logged-in guard's own leave requests.

    Resolves the employee record from the authenticated user's email
    so the mobile client does not need to pass an employee_id.
    """
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employee record found for this user account.",
        )

    requests = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.employee_id == employee.employee_id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )

    return [
        LeaveRequestResponse(
            leave_id=r.request_id,
            org_id=r.org_id,
            employee_id=r.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}",
            leave_type=r.leave_type,
            start_date=r.start_date,
            end_date=r.end_date,
            total_days=float(r.days_requested) if r.days_requested else None,
            reason=r.reason,
            status=r.status,
            reviewed_by=r.approved_by,
            reviewed_at=r.approval_date,
            rejection_reason=r.rejection_reason,
            created_at=r.created_at,
        )
        for r in requests
    ]


@router.post("/", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
async def mobile_create_leave_request(
    request_data: MobileLeaveCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Create a leave request from the mobile app.

    The employee record is resolved automatically from the authenticated user's
    email, so guards do not need to know their own employee_id.
    """
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employee record found for this user account.",
        )

    if request_data.end_date < request_data.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    total_days = calculate_working_days(request_data.start_date, request_data.end_date)

    if total_days <= 0:
        raise HTTPException(status_code=400, detail="Leave period must include at least one working day")

    leave_type_lower = request_data.leave_type.lower()
    balance = get_or_create_balance(db, employee.employee_id, leave_type_lower)

    _NO_BALANCE_CHECK = {"unpaid", "iod", "training", "suspension"}
    if leave_type_lower not in _NO_BALANCE_CHECK and total_days > balance.remaining:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient {leave_type_lower.replace('_', ' ')} leave. "
                f"Available: {balance.remaining} days, Requested: {total_days} days"
            ),
        )

    leave_request = LeaveRequest(
        org_id=org_id,
        employee_id=employee.employee_id,
        leave_type=request_data.leave_type,
        start_date=request_data.start_date,
        end_date=request_data.end_date,
        days_requested=total_days,
        reason=request_data.reason,
        status="pending",
    )

    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)

    return LeaveRequestResponse(
        leave_id=leave_request.request_id,
        org_id=leave_request.org_id,
        employee_id=leave_request.employee_id,
        employee_name=f"{employee.first_name} {employee.last_name}",
        leave_type=leave_request.leave_type,
        start_date=leave_request.start_date,
        end_date=leave_request.end_date,
        total_days=float(leave_request.days_requested) if leave_request.days_requested else None,
        reason=leave_request.reason,
        status=leave_request.status,
        reviewed_by=leave_request.approved_by,
        reviewed_at=leave_request.approval_date,
        rejection_reason=leave_request.rejection_reason,
        created_at=leave_request.created_at,
    )
