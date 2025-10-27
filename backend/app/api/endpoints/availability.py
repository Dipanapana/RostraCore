"""Availability API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()


@router.get("/")
async def get_availability(
    employee_id: int = None,
    db: Session = Depends(get_db)
):
    """Get availability records."""
    return {"message": "Get availability endpoint"}


@router.post("/")
async def create_availability(
    db: Session = Depends(get_db)
):
    """Create availability record."""
    return {"message": "Create availability endpoint"}


@router.delete("/{avail_id}")
async def delete_availability(
    avail_id: int,
    db: Session = Depends(get_db)
):
    """Delete availability record."""
    return {"message": f"Delete availability {avail_id}"}
