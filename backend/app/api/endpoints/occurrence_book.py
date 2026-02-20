"""Daily Occurrence Book (DOB) endpoints.

Guards log events during shifts; management views and filters site event history.
"""

from datetime import datetime, timedelta, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.occurrence_book import OccurrenceEntry, OccurrenceCategory
from app.models.site import Site
from app.models.employee import Employee
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class EntryCreate(BaseModel):
    site_id: int
    category: str = "general"
    description: str
    action_taken: Optional[str] = None
    occurred_at: Optional[datetime] = None
    shift_id: Optional[int] = None


def _build_response(e: OccurrenceEntry, db: Session) -> dict:
    site = db.query(Site).get(e.site_id)
    emp = db.query(Employee).get(e.employee_id) if e.employee_id else None
    return {
        "entry_id": e.entry_id,
        "site_id": e.site_id,
        "site_name": site.site_name if site else "Unknown",
        "category": e.category,
        "description": e.description,
        "action_taken": e.action_taken,
        "employee_id": e.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
        "shift_id": e.shift_id,
        "occurred_at": e.occurred_at,
        "created_at": e.created_at,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_entries(
    site_id: Optional[int] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    days: int = Query(7, le=365),
    limit: int = Query(100, le=500),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List DOB entries for the org."""
    q = db.query(OccurrenceEntry).filter(OccurrenceEntry.org_id == org_id)

    if site_id:
        q = q.filter(OccurrenceEntry.site_id == site_id)
    if category:
        q = q.filter(OccurrenceEntry.category == category)
    if search:
        like = f"%{search}%"
        q = q.filter((OccurrenceEntry.description.ilike(like)) | (OccurrenceEntry.action_taken.ilike(like)))

    if date_from:
        try:
            q = q.filter(OccurrenceEntry.occurred_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    elif not date_to:
        since = datetime.utcnow() - timedelta(days=days)
        q = q.filter(OccurrenceEntry.occurred_at >= since)

    if date_to:
        try:
            q = q.filter(OccurrenceEntry.occurred_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    total = q.count()
    entries = q.order_by(OccurrenceEntry.occurred_at.desc()).offset(offset).limit(limit).all()

    return {
        "items": [_build_response(e, db) for e in entries],
        "total": total,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_entry(
    body: EntryCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a new DOB entry."""
    site = db.query(Site).filter(Site.site_id == body.site_id, Site.org_id == org_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    emp = db.query(Employee).filter(Employee.email == current_user.email, Employee.org_id == org_id).first()

    entry = OccurrenceEntry(
        org_id=org_id,
        site_id=body.site_id,
        category=body.category,
        description=body.description,
        action_taken=body.action_taken,
        occurred_at=body.occurred_at or datetime.utcnow(),
        shift_id=body.shift_id,
        employee_id=emp.employee_id if emp else None,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return _build_response(entry, db)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def dob_dashboard(
    days: int = Query(30, le=365),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """DOB statistics."""
    since = datetime.utcnow() - timedelta(days=days)
    entries = db.query(OccurrenceEntry).filter(
        OccurrenceEntry.org_id == org_id,
        OccurrenceEntry.occurred_at >= since,
    ).all()

    total = len(entries)

    # By category
    cat_counts: dict = {}
    for e in entries:
        cat_counts[e.category] = cat_counts.get(e.category, 0) + 1

    # By site
    site_map: dict = {}
    for e in entries:
        sid = e.site_id
        if sid not in site_map:
            site = db.query(Site).get(sid)
            site_map[sid] = {"site_id": sid, "site_name": site.site_name if site else "Unknown", "total": 0}
        site_map[sid]["total"] += 1

    # Daily trend (last 7 days)
    daily: dict = {}
    for e in entries:
        d = e.occurred_at.date().isoformat() if e.occurred_at else None
        if d:
            daily[d] = daily.get(d, 0) + 1

    return {
        "period_days": days,
        "total": total,
        "by_category": sorted(cat_counts.items(), key=lambda x: x[1], reverse=True),
        "sites": sorted(site_map.values(), key=lambda x: x["total"], reverse=True),
        "daily_trend": sorted(daily.items()),
    }
