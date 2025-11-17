"""Shifts API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.schemas import ShiftCreate, ShiftUpdate, ShiftResponse, ShiftAssignmentCreate, ShiftAssignmentResponse
from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
from app.services.shift_service import ShiftService

router = APIRouter()


@router.get("/", response_model=List[ShiftResponse])
async def get_shifts(
    skip: int = 0,
    limit: int = 100,
    site_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get all shifts with optional filters."""
    shifts = ShiftService.get_all(
        db,
        skip=skip,
        limit=limit,
        site_id=site_id,
        employee_id=employee_id,
        status=status_filter,
        start_date=start_date,
        end_date=end_date
    )
    return shifts


@router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: int,
    db: Session = Depends(get_db)
):
    """Get shift by ID."""
    shift = ShiftService.get_by_id(db, shift_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )
    return shift


@router.post("/", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def create_shift(
    shift_data: ShiftCreate,
    db: Session = Depends(get_db)
):
    """Create new shift."""
    shift = ShiftService.create(db, shift_data)
    return shift


@router.put("/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: int,
    shift_data: ShiftUpdate,
    db: Session = Depends(get_db)
):
    """Update shift."""
    shift = ShiftService.update(db, shift_id, shift_data)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )
    return shift


@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db)
):
    """Delete shift."""
    success = ShiftService.delete(db, shift_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )
    return None


@router.get("/{shift_id}/assignments", response_model=List[ShiftAssignmentResponse])
async def get_shift_assignments(
    shift_id: int,
    db: Session = Depends(get_db)
):
    """Get all guard assignments for a shift."""
    from app.models.shift import Shift

    shift = db.query(Shift).filter(Shift.shift_id == shift_id).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )

    assignments = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.status != AssignmentStatus.CANCELLED
    ).all()

    return assignments


@router.post("/{shift_id}/assign/{employee_id}", response_model=ShiftAssignmentResponse)
async def assign_guard_to_shift(
    shift_id: int,
    employee_id: int,
    db: Session = Depends(get_db)
):
    """
    Assign a guard to a shift (manual assignment).
    Creates assignment with 'pending' status.
    """
    from app.models.shift import Shift
    from app.models.employee import Employee

    # Verify shift exists
    shift = db.query(Shift).filter(Shift.shift_id == shift_id).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )

    # Verify employee exists
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    # Check if already assigned
    existing = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.employee_id == employee_id,
        ShiftAssignment.status != AssignmentStatus.CANCELLED
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee {employee_id} is already assigned to this shift"
        )

    # Check if shift is full
    current_assignments = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.CONFIRMED])
    ).count()

    if current_assignments >= shift.required_staff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shift is full ({current_assignments}/{shift.required_staff} guards assigned)"
        )

    # Create assignment
    assignment = ShiftAssignment(
        shift_id=shift_id,
        employee_id=employee_id,
        status=AssignmentStatus.PENDING.value,
        roster_id=None  # Manual assignment, no roster
    )

    # Calculate cost
    assignment.calculate_cost(shift, employee)

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment


@router.delete("/{shift_id}/assignments/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_guard_from_shift(
    shift_id: int,
    employee_id: int,
    db: Session = Depends(get_db)
):
    """
    Remove guard assignment from shift.
    Sets assignment status to 'cancelled'.
    """
    assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.employee_id == employee_id,
        ShiftAssignment.status != AssignmentStatus.CANCELLED
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment not found for employee {employee_id} on shift {shift_id}"
        )

    assignment.status = AssignmentStatus.CANCELLED.value
    db.commit()

    return None


@router.post("/{shift_id}/assignments/{assignment_id}/confirm", response_model=ShiftAssignmentResponse)
async def confirm_shift_assignment(
    shift_id: int,
    assignment_id: int,
    db: Session = Depends(get_db)
):
    """
    Confirm a pending shift assignment.
    Changes status from 'pending' to 'confirmed'.
    """
    assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.assignment_id == assignment_id,
        ShiftAssignment.shift_id == shift_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment {assignment_id} not found"
        )

    if assignment.status != AssignmentStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assignment is already {assignment.status}, cannot confirm"
        )

    assignment.status = AssignmentStatus.CONFIRMED.value
    assignment.confirmation_datetime = datetime.utcnow()
    db.commit()
    db.refresh(assignment)

    return assignment


@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
async def bulk_delete_shifts(
    shift_ids: List[int],
    db: Session = Depends(get_db)
):
    """Bulk delete shifts (for admin/owner to clean up history)."""
    deleted_count = 0
    errors = []

    for shift_id in shift_ids:
        try:
            success = ShiftService.delete(db, shift_id)
            if success:
                deleted_count += 1
            else:
                errors.append(f"Shift {shift_id} not found")
        except Exception as e:
            errors.append(f"Shift {shift_id}: {str(e)}")

    return {
        "deleted_count": deleted_count,
        "total_requested": len(shift_ids),
        "errors": errors
    }
