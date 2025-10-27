"""Shifts API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()


@router.get("/")
async def get_shifts(
    skip: int = 0,
    limit: int = 100,
    site_id: int = None,
    employee_id: int = None,
    db: Session = Depends(get_db)
):
    """Get all shifts with optional filters."""
    return {"message": "Get shifts endpoint"}


@router.get("/{shift_id}")
async def get_shift(
    shift_id: int,
    db: Session = Depends(get_db)
):
    """Get shift by ID."""
    return {"message": f"Get shift {shift_id}"}


@router.post("/")
async def create_shift(
    db: Session = Depends(get_db)
):
    """Create new shift."""
    return {"message": "Create shift endpoint"}


@router.put("/{shift_id}")
async def update_shift(
    shift_id: int,
    db: Session = Depends(get_db)
):
    """Update shift."""
    return {"message": f"Update shift {shift_id}"}


@router.delete("/{shift_id}")
async def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db)
):
    """Delete shift."""
    return {"message": f"Delete shift {shift_id}"}
