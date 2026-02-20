"""Site profitability analytics — revenue vs cost per site/client."""

from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc

from app.database import get_db
from app.models.site import Site
from app.models.client import Client
from app.models.contract_value import ContractValue
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment
from app.models.employee import Employee
from app.models.overtime import OvertimeRecord
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/by-site")
def profitability_by_site(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Per-site profitability: contract revenue vs labour cost."""
    target_year = year or datetime.utcnow().year
    target_month = month or datetime.utcnow().month

    # Date range for the target month
    month_start = date(target_year, target_month, 1)
    if target_month == 12:
        month_end = date(target_year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(target_year, target_month + 1, 1) - timedelta(days=1)

    month_start_dt = datetime.combine(month_start, datetime.min.time())
    month_end_dt = datetime.combine(month_end, datetime.max.time())

    # Get all active sites
    sites = db.query(Site).filter(Site.org_id == org_id).all()

    results = []
    total_revenue = 0
    total_cost = 0

    for site in sites:
        # Revenue: monthly contract value for this site's client
        client = db.query(Client).get(site.client_id) if site.client_id else None
        contract = None
        monthly_revenue = 0
        if client:
            contract = db.query(ContractValue).filter(
                ContractValue.org_id == org_id,
                ContractValue.client_id == client.client_id,
                ContractValue.is_active == True,
            ).first()
            if contract and contract.monthly_value:
                monthly_revenue = contract.monthly_value

        # Labour cost: sum of shift hours * hourly rate for this site
        labour_cost = 0
        shifts = db.query(Shift).filter(
            Shift.org_id == org_id,
            Shift.site_id == site.site_id,
            Shift.start_time >= month_start_dt,
            Shift.start_time <= month_end_dt,
        ).all()

        for shift in shifts:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            assignments = db.query(ShiftAssignment).filter(
                ShiftAssignment.shift_id == shift.shift_id,
                ShiftAssignment.status.in_(["pending", "confirmed", "completed"]),
            ).all()
            for a in assignments:
                emp = db.query(Employee).get(a.employee_id)
                if emp and emp.hourly_rate:
                    labour_cost += duration * float(emp.hourly_rate)

        # Overtime cost for this site
        ot_records = db.query(OvertimeRecord).filter(
            OvertimeRecord.org_id == org_id,
            OvertimeRecord.site_id == site.site_id,
            OvertimeRecord.date >= month_start,
            OvertimeRecord.date <= month_end,
            OvertimeRecord.status == "approved",
        ).all()
        ot_cost = sum(r.total_cost for r in ot_records if r.total_cost) / 100  # cents to rands

        total_site_cost = round(labour_cost + ot_cost, 2)
        profit = round(monthly_revenue - total_site_cost, 2)
        margin_pct = round(profit / monthly_revenue * 100, 1) if monthly_revenue else 0

        total_revenue += monthly_revenue
        total_cost += total_site_cost

        results.append({
            "site_id": site.site_id,
            "site_name": site.site_name,
            "client_name": client.client_name if client else None,
            "monthly_revenue": monthly_revenue,
            "labour_cost": round(labour_cost, 2),
            "overtime_cost": round(ot_cost, 2),
            "total_cost": total_site_cost,
            "profit": profit,
            "margin_pct": margin_pct,
            "shift_count": len(shifts),
        })

    # Sort by profit descending
    results.sort(key=lambda r: r["profit"], reverse=True)

    total_profit = round(total_revenue - total_cost, 2)

    return {
        "year": target_year,
        "month": target_month,
        "month_label": date(target_year, target_month, 1).strftime("%B %Y"),
        "total_revenue": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": total_profit,
        "overall_margin_pct": round(total_profit / total_revenue * 100, 1) if total_revenue else 0,
        "sites": results,
        "profitable_sites": sum(1 for r in results if r["profit"] >= 0),
        "unprofitable_sites": sum(1 for r in results if r["profit"] < 0),
    }


@router.get("/summary")
def profitability_summary(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """High-level profitability summary with last 6 months trend."""
    today = date.today()
    trends = []

    for i in range(5, -1, -1):
        # Calculate month offset
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1

        month_start = date(y, m, 1)
        if m == 12:
            month_end = date(y + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(y, m + 1, 1) - timedelta(days=1)

        month_start_dt = datetime.combine(month_start, datetime.min.time())
        month_end_dt = datetime.combine(month_end, datetime.max.time())

        # Revenue: sum of active contract monthly values
        contracts = db.query(ContractValue).filter(
            ContractValue.org_id == org_id,
            ContractValue.is_active == True,
        ).all()
        revenue = sum(c.monthly_value or 0 for c in contracts)

        # Cost: shift labour
        cost = 0
        shifts = db.query(Shift).filter(
            Shift.org_id == org_id,
            Shift.start_time >= month_start_dt,
            Shift.start_time <= month_end_dt,
        ).all()

        for shift in shifts:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            assignments = db.query(ShiftAssignment).filter(
                ShiftAssignment.shift_id == shift.shift_id,
                ShiftAssignment.status.in_(["pending", "confirmed", "completed"]),
            ).all()
            for a in assignments:
                emp = db.query(Employee).get(a.employee_id)
                if emp and emp.hourly_rate:
                    cost += duration * float(emp.hourly_rate)

        profit = round(revenue - cost, 2)
        trends.append({
            "month": month_start.strftime("%b %Y"),
            "revenue": round(revenue, 2),
            "cost": round(cost, 2),
            "profit": profit,
            "margin_pct": round(profit / revenue * 100, 1) if revenue else 0,
        })

    # Active sites & contracts
    active_sites = db.query(Site).filter(Site.org_id == org_id).count()
    active_contracts = db.query(ContractValue).filter(
        ContractValue.org_id == org_id, ContractValue.is_active == True
    ).count()

    return {
        "active_sites": active_sites,
        "active_contracts": active_contracts,
        "monthly_trend": trends,
    }
