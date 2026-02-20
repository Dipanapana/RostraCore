"""Incident analytics — trends, breakdowns, and resolution metrics."""

from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.incident import Incident
from app.models.site import Site
from app.models.employee import Employee
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/dashboard")
def incident_dashboard(
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Incident analytics dashboard with breakdowns and trends."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    records = db.query(Incident).filter(
        Incident.org_id == org_id,
        Incident.reported_at >= cutoff,
    ).all()

    total = len(records)
    open_count = sum(1 for r in records if r.status in ("REPORTED", "INVESTIGATING"))
    resolved_count = sum(1 for r in records if r.status in ("RESOLVED", "CLOSED"))
    critical_count = sum(1 for r in records if str(r.severity) == "CRITICAL" or str(getattr(r.severity, 'value', r.severity)) == "CRITICAL")

    # Resolution time stats (for resolved incidents with resolved_at)
    resolution_times = []
    for r in records:
        if r.resolved_at and r.reported_at:
            delta = (r.resolved_at - r.reported_at).total_seconds() / 3600  # hours
            resolution_times.append(delta)
    avg_resolution_hrs = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else None

    # By severity
    by_severity: dict = {}
    for r in records:
        sev = str(getattr(r.severity, 'value', r.severity)) if r.severity else "UNKNOWN"
        by_severity[sev] = by_severity.get(sev, 0) + 1

    # By type
    by_type: dict = {}
    for r in records:
        t = r.incident_type or "other"
        by_type[t] = by_type.get(t, 0) + 1

    # By status
    by_status: dict = {}
    for r in records:
        s = str(getattr(r.status, 'value', r.status)) if r.status else "UNKNOWN"
        by_status[s] = by_status.get(s, 0) + 1

    # Top sites by incidents
    site_counts: dict = {}
    for r in records:
        if r.site_id:
            site_counts[r.site_id] = site_counts.get(r.site_id, 0) + 1
    top_sites = []
    for sid, count in sorted(site_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        site = db.query(Site).get(sid)
        top_sites.append({
            "site_id": sid,
            "site_name": site.site_name if site else f"Site {sid}",
            "count": count,
        })

    # Monthly trend (last 6 months)
    monthly: dict = {}
    for r in records:
        if r.reported_at:
            key = r.reported_at.strftime("%Y-%m")
            monthly[key] = monthly.get(key, 0) + 1
    monthly_trend = [{"month": k, "count": v} for k, v in sorted(monthly.items())]

    return {
        "period_days": days,
        "total_incidents": total,
        "open": open_count,
        "resolved": resolved_count,
        "critical": critical_count,
        "avg_resolution_hours": avg_resolution_hrs,
        "by_severity": by_severity,
        "by_type": by_type,
        "by_status": by_status,
        "top_sites": top_sites,
        "monthly_trend": monthly_trend,
    }
