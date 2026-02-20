"""Control room / communication log endpoints."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.comm_log import CommLog, CommType, CommPriority
from app.models.site import Site
from app.models.employee import Employee
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CommLogCreate(BaseModel):
    site_id: Optional[int] = None
    comm_type: str = "radio"
    priority: str = "normal"
    subject: str
    message: Optional[str] = None
    from_name: Optional[str] = None
    to_name: Optional[str] = None
    employee_id: Optional[int] = None


class CommLogResolve(BaseModel):
    resolution_notes: Optional[str] = None
    resolved: str = "resolved"  # resolved, escalated


def _build_response(c: CommLog, db: Session) -> dict:
    site = db.query(Site).get(c.site_id) if c.site_id else None
    emp = db.query(Employee).get(c.employee_id) if c.employee_id else None
    return {
        "log_id": c.log_id,
        "site_id": c.site_id,
        "site_name": site.site_name if site else None,
        "comm_type": c.comm_type,
        "priority": c.priority,
        "subject": c.subject,
        "message": c.message,
        "from_name": c.from_name,
        "to_name": c.to_name,
        "employee_id": c.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
        "resolved": c.resolved,
        "resolution_notes": c.resolution_notes,
        "resolved_at": c.resolved_at,
        "created_at": c.created_at,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_comm_logs(
    site_id: Optional[int] = None,
    comm_type: Optional[str] = None,
    priority: Optional[str] = None,
    resolved_filter: Optional[str] = Query(None, alias="resolved"),
    search: Optional[str] = None,
    days: int = Query(30, le=365),
    limit: int = Query(50, le=200),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List communication logs."""
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(CommLog).filter(CommLog.org_id == org_id, CommLog.created_at >= since)

    if site_id:
        q = q.filter(CommLog.site_id == site_id)
    if comm_type:
        q = q.filter(CommLog.comm_type == comm_type)
    if priority:
        q = q.filter(CommLog.priority == priority)
    if resolved_filter:
        q = q.filter(CommLog.resolved == resolved_filter)
    if search:
        like = f"%{search}%"
        q = q.filter((CommLog.subject.ilike(like)) | (CommLog.message.ilike(like)))

    total = q.count()
    logs = q.order_by(CommLog.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "items": [_build_response(c, db) for c in logs],
        "total": total,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_comm_log(
    body: CommLogCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a new communication / alert."""
    c = CommLog(
        org_id=org_id,
        site_id=body.site_id,
        comm_type=body.comm_type,
        priority=body.priority,
        subject=body.subject,
        message=body.message,
        from_name=body.from_name,
        to_name=body.to_name,
        employee_id=body.employee_id,
        logged_by=current_user.user_id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _build_response(c, db)


@router.post("/{log_id}/resolve/")
def resolve_comm_log(
    log_id: int,
    body: CommLogResolve,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Resolve or escalate a communication log entry."""
    c = db.query(CommLog).filter(CommLog.log_id == log_id, CommLog.org_id == org_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Log not found")

    c.resolved = body.resolved
    c.resolution_notes = body.resolution_notes
    c.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return _build_response(c, db)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def comm_dashboard(
    days: int = Query(30, le=365),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Communication log statistics."""
    since = datetime.utcnow() - timedelta(days=days)
    logs = db.query(CommLog).filter(CommLog.org_id == org_id, CommLog.created_at >= since).all()

    total = len(logs)
    open_count = sum(1 for c in logs if c.resolved == "open")
    resolved = sum(1 for c in logs if c.resolved == "resolved")
    escalated = sum(1 for c in logs if c.resolved == "escalated")

    # By type
    type_counts: dict = {}
    for c in logs:
        type_counts[c.comm_type] = type_counts.get(c.comm_type, 0) + 1

    # By priority
    priority_counts: dict = {}
    for c in logs:
        priority_counts[c.priority] = priority_counts.get(c.priority, 0) + 1

    # By site
    site_map: dict = {}
    for c in logs:
        if c.site_id:
            if c.site_id not in site_map:
                site = db.query(Site).get(c.site_id)
                site_map[c.site_id] = {"site_id": c.site_id, "site_name": site.site_name if site else "Unknown", "total": 0, "open": 0}
            site_map[c.site_id]["total"] += 1
            if c.resolved == "open":
                site_map[c.site_id]["open"] += 1

    return {
        "period_days": days,
        "total": total,
        "open": open_count,
        "resolved": resolved,
        "escalated": escalated,
        "by_type": sorted(type_counts.items(), key=lambda x: x[1], reverse=True),
        "by_priority": priority_counts,
        "sites": sorted(site_map.values(), key=lambda x: x["total"], reverse=True),
    }
