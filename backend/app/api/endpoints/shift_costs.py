"""Shift cost breakdown — labour cost analytics by site, period, and cost type."""

from datetime import datetime, date, timedelta
from typing import Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment
from app.models.site import Site
from app.models.employee import Employee
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/breakdown")
def shift_cost_breakdown(
    days: int = Query(30, ge=1, le=365),
    site_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Cost breakdown across all shifts — regular, overtime, premiums."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    shift_q = db.query(Shift).filter(
        Shift.org_id == org_id,
        Shift.start_time >= cutoff,
    )
    if site_id:
        shift_q = shift_q.filter(Shift.site_id == site_id)

    shifts = shift_q.all()
    shift_ids = [s.shift_id for s in shifts]
    shift_map = {s.shift_id: s for s in shifts}

    assignments = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id.in_(shift_ids),
        ShiftAssignment.status.in_(["pending", "confirmed", "completed"]),
    ).all() if shift_ids else []

    # Totals
    total_regular = 0.0
    total_overtime = 0.0
    total_night = 0.0
    total_weekend = 0.0
    total_sunday = 0.0
    total_holiday = 0.0
    total_travel = 0.0
    total_cost = 0.0
    total_hours = 0.0
    total_ot_hours = 0.0

    # By site
    site_costs = defaultdict(lambda: {"regular": 0, "overtime": 0, "premiums": 0, "total": 0, "hours": 0, "assignments": 0})
    # By month
    month_costs = defaultdict(lambda: {"regular": 0, "overtime": 0, "premiums": 0, "total": 0})
    # By employee (top spenders)
    emp_costs = defaultdict(lambda: {"regular": 0, "overtime": 0, "total": 0, "hours": 0})

    for a in assignments:
        reg = float(a.regular_pay or 0)
        ot = float(a.overtime_pay or 0)
        night = float(a.night_premium or 0)
        wknd = float(a.weekend_premium or 0)
        sun = float(a.sunday_premium or 0)
        hol = float(a.holiday_premium or 0)
        travel = float(a.travel_reimbursement or 0)
        cost = float(a.total_cost or 0)
        hrs = float(a.regular_hours or 0)
        ot_hrs = float(a.overtime_hours or 0)

        total_regular += reg
        total_overtime += ot
        total_night += night
        total_weekend += wknd
        total_sunday += sun
        total_holiday += hol
        total_travel += travel
        total_cost += cost
        total_hours += hrs
        total_ot_hours += ot_hrs

        premiums = night + wknd + sun + hol

        # By site
        shift = shift_map.get(a.shift_id)
        if shift and shift.site_id:
            sid = shift.site_id
            site_costs[sid]["regular"] += reg
            site_costs[sid]["overtime"] += ot
            site_costs[sid]["premiums"] += premiums
            site_costs[sid]["total"] += cost
            site_costs[sid]["hours"] += hrs + ot_hrs
            site_costs[sid]["assignments"] += 1

            # By month
            month_key = shift.start_time.strftime("%Y-%m")
            month_costs[month_key]["regular"] += reg
            month_costs[month_key]["overtime"] += ot
            month_costs[month_key]["premiums"] += premiums
            month_costs[month_key]["total"] += cost

        # By employee
        if a.employee_id:
            emp_costs[a.employee_id]["regular"] += reg
            emp_costs[a.employee_id]["overtime"] += ot
            emp_costs[a.employee_id]["total"] += cost
            emp_costs[a.employee_id]["hours"] += hrs + ot_hrs

    # Lookup names
    site_ids = list(site_costs.keys())
    site_names = {}
    if site_ids:
        for s in db.query(Site).filter(Site.site_id.in_(site_ids)).all():
            site_names[s.site_id] = s.site_name

    by_site = []
    for sid, costs in sorted(site_costs.items(), key=lambda x: x[1]["total"], reverse=True):
        by_site.append({
            "site_id": sid,
            "site_name": site_names.get(sid, f"Site #{sid}"),
            "regular_pay": round(costs["regular"], 2),
            "overtime_pay": round(costs["overtime"], 2),
            "premiums": round(costs["premiums"], 2),
            "total_cost": round(costs["total"], 2),
            "total_hours": round(costs["hours"], 1),
            "assignments": costs["assignments"],
            "cost_per_hour": round(costs["total"] / costs["hours"], 2) if costs["hours"] > 0 else 0,
        })

    by_month = []
    for month in sorted(month_costs.keys()):
        costs = month_costs[month]
        by_month.append({
            "month": month,
            "regular_pay": round(costs["regular"], 2),
            "overtime_pay": round(costs["overtime"], 2),
            "premiums": round(costs["premiums"], 2),
            "total_cost": round(costs["total"], 2),
        })

    # Top 10 costliest employees
    emp_ids = list(emp_costs.keys())
    emp_names = {}
    if emp_ids:
        for e in db.query(Employee).filter(Employee.employee_id.in_(emp_ids)).all():
            emp_names[e.employee_id] = f"{e.first_name} {e.last_name}"

    top_employees = []
    for eid, costs in sorted(emp_costs.items(), key=lambda x: x[1]["total"], reverse=True)[:10]:
        top_employees.append({
            "employee_id": eid,
            "employee_name": emp_names.get(eid, f"Employee #{eid}"),
            "regular_pay": round(costs["regular"], 2),
            "overtime_pay": round(costs["overtime"], 2),
            "total_cost": round(costs["total"], 2),
            "total_hours": round(costs["hours"], 1),
        })

    avg_cost_per_hour = round(total_cost / total_hours, 2) if total_hours > 0 else 0
    overtime_ratio = round((total_ot_hours / (total_hours + total_ot_hours)) * 100, 1) if (total_hours + total_ot_hours) > 0 else 0

    return {
        "period_days": days,
        "total_assignments": len(assignments),
        "total_cost": round(total_cost, 2),
        "regular_pay": round(total_regular, 2),
        "overtime_pay": round(total_overtime, 2),
        "night_premium": round(total_night, 2),
        "weekend_premium": round(total_weekend, 2),
        "sunday_premium": round(total_sunday, 2),
        "holiday_premium": round(total_holiday, 2),
        "travel_reimbursement": round(total_travel, 2),
        "total_hours": round(total_hours, 1),
        "overtime_hours": round(total_ot_hours, 1),
        "avg_cost_per_hour": avg_cost_per_hour,
        "overtime_ratio_pct": overtime_ratio,
        "by_site": by_site,
        "by_month": by_month,
        "top_employees": top_employees,
    }
