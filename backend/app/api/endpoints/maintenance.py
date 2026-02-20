"""Site maintenance request endpoints."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.maintenance import MaintenanceRequest
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()

VALID_STATUSES = {"open", "in_progress", "on_hold", "completed", "cancelled"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}
CATEGORIES = ["electrical", "plumbing", "structural", "security_equipment", "hvac", "cleaning", "other"]


class MaintenanceCreate(BaseModel):
    site_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: str = "medium"
    assigned_to: Optional[str] = None
    estimated_cost: Optional[int] = None


class MaintenanceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    estimated_cost: Optional[int] = None
    actual_cost: Optional[int] = None
    completion_notes: Optional[str] = None


def _build_response(r: MaintenanceRequest, db: Session) -> dict:
    site = db.query(Site).get(r.site_id) if r.site_id else None
    return {
        "request_id": r.request_id,
        "site_id": r.site_id,
        "site_name": site.site_name if site else None,
        "title": r.title,
        "description": r.description,
        "category": r.category,
        "priority": r.priority,
        "status": r.status,
        "reported_by_user_id": r.reported_by_user_id,
        "reported_by_name": r.reported_by_name,
        "assigned_to": r.assigned_to,
        "estimated_cost": r.estimated_cost,
        "actual_cost": r.actual_cost,
        "completed_at": r.completed_at,
        "completion_notes": r.completion_notes,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    }


@router.get("/")
def list_maintenance(
    site_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    days: int = Query(90, le=365),
    limit: int = Query(100, le=500),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List maintenance requests."""
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.org_id == org_id,
        MaintenanceRequest.created_at >= since,
    )
    if site_id:
        q = q.filter(MaintenanceRequest.site_id == site_id)
    if status_filter:
        q = q.filter(MaintenanceRequest.status == status_filter)
    if priority:
        q = q.filter(MaintenanceRequest.priority == priority)
    if category:
        q = q.filter(MaintenanceRequest.category == category)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (MaintenanceRequest.title.ilike(like)) |
            (MaintenanceRequest.description.ilike(like))
        )

    total = q.count()
    items = q.order_by(MaintenanceRequest.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": [_build_response(r, db) for r in items], "total": total}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_maintenance(
    body: MaintenanceCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a new maintenance request."""
    r = MaintenanceRequest(
        org_id=org_id,
        site_id=body.site_id if body.site_id else None,
        title=body.title,
        description=body.description,
        category=body.category,
        priority=body.priority,
        assigned_to=body.assigned_to,
        estimated_cost=body.estimated_cost,
        reported_by_user_id=current_user.user_id,
        reported_by_name=current_user.full_name or current_user.email,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _build_response(r, db)


@router.put("/{request_id}/")
def update_maintenance(
    request_id: int,
    body: MaintenanceUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update a maintenance request."""
    r = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.request_id == request_id,
        MaintenanceRequest.org_id == org_id,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")

    for field, val in body.model_dump(exclude_unset=True).items():
        if field == "status" and val not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status: {val}")
        if field == "priority" and val not in VALID_PRIORITIES:
            raise HTTPException(status_code=400, detail=f"Invalid priority: {val}")
        setattr(r, field, val)

    if body.status == "completed" and not r.completed_at:
        r.completed_at = datetime.utcnow()
    r.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return _build_response(r, db)


@router.delete("/{request_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance(
    request_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete a maintenance request."""
    r = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.request_id == request_id,
        MaintenanceRequest.org_id == org_id,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    db.delete(r)
    db.commit()


@router.get("/dashboard/")
def maintenance_dashboard(
    days: int = Query(90, le=365),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Maintenance requests dashboard."""
    since = datetime.utcnow() - timedelta(days=days)
    requests = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.org_id == org_id,
        MaintenanceRequest.created_at >= since,
    ).all()

    total = len(requests)
    open_count = sum(1 for r in requests if r.status == "open")
    in_progress = sum(1 for r in requests if r.status == "in_progress")
    completed = sum(1 for r in requests if r.status == "completed")
    on_hold = sum(1 for r in requests if r.status == "on_hold")

    critical = sum(1 for r in requests if r.priority == "critical" and r.status in ("open", "in_progress"))
    total_est = sum(r.estimated_cost or 0 for r in requests)
    total_actual = sum(r.actual_cost or 0 for r in requests if r.status == "completed")

    # By category
    cat_counts: dict = {}
    for r in requests:
        cat = r.category or "other"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    # By site
    site_counts: dict = {}
    for r in requests:
        if r.site_id:
            if r.site_id not in site_counts:
                site = db.query(Site).get(r.site_id)
                site_counts[r.site_id] = {
                    "site_id": r.site_id,
                    "site_name": site.site_name if site else "Unknown",
                    "count": 0, "open": 0,
                }
            site_counts[r.site_id]["count"] += 1
            if r.status in ("open", "in_progress"):
                site_counts[r.site_id]["open"] += 1

    return {
        "period_days": days,
        "total": total,
        "open": open_count,
        "in_progress": in_progress,
        "completed": completed,
        "on_hold": on_hold,
        "critical_open": critical,
        "total_estimated_cost": total_est,
        "total_actual_cost": total_actual,
        "by_category": sorted(cat_counts.items(), key=lambda x: x[1], reverse=True),
        "by_site": sorted(site_counts.values(), key=lambda x: x["count"], reverse=True),
    }
