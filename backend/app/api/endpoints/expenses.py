"""Expenses API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()


@router.get("/")
async def get_expenses(
    employee_id: int = None,
    site_id: int = None,
    approved: bool = None,
    db: Session = Depends(get_db)
):
    """Get expenses with optional filters."""
    return {"message": "Get expenses endpoint"}


@router.post("/")
async def create_expense(
    db: Session = Depends(get_db)
):
    """Create expense."""
    return {"message": "Create expense endpoint"}


@router.put("/{expense_id}")
async def update_expense(
    expense_id: int,
    db: Session = Depends(get_db)
):
    """Update expense."""
    return {"message": f"Update expense {expense_id}"}


@router.put("/{expense_id}/approve")
async def approve_expense(
    expense_id: int,
    db: Session = Depends(get_db)
):
    """Approve expense."""
    return {"message": f"Approve expense {expense_id}"}


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db)
):
    """Delete expense."""
    return {"message": f"Delete expense {expense_id}"}
