"""Patrol analytics — completion rates, coverage gaps, guard performance."""

from datetime import datetime, date, timedelta
from typing import Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.patrol import PatrolTour, PatrolCheckpoint, PatrolRun, PatrolScan
from app.models.site import Site
from app.models.employee import Employee
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/dashboard")
def patrol_analytics_dashboard(
    days: int = Query(90, ge=1, le=365),
    site_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Patrol analytics overview — completion rates, coverage, top performers."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Base filter for runs
    run_q = db.query(PatrolRun).filter(
        PatrolRun.org_id == org_id,
        PatrolRun.started_at >= cutoff,
    )
    if site_id:
        tour_ids = [t.tour_id for t in db.query(PatrolTour.tour_id).filter(
            PatrolTour.org_id == org_id, PatrolTour.site_id == site_id
        ).all()]
        run_q = run_q.filter(PatrolRun.tour_id.in_(tour_ids))

    runs = run_q.all()

    total_runs = len(runs)
    completed = sum(1 for r in runs if str(getattr(r.status, 'value', r.status)) == "COMPLETED")
    abandoned = sum(1 for r in runs if str(getattr(r.status, 'value', r.status)) == "ABANDONED")
    in_progress = sum(1 for r in runs if str(getattr(r.status, 'value', r.status)) == "IN_PROGRESS")

    completion_rate = round((completed / total_runs) * 100, 1) if total_runs > 0 else 0

    # Average run duration (completed only)
    durations = []
    for r in runs:
        status = str(getattr(r.status, 'value', r.status))
        if status == "COMPLETED" and r.completed_at and r.started_at:
            dur = (r.completed_at - r.started_at).total_seconds() / 60
            durations.append(dur)
    avg_duration_minutes = round(sum(durations) / len(durations), 1) if durations else None

    # Total scans
    run_ids = [r.run_id for r in runs]
    total_scans = 0
    if run_ids:
        total_scans = db.query(PatrolScan).filter(PatrolScan.run_id.in_(run_ids)).count()

    # --- By tour ---
    tour_stats = defaultdict(lambda: {"total": 0, "completed": 0, "abandoned": 0})
    tour_names = {}
    for r in runs:
        status = str(getattr(r.status, 'value', r.status))
        tour_stats[r.tour_id]["total"] += 1
        if status == "COMPLETED":
            tour_stats[r.tour_id]["completed"] += 1
        elif status == "ABANDONED":
            tour_stats[r.tour_id]["abandoned"] += 1

    if tour_stats:
        tours = db.query(PatrolTour).filter(PatrolTour.tour_id.in_(list(tour_stats.keys()))).all()
        for t in tours:
            tour_names[t.tour_id] = {"name": t.name, "site_id": t.site_id}

    by_tour = []
    for tid, stats in sorted(tour_stats.items(), key=lambda x: x[1]["total"], reverse=True):
        info = tour_names.get(tid, {"name": f"Tour #{tid}", "site_id": None})
        rate = round((stats["completed"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0
        by_tour.append({
            "tour_id": tid,
            "tour_name": info["name"],
            "site_id": info["site_id"],
            "total_runs": stats["total"],
            "completed": stats["completed"],
            "abandoned": stats["abandoned"],
            "completion_rate": rate,
        })

    # --- By site ---
    site_stats = defaultdict(lambda: {"total": 0, "completed": 0})
    for tid, stats in tour_stats.items():
        info = tour_names.get(tid, {"name": "", "site_id": None})
        sid = info["site_id"]
        if sid:
            site_stats[sid]["total"] += stats["total"]
            site_stats[sid]["completed"] += stats["completed"]

    site_names = {}
    if site_stats:
        sites = db.query(Site).filter(Site.site_id.in_(list(site_stats.keys()))).all()
        for s in sites:
            site_names[s.site_id] = s.site_name

    by_site = []
    for sid, stats in sorted(site_stats.items(), key=lambda x: x[1]["total"], reverse=True)[:10]:
        rate = round((stats["completed"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0
        by_site.append({
            "site_id": sid,
            "site_name": site_names.get(sid, f"Site #{sid}"),
            "total_runs": stats["total"],
            "completed": stats["completed"],
            "completion_rate": rate,
        })

    # --- Top guards ---
    guard_stats = defaultdict(lambda: {"total": 0, "completed": 0, "scans": 0})
    for r in runs:
        if r.started_by_employee_id:
            status = str(getattr(r.status, 'value', r.status))
            guard_stats[r.started_by_employee_id]["total"] += 1
            if status == "COMPLETED":
                guard_stats[r.started_by_employee_id]["completed"] += 1

    # Count scans per guard
    if run_ids and guard_stats:
        scan_counts = db.query(
            PatrolRun.started_by_employee_id,
            func.count(PatrolScan.scan_id),
        ).join(PatrolScan, PatrolScan.run_id == PatrolRun.run_id).filter(
            PatrolRun.run_id.in_(run_ids),
            PatrolRun.started_by_employee_id.isnot(None),
        ).group_by(PatrolRun.started_by_employee_id).all()
        for emp_id, cnt in scan_counts:
            guard_stats[emp_id]["scans"] = cnt

    guard_names = {}
    if guard_stats:
        emps = db.query(Employee).filter(Employee.employee_id.in_(list(guard_stats.keys()))).all()
        for e in emps:
            guard_names[e.employee_id] = f"{e.first_name} {e.last_name}"

    top_guards = []
    for eid, stats in sorted(guard_stats.items(), key=lambda x: x[1]["completed"], reverse=True)[:10]:
        rate = round((stats["completed"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0
        top_guards.append({
            "employee_id": eid,
            "employee_name": guard_names.get(eid, f"Employee #{eid}"),
            "total_runs": stats["total"],
            "completed": stats["completed"],
            "total_scans": stats["scans"],
            "completion_rate": rate,
        })

    # --- Monthly trend ---
    monthly = defaultdict(lambda: {"total": 0, "completed": 0})
    for r in runs:
        key = r.started_at.strftime("%Y-%m")
        status = str(getattr(r.status, 'value', r.status))
        monthly[key]["total"] += 1
        if status == "COMPLETED":
            monthly[key]["completed"] += 1

    monthly_trend = []
    for month in sorted(monthly.keys()):
        stats = monthly[month]
        rate = round((stats["completed"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0
        monthly_trend.append({
            "month": month,
            "total_runs": stats["total"],
            "completed": stats["completed"],
            "completion_rate": rate,
        })

    # --- Active tours with no recent runs (coverage gaps) ---
    active_tours = db.query(PatrolTour).filter(
        PatrolTour.org_id == org_id,
        PatrolTour.is_active == True,
    ).all()
    tours_with_runs = set(tour_stats.keys())
    coverage_gaps = []
    for t in active_tours:
        if t.tour_id not in tours_with_runs:
            site_name = None
            if t.site_id and t.site_id in site_names:
                site_name = site_names[t.site_id]
            elif t.site_id:
                site_obj = db.query(Site).filter(Site.site_id == t.site_id).first()
                site_name = site_obj.site_name if site_obj else None
            coverage_gaps.append({
                "tour_id": t.tour_id,
                "tour_name": t.name,
                "site_id": t.site_id,
                "site_name": site_name,
            })

    return {
        "period_days": days,
        "total_runs": total_runs,
        "completed": completed,
        "abandoned": abandoned,
        "in_progress": in_progress,
        "completion_rate": completion_rate,
        "avg_duration_minutes": avg_duration_minutes,
        "total_scans": total_scans,
        "active_tours": len(active_tours),
        "coverage_gaps": len(coverage_gaps),
        "by_tour": by_tour,
        "by_site": by_site,
        "top_guards": top_guards,
        "monthly_trend": monthly_trend,
        "gap_tours": coverage_gaps,
    }
