"""Workforce forecasting endpoints — predict staffing needs."""

from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.employee import Employee
from app.models.site import Site
from app.models.shift import Shift
from app.models.leave import LeaveRequest
from app.models.contract_value import ContractValue
from app.models.overtime import OvertimeRecord
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/summary")
def workforce_summary(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Current workforce overview with key metrics."""
    total_employees = db.query(Employee).filter(
        Employee.org_id == org_id, Employee.status == "active"
    ).count()

    total_sites = db.query(Site).filter(Site.org_id == org_id).count()

    # Active contracts
    active_contracts = db.query(ContractValue).filter(
        ContractValue.org_id == org_id,
        ContractValue.is_active == True,
    ).count()

    # Upcoming leave (next 30 days)
    next_30 = date.today() + timedelta(days=30)
    upcoming_leave = db.query(LeaveRequest).filter(
        LeaveRequest.org_id == org_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= next_30,
        LeaveRequest.end_date >= date.today(),
    ).count()

    # Overtime last 30 days
    cutoff = date.today() - timedelta(days=30)
    ot_records = db.query(OvertimeRecord).filter(
        OvertimeRecord.org_id == org_id,
        OvertimeRecord.status == "approved",
        OvertimeRecord.date >= cutoff,
    ).all()
    ot_hours = round(sum(r.hours for r in ot_records), 1) if ot_records else 0

    return {
        "total_active_employees": total_employees,
        "total_sites": total_sites,
        "active_contracts": active_contracts,
        "upcoming_leave_30d": upcoming_leave,
        "overtime_hours_30d": ot_hours,
    }


@router.get("/staffing-gaps")
def staffing_gaps(
    days_ahead: int = Query(30, le=90),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Predict staffing gaps by comparing required headcount to available workforce."""
    from app.models.site_staffing_profile import SiteStaffingProfile

    today = date.today()
    future = today + timedelta(days=days_ahead)

    # Total active employees
    total_employees = db.query(Employee).filter(
        Employee.org_id == org_id, Employee.status == "active"
    ).count()

    # Approved leave in period
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.org_id == org_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= future,
        LeaveRequest.end_date >= today,
    ).all()

    # Calculate leave-days by date
    leave_by_date: dict = {}
    for lv in leaves:
        d = max(lv.start_date, today)
        end = min(lv.end_date, future)
        while d <= end:
            leave_by_date[d] = leave_by_date.get(d, 0) + 1
            d += timedelta(days=1)

    # Sites with staffing profiles
    profiles = db.query(SiteStaffingProfile).filter(
        SiteStaffingProfile.org_id == org_id
    ).all()
    total_required = sum(p.guards_required or 0 for p in profiles)

    # Available = total - avg on leave
    avg_on_leave = round(sum(leave_by_date.values()) / max(len(leave_by_date), 1), 1) if leave_by_date else 0
    available = total_employees - avg_on_leave

    gap = total_required - available
    gap_pct = round((gap / total_required * 100), 1) if total_required > 0 else 0

    # Peak leave dates
    peak_leave_dates = sorted(leave_by_date.items(), key=lambda x: -x[1])[:5]

    return {
        "period_days": days_ahead,
        "total_employees": total_employees,
        "total_required": total_required,
        "avg_on_leave": avg_on_leave,
        "effective_available": round(available, 1),
        "staffing_gap": round(gap, 1),
        "gap_percentage": gap_pct,
        "status": "overstaffed" if gap < 0 else ("adequate" if gap <= 0 else "understaffed"),
        "peak_leave_dates": [
            {"date": d.isoformat(), "on_leave": cnt} for d, cnt in peak_leave_dates
        ],
    }


@router.get("/site-needs")
def site_needs(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Per-site staffing needs vs current assigned employees."""
    from app.models.site_staffing_profile import SiteStaffingProfile
    from app.models.deployment_history import DeploymentRecord

    sites = db.query(Site).filter(Site.org_id == org_id).all()

    result = []
    for site in sites:
        # Get staffing requirement
        profile = db.query(SiteStaffingProfile).filter(
            SiteStaffingProfile.site_id == site.site_id,
            SiteStaffingProfile.org_id == org_id,
        ).first()
        required = profile.guards_required if profile else 0

        # Active deployments
        deployed = db.query(DeploymentRecord).filter(
            DeploymentRecord.org_id == org_id,
            DeploymentRecord.site_id == site.site_id,
            DeploymentRecord.end_date.is_(None),
        ).count()

        gap = required - deployed

        result.append({
            "site_id": site.site_id,
            "site_name": site.site_name,
            "required": required,
            "deployed": deployed,
            "gap": gap,
            "status": "understaffed" if gap > 0 else ("overstaffed" if gap < 0 else "adequate"),
        })

    return {"sites": sorted(result, key=lambda x: -x["gap"])}


@router.get("/monthly-projection")
def monthly_projection(
    months_ahead: int = Query(3, le=12),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Project workforce needs for upcoming months."""
    import calendar

    today = date.today()
    total_employees = db.query(Employee).filter(
        Employee.org_id == org_id, Employee.status == "active"
    ).count()

    # Expiring contracts
    contracts = db.query(ContractValue).filter(
        ContractValue.org_id == org_id,
        ContractValue.is_active == True,
    ).all()

    projections = []
    for m in range(months_ahead):
        year = today.year + (today.month - 1 + m) // 12
        month = (today.month - 1 + m) % 12 + 1
        month_date = date(year, month, 1)
        last_day = calendar.monthrange(year, month)[1]
        month_end = date(year, month, last_day)

        # Contracts expiring this month
        expiring = sum(
            1 for c in contracts
            if c.end_date and month_date <= (c.end_date.date() if hasattr(c.end_date, 'date') else c.end_date) <= month_end
        )

        # Approved leave this month
        leave_count = db.query(LeaveRequest).filter(
            LeaveRequest.org_id == org_id,
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= month_end,
            LeaveRequest.end_date >= month_date,
        ).count()

        projections.append({
            "month": month_date.strftime("%Y-%m"),
            "month_label": month_date.strftime("%b %Y"),
            "headcount": total_employees,
            "leave_count": leave_count,
            "expiring_contracts": expiring,
            "effective_available": total_employees - leave_count,
        })

    return {"projections": projections}
