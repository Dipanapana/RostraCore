"""Expenses API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.expense import Expense, ExpenseType
from app.models.employee import Employee

router = APIRouter()

class ExpenseCreate(BaseModel):
    employee_id: Optional[int] = None
    site_id: Optional[int] = None
    type: str
    amount: float
    date_incurred: date
    description: Optional[str] = None

@router.get("/")
async def get_expenses(
    employee_id: Optional[int] = None,
    site_id: Optional[int] = None,
    approved: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Expense)
    if employee_id:
        query = query.filter(Expense.employee_id == employee_id)
    if site_id:
        query = query.filter(Expense.site_id == site_id)
    if approved is not None:
        query = query.filter(Expense.approved == approved)
    
    expenses = query.order_by(Expense.date_incurred.desc()).offset(skip).limit(limit).all()
    
    result = []
    for exp in expenses:
        employee = db.query(Employee).filter(Employee.employee_id == exp.employee_id).first() if exp.employee_id else None
        result.append({
            "expense_id": exp.expense_id,
            "employee_id": exp.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
            "site_id": exp.site_id,
            "type": exp.type.value,
            "amount": exp.amount,
            "date_incurred": exp.date_incurred.isoformat(),
            "approved": exp.approved,
            "description": exp.description
        })
    return result

@router.post("/")
async def create_expense(expense_data: ExpenseCreate, db: Session = Depends(get_db)):
    expense = Expense(
        employee_id=expense_data.employee_id,
        site_id=expense_data.site_id,
        type=ExpenseType(expense_data.type),
        amount=expense_data.amount,
        date_incurred=expense_data.date_incurred,
        description=expense_data.description
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return {
        "expense_id": expense.expense_id,
        "message": "Expense created successfully"
    }

@router.put("/{expense_id}")
async def update_expense(expense_id: int, expense_data: ExpenseCreate, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense.type = ExpenseType(expense_data.type)
    expense.amount = expense_data.amount
    expense.date_incurred = expense_data.date_incurred
    expense.description = expense_data.description
    db.commit()
    return {"message": "Expense updated successfully"}

@router.put("/{expense_id}/approve")
async def approve_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense.approved = True
    db.commit()
    return {"message": "Expense approved successfully"}

@router.delete("/{expense_id}")
async def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted successfully"}
