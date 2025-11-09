"""Shifts API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.schemas import ShiftCreate, ShiftUpdate, ShiftResponse
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


@router.post("/{shift_id}/assign/{employee_id}", response_model=ShiftResponse)
async def assign_employee_to_shift(
    shift_id: int,
    employee_id: int,
    db: Session = Depends(get_db)
):
    """Assign employee to shift."""
    shift = ShiftService.assign_employee(db, shift_id, employee_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )
    return shift


@router.post("/{shift_id}/unassign", response_model=ShiftResponse)
async def unassign_employee_from_shift(
    shift_id: int,
    db: Session = Depends(get_db)
):
    """Unassign employee from shift (manual roster editing)."""
    shift = ShiftService.get_by_id(db, shift_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )

    shift.assigned_employee_id = None
    shift.status = "planned"
    db.commit()
    db.refresh(shift)
    return shift


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
