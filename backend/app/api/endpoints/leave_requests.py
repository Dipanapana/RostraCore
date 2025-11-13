"""Leave request management endpoints for employee self-service."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.leave_request import LeaveRequest, LeaveType, LeaveStatus
from app.models.employee import Employee
from app.models.user import User

router = APIRouter()


# Pydantic schemas
class LeaveRequestBase(BaseModel):
    start_date: datetime
    end_date: datetime
    leave_type: LeaveType
    reason: Optional[str] = None


class LeaveRequestCreate(LeaveRequestBase):
    employee_id: int


class LeaveRequestUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    leave_type: Optional[LeaveType] = None
    reason: Optional[str] = None


class LeaveApprovalRequest(BaseModel):
    status: LeaveStatus  # approved or rejected
    rejection_reason: Optional[str] = None


class LeaveRequestResponse(LeaveRequestBase):
    leave_id: int
    employee_id: int
    employee_name: Optional[str] = None
    status: LeaveStatus
    approved_by: Optional[int] = None
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Endpoints
@router.get("/", response_model=List[LeaveRequestResponse])
async def list_leave_requests(
    employee_id: Optional[int] = None,
    status: Optional[LeaveStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List leave requests with optional filtering."""
    query = db.query(LeaveRequest).join(Employee)

    if employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)

    if status:
        query = query.filter(LeaveRequest.status == status)

    if start_date:
        query = query.filter(LeaveRequest.start_date >= start_date)

    if end_date:
        query = query.filter(LeaveRequest.end_date <= end_date)

    leave_requests = query.order_by(LeaveRequest.start_date.desc()).offset(offset).limit(limit).all()

    # Build response with employee names
    result = []
    for lr in leave_requests:
        employee = db.query(Employee).filter(Employee.employee_id == lr.employee_id).first()
        employee_name = f"{employee.first_name} {employee.last_name}" if employee else None

        approver_name = None
        if lr.approved_by:
            approver = db.query(User).filter(User.user_id == lr.approved_by).first()
            approver_name = approver.full_name if approver else None

        result.append({
            "leave_id": lr.leave_id,
            "employee_id": lr.employee_id,
            "employee_name": employee_name,
            "start_date": lr.start_date,
            "end_date": lr.end_date,
            "leave_type": lr.leave_type,
            "reason": lr.reason,
            "status": lr.status,
            "approved_by": lr.approved_by,
            "approver_name": approver_name,
            "approved_at": lr.approved_at,
            "rejection_reason": lr.rejection_reason,
            "created_at": lr.created_at,
            "updated_at": lr.updated_at
        })

    return result


@router.post("/", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_leave_request(leave_data: LeaveRequestCreate, db: Session = Depends(get_db)):
    """Create a new leave request (employee self-service)."""
    # Validate employee exists
    employee = db.query(Employee).filter(Employee.employee_id == leave_data.employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {leave_data.employee_id} not found"
        )

    # Validate dates
    if leave_data.end_date < leave_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    # Check for overlapping leave requests
    overlapping = db.query(LeaveRequest).filter(
        and_(
            LeaveRequest.employee_id == leave_data.employee_id,
            LeaveRequest.status != LeaveStatus.REJECTED,
            LeaveRequest.status != LeaveStatus.CANCELLED,
            or_(
                and_(
                    LeaveRequest.start_date <= leave_data.start_date,
                    LeaveRequest.end_date >= leave_data.start_date
                ),
                and_(
                    LeaveRequest.start_date <= leave_data.end_date,
                    LeaveRequest.end_date >= leave_data.end_date
                ),
                and_(
                    LeaveRequest.start_date >= leave_data.start_date,
                    LeaveRequest.end_date <= leave_data.end_date
                )
            )
        )
    ).first()

    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Overlapping leave request exists (ID: {overlapping.leave_id})"
        )

    # Create leave request
    leave_request = LeaveRequest(
        employee_id=leave_data.employee_id,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        leave_type=leave_data.leave_type,
        reason=leave_data.reason,
        status=LeaveStatus.PENDING
    )

    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)

    employee_name = f"{employee.first_name} {employee.last_name}"

    return {
        "leave_id": leave_request.leave_id,
        "employee_id": leave_request.employee_id,
        "employee_name": employee_name,
        "start_date": leave_request.start_date,
        "end_date": leave_request.end_date,
        "leave_type": leave_request.leave_type,
        "reason": leave_request.reason,
        "status": leave_request.status,
        "approved_by": None,
        "approver_name": None,
        "approved_at": None,
        "rejection_reason": None,
        "created_at": leave_request.created_at,
        "updated_at": leave_request.updated_at
    }


