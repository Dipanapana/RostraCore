"""Payroll summary reports — analytics aggregation across payroll periods."""

from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc

from app.database import get_db
from app.models.payroll import PayrollSummary
from app.models.employee import Employee
from app.models.site import Site
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/summary")
def payroll_summary_report(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Aggregate payroll stats for a given month (or current month)."""
    today = date.today()
    y = year or today.year
    m = month or today.month

    period_start = date(y, m, 1)
    if m == 12:
        period_end = date(y + 1, 1, 1) - timedelta(days=1)
    else:
        period_end = date(y, m + 1, 1) - timedelta(days=1)

    # Query payroll records for the period
    records = (
        db.query(PayrollSummary)
        .join(Employee, Employee.employee_id == PayrollSummary.employee_id)
        .filter(
            Employee.org_id == org_id,
            PayrollSummary.period_start >= period_start,
            PayrollSummary.period_start <= period_end,
        )
        .all()
    )

    total_gross = sum(r.gross_pay or 0 for r in records)
    total_net = sum(r.net_pay or 0 for r in records)
    total_deductions = total_gross - total_net
    total_hours = sum(r.total_hours or 0 for r in records)
    total_overtime = sum(r.overtime_hours or 0 for r in records)
    headcount = len(set(r.employee_id for r in records))
    avg_gross = round(total_gross / headcount, 2) if headcount else 0

    return {
        "year": y,
        "month": m,
        "month_label": period_start.strftime("%B %Y"),
        "headcount": headcount,
        "total_records": len(records),
        "total_gross": round(total_gross, 2),
        "total_net": round(total_net, 2),
        "total_deductions": round(total_deductions, 2),
        "total_hours": round(total_hours, 1),
        "total_overtime_hours": round(total_overtime, 1),
        "avg_gross_per_employee": avg_gross,
    }


@router.get("/trend")
def payroll_trend(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Monthly payroll trend for the last N months."""
    today = date.today()

    # Calculate the full date range (single query instead of N queries)
    first_month = today.replace(day=1)
    for _ in range(months - 1):
        first_month = (first_month - timedelta(days=1)).replace(day=1)

    # Single query: load all PayrollSummary rows in range
    rows = (
        db.query(
            PayrollSummary.employee_id,
            PayrollSummary.period_start,
            PayrollSummary.gross_pay,
            PayrollSummary.net_pay,
        )
        .join(Employee, Employee.employee_id == PayrollSummary.employee_id)
        .filter(
            Employee.org_id == org_id,
            PayrollSummary.period_start >= first_month,
            PayrollSummary.period_start <= today,
        )
        .all()
    )

    # Group in Python by (year, month)
    from collections import defaultdict
    monthly = defaultdict(lambda: {"gross": 0.0, "net": 0.0, "employees": set()})
    for r in rows:
        key = (r.period_start.year, r.period_start.month)
        monthly[key]["gross"] += r.gross_pay or 0
        monthly[key]["net"] += r.net_pay or 0
        monthly[key]["employees"].add(r.employee_id)

    # Rebuild trend list in correct order
    trends = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1

        data = monthly.get((y, m), {"gross": 0.0, "net": 0.0, "employees": set()})
        period_label = date(y, m, 1)
        trends.append({
            "month": period_label.strftime("%b %Y"),
            "year": y,
            "month_num": m,
            "headcount": len(data["employees"]),
            "total_gross": round(data["gross"], 2),
            "total_net": round(data["net"], 2),
            "total_deductions": round(data["gross"] - data["net"], 2),
        })

    return {"months": months, "trend": trends}


@router.get("/by-employee")
def payroll_by_employee(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Per-employee payroll breakdown for a given month."""
    today = date.today()
    y = year or today.year
    m = month or today.month

    period_start = date(y, m, 1)
    if m == 12:
        period_end = date(y + 1, 1, 1) - timedelta(days=1)
    else:
        period_end = date(y, m + 1, 1) - timedelta(days=1)

    records = (
        db.query(PayrollSummary)
        .join(Employee, Employee.employee_id == PayrollSummary.employee_id)
        .filter(
            Employee.org_id == org_id,
            PayrollSummary.period_start >= period_start,
            PayrollSummary.period_start <= period_end,
        )
        .all()
    )

    # Group by employee
    emp_map: dict = {}
    for r in records:
        eid = r.employee_id
        if eid not in emp_map:
            emp = db.query(Employee).get(eid)
            emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown"
            emp_map[eid] = {
                "employee_id": eid,
                "employee_name": emp_name,
                "total_gross": 0,
                "total_net": 0,
                "total_hours": 0,
                "overtime_hours": 0,
                "records": 0,
            }
        emp_map[eid]["total_gross"] += r.gross_pay or 0
        emp_map[eid]["total_net"] += r.net_pay or 0
        emp_map[eid]["total_hours"] += r.total_hours or 0
        emp_map[eid]["overtime_hours"] += r.overtime_hours or 0
        emp_map[eid]["records"] += 1

    employees = sorted(emp_map.values(), key=lambda x: x["total_gross"], reverse=True)
    for e in employees:
        e["total_gross"] = round(e["total_gross"], 2)
        e["total_net"] = round(e["total_net"], 2)
        e["total_hours"] = round(e["total_hours"], 1)
        e["overtime_hours"] = round(e["overtime_hours"], 1)
        e["deductions"] = round(e["total_gross"] - e["total_net"], 2)

    return {
        "year": y,
        "month": m,
        "month_label": period_start.strftime("%B %Y"),
        "employees": employees,
        "total": len(employees),
    }
