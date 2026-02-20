"""Daily Activity Report (DAR) endpoints."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.daily_activity import DailyActivityReport
from app.models.site import Site
from app.models.employee import Employee
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DARCreate(BaseModel):
    site_id: Optional[int] = None
    employee_id: Optional[int] = None
    shift_id: Optional[int] = None
    report_date: datetime
    shift_start: Optional[datetime] = None
    shift_end: Optional[datetime] = None
    summary: str
    patrols_completed: int = 0
    incidents_reported: int = 0
    visitors_processed: int = 0
    access_denied_count: int = 0
    notable_events: Optional[str] = None
    equipment_issues: Optional[str] = None
    handover_notes: Optional[str] = None


class DARReview(BaseModel):
    reviewer_notes: Optional[str] = None


def _build_response(r: DailyActivityReport, db: Session) -> dict:
    site = db.query(Site).get(r.site_id) if r.site_id else None
    emp = db.query(Employee).get(r.employee_id) if r.employee_id else None
    return {
        "report_id": r.report_id,
        "site_id": r.site_id,
        "site_name": site.site_name if site else None,
        "employee_id": r.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
        "shift_id": r.shift_id,
        "report_date": r.report_date,
        "shift_start": r.shift_start,
        "shift_end": r.shift_end,
        "summary": r.summary,
        "patrols_completed": r.patrols_completed,
        "incidents_reported": r.incidents_reported,
        "visitors_processed": r.visitors_processed,
        "access_denied_count": r.access_denied_count,
        "notable_events": r.notable_events,
        "equipment_issues": r.equipment_issues,
        "handover_notes": r.handover_notes,
        "status": r.status,
        "reviewed_at": r.reviewed_at,
        "reviewer_notes": r.reviewer_notes,
        "created_at": r.created_at,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_dars(
    site_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    days: int = Query(30, le=365),
    limit: int = Query(50, le=200),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List daily activity reports."""
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(DailyActivityReport).filter(
        DailyActivityReport.org_id == org_id,
        DailyActivityReport.report_date >= since,
    )
    if site_id:
        q = q.filter(DailyActivityReport.site_id == site_id)
    if employee_id:
        q = q.filter(DailyActivityReport.employee_id == employee_id)
    if status_filter:
        q = q.filter(DailyActivityReport.status == status_filter)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (DailyActivityReport.summary.ilike(like)) |
            (DailyActivityReport.notable_events.ilike(like))
        )

    total = q.count()
    reports = q.order_by(DailyActivityReport.report_date.desc()).offset(offset).limit(limit).all()
    return {"items": [_build_response(r, db) for r in reports], "total": total}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_dar(
    body: DARCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Submit a daily activity report."""
    r = DailyActivityReport(
        org_id=org_id,
        site_id=body.site_id,
        employee_id=body.employee_id,
        shift_id=body.shift_id,
        report_date=body.report_date,
        shift_start=body.shift_start,
        shift_end=body.shift_end,
        summary=body.summary,
        patrols_completed=body.patrols_completed,
        incidents_reported=body.incidents_reported,
        visitors_processed=body.visitors_processed,
        access_denied_count=body.access_denied_count,
        notable_events=body.notable_events,
        equipment_issues=body.equipment_issues,
        handover_notes=body.handover_notes,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _build_response(r, db)


@router.post("/{report_id}/review/")
def review_dar(
    report_id: int,
    body: DARReview,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a DAR as reviewed."""
    r = db.query(DailyActivityReport).filter(
        DailyActivityReport.report_id == report_id,
        DailyActivityReport.org_id == org_id,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")

    r.status = "reviewed"
    r.reviewed_by_user_id = current_user.user_id
    r.reviewed_at = datetime.utcnow()
    r.reviewer_notes = body.reviewer_notes
    db.commit()
    db.refresh(r)
    return _build_response(r, db)


@router.delete("/{report_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_dar(
    report_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete a DAR."""
    r = db.query(DailyActivityReport).filter(
        DailyActivityReport.report_id == report_id,
        DailyActivityReport.org_id == org_id,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(r)
    db.commit()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def dar_dashboard(
    days: int = Query(30, le=365),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """DAR summary dashboard."""
    since = datetime.utcnow() - timedelta(days=days)
    reports = db.query(DailyActivityReport).filter(
        DailyActivityReport.org_id == org_id,
        DailyActivityReport.report_date >= since,
    ).all()

    total = len(reports)
    submitted = sum(1 for r in reports if r.status == "submitted")
    reviewed = sum(1 for r in reports if r.status == "reviewed")

    total_patrols = sum(r.patrols_completed or 0 for r in reports)
    total_incidents = sum(r.incidents_reported or 0 for r in reports)
    total_visitors = sum(r.visitors_processed or 0 for r in reports)
    total_denied = sum(r.access_denied_count or 0 for r in reports)
    equipment_issues_count = sum(1 for r in reports if r.equipment_issues)

    # By site
    site_map: dict = {}
    for r in reports:
        if r.site_id:
            if r.site_id not in site_map:
                site = db.query(Site).get(r.site_id)
                site_map[r.site_id] = {
                    "site_id": r.site_id,
                    "site_name": site.site_name if site else "Unknown",
                    "count": 0,
                    "pending_review": 0,
                }
            site_map[r.site_id]["count"] += 1
            if r.status == "submitted":
                site_map[r.site_id]["pending_review"] += 1

    # Daily trend (last 7 days)
    daily: dict = {}
    for i in range(min(7, days)):
        d = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        daily[d] = 0
    for r in reports:
        d = r.report_date.strftime("%Y-%m-%d")
        if d in daily:
            daily[d] += 1

    return {
        "period_days": days,
        "total": total,
        "submitted": submitted,
        "reviewed": reviewed,
        "total_patrols": total_patrols,
        "total_incidents": total_incidents,
        "total_visitors": total_visitors,
        "total_access_denied": total_denied,
        "equipment_issues": equipment_issues_count,
        "by_site": sorted(site_map.values(), key=lambda x: x["count"], reverse=True),
        "daily_trend": [{"date": k, "count": v} for k, v in sorted(daily.items())],
    }