@router.get("/{leave_id}", response_model=LeaveRequestResponse)
async def get_leave_request(leave_id: int, db: Session = Depends(get_db)):
    """Get a specific leave request by ID."""
    leave_request = db.query(LeaveRequest).filter(LeaveRequest.leave_id == leave_id).first()

    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Leave request with ID {leave_id} not found"
        )

    employee = db.query(Employee).filter(Employee.employee_id == leave_request.employee_id).first()
    employee_name = f"{employee.first_name} {employee.last_name}" if employee else None

    approver_name = None
    if leave_request.approved_by:
        approver = db.query(User).filter(User.user_id == leave_request.approved_by).first()
        approver_name = approver.full_name if approver else None

    return {
        "leave_id": leave_request.leave_id,
        "employee_id": leave_request.employee_id,
        "employee_name": employee_name,
        "start_date": leave_request.start_date,
        "end_date": leave_request.end_date,
        "leave_type": leave_request.leave_type,
        "reason": leave_request.reason,
        "status": leave_request.status,
        "approved_by": leave_request.approved_by,
        "approver_name": approver_name,
        "approved_at": leave_request.approved_at,
        "rejection_reason": leave_request.rejection_reason,
        "created_at": leave_request.created_at,
        "updated_at": leave_request.updated_at
    }


@router.put("/{leave_id}", response_model=LeaveRequestResponse)
async def update_leave_request(
    leave_id: int,
    leave_data: LeaveRequestUpdate,
    db: Session = Depends(get_db)
):
    """Update a pending leave request (employee can only update pending requests)."""
    leave_request = db.query(LeaveRequest).filter(LeaveRequest.leave_id == leave_id).first()

    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Leave request with ID {leave_id} not found"
        )

    if leave_request.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update pending leave requests"
        )

    # Update fields
    for field, value in leave_data.model_dump(exclude_unset=True).items():
        setattr(leave_request, field, value)

    leave_request.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(leave_request)

    employee = db.query(Employee).filter(Employee.employee_id == leave_request.employee_id).first()
    employee_name = f"{employee.first_name} {employee.last_name}" if employee else None

    return {
        "leave_id": leave_request.leave_id,
        "employee_id": leave_request.employee_id,
        "employee_name": employee_name,
        "start_date": leave_request.start_date,
        "end_date": leave_request.end_date,
        "leave_type": leave_request.leave_type,
        "reason": leave_request.reason,
        "status": leave_request.status,
        "approved_by": None,
        "approver_name": None,
        "approved_at": None,
        "rejection_reason": None,
        "created_at": leave_request.created_at,
        "updated_at": leave_request.updated_at
    }


@router.put("/{leave_id}/approve")
async def approve_or_reject_leave(
    leave_id: int,
    approval_data: LeaveApprovalRequest,
    admin_user_id: int,  # This should come from authentication
    db: Session = Depends(get_db)
):
    """Approve or reject a leave request (admin only)."""
    leave_request = db.query(LeaveRequest).filter(LeaveRequest.leave_id == leave_id).first()

    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Leave request with ID {leave_id} not found"
        )

    if leave_request.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve/reject leave request with status: {leave_request.status}"
        )

    leave_request.status = approval_data.status
    leave_request.approved_by = admin_user_id
    leave_request.approved_at = datetime.utcnow()

    if approval_data.status == LeaveStatus.REJECTED and approval_data.rejection_reason:
        leave_request.rejection_reason = approval_data.rejection_reason

    leave_request.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(leave_request)

    return {
        "message": f"Leave request {approval_data.status.value}",
        "leave_id": leave_request.leave_id,
        "status": leave_request.status
    }


@router.delete("/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_leave_request(leave_id: int, db: Session = Depends(get_db)):
    """Cancel a leave request (employee can cancel pending or approved requests)."""
    leave_request = db.query(LeaveRequest).filter(LeaveRequest.leave_id == leave_id).first()

    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Leave request with ID {leave_id} not found"
        )

    if leave_request.status == LeaveStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave request is already cancelled"
        )

    leave_request.status = LeaveStatus.CANCELLED
    leave_request.updated_at = datetime.utcnow()
    db.commit()

    return None


@router.get("/calendar/{employee_id}")
async def get_employee_leave_calendar(
    employee_id: int,
    start_date: datetime,
    end_date: datetime,
    db: Session = Depends(get_db)
):
    """Get employee's leave calendar for a date range (for mobile calendar view)."""
    leave_requests = db.query(LeaveRequest).filter(
        and_(
            LeaveRequest.employee_id == employee_id,
            or_(
                and_(LeaveRequest.start_date >= start_date, LeaveRequest.start_date <= end_date),
                and_(LeaveRequest.end_date >= start_date, LeaveRequest.end_date <= end_date),
                and_(LeaveRequest.start_date <= start_date, LeaveRequest.end_date >= end_date)
            )
        )
    ).all()

    # Format for calendar display
    calendar_events = []
    for lr in leave_requests:
        calendar_events.append({
            "id": lr.leave_id,
            "title": f"{lr.leave_type.value.replace('_', ' ').title()} Leave",
            "start": lr.start_date.isoformat(),
            "end": lr.end_date.isoformat(),
            "status": lr.status.value,
            "color": "green" if lr.status == LeaveStatus.APPROVED else "orange" if lr.status == LeaveStatus.PENDING else "red",
            "reason": lr.reason
        })

    return calendar_events
