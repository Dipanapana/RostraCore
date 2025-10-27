"""Payroll API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()


@router.get("/")
async def get_payroll(
    employee_id: int = None,
    db: Session = Depends(get_db)
):
    """Get payroll summaries."""
    return {"message": "Get payroll endpoint"}


@router.get("/current-period")
async def get_current_period_payroll(
    db: Session = Depends(get_db)
):
    """Get payroll for current pay period."""
    return {"message": "Get current period payroll"}


@router.post("/generate")
async def generate_payroll(
    db: Session = Depends(get_db)
):
    """Generate payroll for a period."""
    return {"message": "Generate payroll endpoint"}


@router.get("/{payroll_id}")
async def get_payroll_detail(
    payroll_id: int,
    db: Session = Depends(get_db)
):
    """Get payroll detail."""
    return {"message": f"Get payroll {payroll_id}"}
