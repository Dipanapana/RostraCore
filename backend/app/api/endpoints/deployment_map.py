"""Guard deployment map — current guard-to-site assignments and deployment overview."""

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


@router.get("/current")
def current_deployments(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Current guard deployments — who is assigned where today."""
    today = date.today()
    now = datetime.utcnow()
    day_start = datetime.combine(today, datetime.min.time())
    day_end = datetime.combine(today, datetime.max.time())

    # Today's shifts
    shifts = db.query(Shift).filter(
        Shift.org_id == org_id,
        Shift.start_time >= day_start,
        Shift.start_time <= day_end,
    ).all()

    shift_ids = [s.shift_id for s in shifts]
    shift_map = {s.shift_id: s for s in shifts}

    assignments = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id.in_(shift_ids),
        ShiftAssignment.status.in_(["pending", "confirmed", "completed"]),
    ).all() if shift_ids else []

    # Build site -> employees mapping
    site_deployments = defaultdict(list)
    emp_ids = set()
    for a in assignments:
        shift = shift_map.get(a.shift_id)
        if shift and shift.site_id and a.employee_id:
            site_deployments[shift.site_id].append({
                "employee_id": a.employee_id,
                "shift_id": a.shift_id,
                "status": a.status,
                "start_time": shift.start_time.isoformat() if shift.start_time else None,
                "end_time": shift.end_time.isoformat() if shift.end_time else None,
                "checked_in": a.checked_in,
                "check_in_time": a.check_in_time.isoformat() if a.check_in_time else None,
            })
            emp_ids.add(a.employee_id)

    # Lookup names
    site_ids = list(site_deployments.keys())
    sites = {}
    if site_ids:
        for s in db.query(Site).filter(Site.site_id.in_(site_ids)).all():
            sites[s.site_id] = {"name": s.site_name, "min_staff": s.min_staff or 0}

    emp_names = {}
    if emp_ids:
        for e in db.query(Employee).filter(Employee.employee_id.in_(list(emp_ids))).all():
            emp_names[e.employee_id] = f"{e.first_name} {e.last_name}"

    # Also include sites with no deployments today
    all_sites = db.query(Site).filter(Site.org_id == org_id).all()

    result = []
    for s in all_sites:
        deps = site_deployments.get(s.site_id, [])
        for d in deps:
            d["employee_name"] = emp_names.get(d["employee_id"], f"Employee #{d['employee_id']}")

        checked_in_count = sum(1 for d in deps if d.get("checked_in"))
        min_staff = s.min_staff or 0
        guard_count = len(deps)
        staffing_status = "adequately_staffed" if guard_count >= min_staff else "understaffed" if guard_count > 0 else "no_coverage"

        result.append({
            "site_id": s.site_id,
            "site_name": s.site_name,
            "min_staff": min_staff,
            "assigned_guards": guard_count,
            "checked_in": checked_in_count,
            "staffing_status": staffing_status,
            "guards": deps,
        })

    result.sort(key=lambda r: r["assigned_guards"], reverse=True)

    # Summary
    total_deployed = sum(r["assigned_guards"] for r in result)
    sites_covered = sum(1 for r in result if r["assigned_guards"] > 0)
    sites_understaffed = sum(1 for r in result if r["staffing_status"] == "understaffed")
    sites_no_coverage = sum(1 for r in result if r["staffing_status"] == "no_coverage")

    return {
        "date": today.isoformat(),
        "total_sites": len(result),
        "sites_covered": sites_covered,
        "sites_understaffed": sites_understaffed,
        "sites_no_coverage": sites_no_coverage,
        "total_guards_deployed": total_deployed,
        "sites": result,
    }


@router.get("/history")
def deployment_history_analytics(
    days: int = Query(30, ge=1, le=365),
    site_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Deployment history — daily guard counts per site over time."""
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

    # Daily deployment counts
    daily = defaultdict(lambda: defaultdict(int))
    site_ids_seen = set()
    for a in assignments:
        shift = shift_map.get(a.shift_id)
        if shift and shift.site_id:
            day_key = shift.start_time.strftime("%Y-%m-%d")
            daily[day_key][shift.site_id] += 1
            site_ids_seen.add(shift.site_id)

    # Site names
    site_names = {}
    if site_ids_seen:
        for s in db.query(Site).filter(Site.site_id.in_(list(site_ids_seen))).all():
            site_names[s.site_id] = s.site_name

    # Format as time series
    daily_trend = []
    for day_key in sorted(daily.keys()):
        entry = {"date": day_key, "total": sum(daily[day_key].values())}
        for sid, count in daily[day_key].items():
            entry[site_names.get(sid, f"site_{sid}")] = count
        daily_trend.append(entry)

    # Site average daily deployment
    site_avg = {}
    for sid in site_ids_seen:
        counts = [daily[d].get(sid, 0) for d in daily.keys()]
        site_avg[sid] = round(sum(counts) / len(counts), 1) if counts else 0

    by_site = []
    for sid in sorted(site_avg.keys(), key=lambda x: site_avg[x], reverse=True):
        by_site.append({
            "site_id": sid,
            "site_name": site_names.get(sid, f"Site #{sid}"),
            "avg_daily_guards": site_avg[sid],
        })

    return {
        "period_days": days,
        "total_days_with_data": len(daily),
        "sites_tracked": len(site_ids_seen),
        "daily_trend": daily_trend[-30:],  # Last 30 entries
        "by_site": by_site,
    }
