"""Payroll API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date, datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.payroll import PayrollSummary
from app.models.shift import Shift
from app.models.employee import Employee

router = APIRouter()


# Pydantic schemas
class PayrollCreate(BaseModel):
    employee_id: int
    period_start: date
    period_end: date


@router.get("/")
async def get_payroll(
    employee_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get payroll records with optional filters."""
    query = db.query(PayrollSummary)

    if employee_id:
        query = query.filter(PayrollSummary.employee_id == employee_id)

    payrolls = query.order_by(PayrollSummary.period_start.desc()).offset(skip).limit(limit).all()

    # Add employee name
    result = []
    for p in payrolls:
        employee = db.query(Employee).filter(Employee.employee_id == p.employee_id).first()
        result.append({
            "payroll_id": p.payroll_id,
            "employee_id": p.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "period_start": p.period_start.isoformat(),
            "period_end": p.period_end.isoformat(),
            "total_hours": p.total_hours,
            "overtime_hours": p.overtime_hours,
            "gross_pay": p.gross_pay,
            "expenses_total": p.expenses_total,
            "net_pay": p.net_pay
        })

    return result


@router.get("/current-period")
async def get_current_period_payroll(
    db: Session = Depends(get_db)
):
    """Get payroll for current pay period (current month)."""
    today = date.today()
    period_start = today.replace(day=1)

    # Get last day of month
    if today.month == 12:
        period_end = today.replace(day=31)
    else:
        period_end = (today.replace(month=today.month + 1, day=1) - timedelta(days=1))

    payrolls = db.query(PayrollSummary).filter(
        and_(
            PayrollSummary.period_start >= period_start,
            PayrollSummary.period_end <= period_end
        )
    ).all()

    # Calculate totals
    total_gross = sum(p.gross_pay for p in payrolls)
    total_expenses = sum(p.expenses_total for p in payrolls)
    total_net = sum(p.net_pay for p in payrolls)
    total_hours = sum(p.total_hours for p in payrolls)

    return {
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "employee_count": len(payrolls),
        "total_hours": total_hours,
        "total_gross_pay": total_gross,
        "total_expenses": total_expenses,
        "total_net_pay": total_net
    }


@router.post("/generate")
async def generate_payroll(
    payroll_data: PayrollCreate,
    db: Session = Depends(get_db)
):
    """Generate payroll for an employee and period."""
    # Get employee
    employee = db.query(Employee).filter(Employee.employee_id == payroll_data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Get all shifts for employee in period
    shifts = db.query(Shift).filter(
        and_(
            Shift.assigned_employee_id == payroll_data.employee_id,
            Shift.start_time >= datetime.combine(payroll_data.period_start, datetime.min.time()),
            Shift.end_time <= datetime.combine(payroll_data.period_end, datetime.max.time())
        )
    ).all()

    # Calculate hours
    total_hours = 0.0
    overtime_hours = 0.0

    for shift in shifts:
        duration = (shift.end_time - shift.start_time).total_seconds() / 3600
        total_hours += duration

        # Overtime if > 48 hours per week (simplified)
        if total_hours > 48:
            overtime_hours += (total_hours - 48)

    # Calculate pay
    hourly_rate = employee.hourly_rate or 150.0
    regular_hours = total_hours - overtime_hours
    gross_pay = (regular_hours * hourly_rate) + (overtime_hours * hourly_rate * 1.5)

    # MVP: No expenses or commission tracking
    expenses_total = 0.0
    net_pay = gross_pay

    # Create or update payroll record
    existing = db.query(PayrollSummary).filter(
        and_(
            PayrollSummary.employee_id == payroll_data.employee_id,
            PayrollSummary.period_start == payroll_data.period_start,
            PayrollSummary.period_end == payroll_data.period_end
        )
    ).first()

    if existing:
        existing.total_hours = total_hours
        existing.overtime_hours = overtime_hours
        existing.gross_pay = gross_pay
        existing.expenses_total = expenses_total
        existing.net_pay = net_pay
        db.commit()
        db.refresh(existing)
        payroll = existing
    else:
        payroll = PayrollSummary(
            employee_id=payroll_data.employee_id,
            period_start=payroll_data.period_start,
            period_end=payroll_data.period_end,
            total_hours=total_hours,
            overtime_hours=overtime_hours,
            gross_pay=gross_pay,
            expenses_total=expenses_total,
            net_pay=net_pay
        )
        db.add(payroll)
        db.commit()
        db.refresh(payroll)

    return {
        "payroll_id": payroll.payroll_id,
        "employee_id": payroll.employee_id,
        "period_start": payroll.period_start.isoformat(),
        "period_end": payroll.period_end.isoformat(),
        "total_hours": payroll.total_hours,
        "overtime_hours": payroll.overtime_hours,
        "gross_pay": payroll.gross_pay,
        "expenses_total": payroll.expenses_total,
        "marketplace_commission_deduction": commission_deduction,
        "commission_notes": commission_notes,
        "net_pay": payroll.net_pay
    }


@router.get("/{payroll_id}")
async def get_payroll_detail(
    payroll_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed payroll record."""
    payroll = db.query(PayrollSummary).filter(PayrollSummary.payroll_id == payroll_id).first()

    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    employee = db.query(Employee).filter(Employee.employee_id == payroll.employee_id).first()

    return {
        "payroll_id": payroll.payroll_id,
        "employee": {
            "employee_id": employee.employee_id,
            "name": f"{employee.first_name} {employee.last_name}",
            "hourly_rate": employee.hourly_rate
        } if employee else None,
        "period_start": payroll.period_start.isoformat(),
        "period_end": payroll.period_end.isoformat(),
        "total_hours": payroll.total_hours,
        "overtime_hours": payroll.overtime_hours,
        "gross_pay": payroll.gross_pay,
        "expenses_total": payroll.expenses_total,
        "net_pay": payroll.net_pay
    }


@router.delete("/{payroll_id}")
async def delete_payroll(
    payroll_id: int,
    db: Session = Depends(get_db)
):
    """Delete payroll record."""
    payroll = db.query(PayrollSummary).filter(PayrollSummary.payroll_id == payroll_id).first()

    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    db.delete(payroll)
    db.commit()

    return {"message": "Payroll deleted successfully"}
