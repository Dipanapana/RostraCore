"""
Shift exception management endpoints.

Handles the lifecycle of operational exceptions:
no-shows, late arrivals, AWOL, relief-required, etc.
"""

from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.auth.security import get_current_org_id
from app.models.user import User
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.site import Site
from app.models.shift_exception import ShiftException

router = APIRouter()

VALID_TYPES = {
    "no_show",
    "late_arrival",
    "early_departure",
    "awol",
    "relief_required",
    "equipment_issue",
    "other",
}

VALID_STATUSES = {"open", "in_progress", "resolved", "escalated"}


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ExceptionCreate(BaseModel):
    exception_type: str
    exception_date: date
    employee_id: Optional[int] = None
    shift_id: Optional[int] = None
    site_id: Optional[int] = None
    description: Optional[str] = None


class ExceptionStatusUpdate(BaseModel):
    status: str
    resolution_notes: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _caller_name(user: User) -> str:
    return (
        f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
        or user.email
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/summary")
async def get_exceptions_summary(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Return open/in-progress exception counts by type.
    Used for dashboard badges and the exceptions overview page header.
    """
    exceptions = db.query(ShiftException).filter(
        ShiftException.org_id == org_id,
        ShiftException.status.in_(["open", "in_progress", "escalated"]),
    ).all()

    type_counts: dict = {}
    status_counts = {"open": 0, "in_progress": 0, "escalated": 0}

    for ex in exceptions:
        type_counts[ex.exception_type] = type_counts.get(ex.exception_type, 0) + 1
        status_counts[ex.status] = status_counts.get(ex.status, 0) + 1

    return {
        "total_active": len(exceptions),
        "by_type": type_counts,
        "by_status": status_counts,
    }


@router.get("/")
async def list_exceptions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    exception_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    site_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List exceptions with optional filters."""
    query = db.query(ShiftException).filter(ShiftException.org_id == org_id)

    if start_date:
        query = query.filter(ShiftException.exception_date >= start_date)
    if end_date:
        query = query.filter(ShiftException.exception_date <= end_date)
    if exception_type:
        query = query.filter(ShiftException.exception_type == exception_type)
    if status_filter:
        query = query.filter(ShiftException.status == status_filter)
    if site_id:
        query = query.filter(ShiftException.site_id == site_id)
    if employee_id:
        query = query.filter(ShiftException.employee_id == employee_id)

    total = query.count()
    exceptions = query.order_by(ShiftException.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [ex.to_dict() for ex in exceptions],
    }


@router.post("/", status_code=201)
async def create_exception(
    payload: ExceptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a new operational exception."""
    if payload.exception_type not in VALID_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"exception_type must be one of: {', '.join(sorted(VALID_TYPES))}",
        )

    org_id = current_user.org_id
    if not org_id:
        raise HTTPException(status_code=403, detail="User has no organization")

    # Validate employee belongs to org (if provided)
    if payload.employee_id:
        emp = db.query(Employee).filter(
            Employee.employee_id == payload.employee_id,
            Employee.org_id == org_id,
        ).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")

    # Validate site belongs to org (if provided)
    if payload.site_id:
        site = db.query(Site).filter(
            Site.site_id == payload.site_id,
            Site.org_id == org_id,
        ).first()
        if not site:
            raise HTTPException(status_code=404, detail="Site not found")

    # Auto-populate site_id from shift if not provided
    effective_site_id = payload.site_id
    if payload.shift_id and not effective_site_id:
        shift = db.query(Shift).filter(
            Shift.shift_id == payload.shift_id,
            Shift.org_id == org_id,
        ).first()
        if shift:
            effective_site_id = shift.site_id

    ex = ShiftException(
        org_id=org_id,
        shift_id=payload.shift_id,
        employee_id=payload.employee_id,
        site_id=effective_site_id,
        exception_type=payload.exception_type,
        exception_date=payload.exception_date,
        description=payload.description,
        status="open",
        reported_by_id=current_user.user_id,
        reported_by_name=_caller_name(current_user),
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex.to_dict()


@router.get("/{exception_id}")
async def get_exception(
    exception_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single exception record."""
    org_id = current_user.org_id
    ex = db.query(ShiftException).filter(
        ShiftException.exception_id == exception_id,
        ShiftException.org_id == org_id,
    ).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exception not found")
    return ex.to_dict()


@router.put("/{exception_id}/status")
async def update_exception_status(
    exception_id: int,
    payload: ExceptionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the status of an exception (open → in_progress → resolved | escalated).
    When resolving, resolution_notes are recorded along with the resolver's name.
    """
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"status must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )

    org_id = current_user.org_id
    ex = db.query(ShiftException).filter(
        ShiftException.exception_id == exception_id,
        ShiftException.org_id == org_id,
    ).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exception not found")

    ex.status = payload.status
    if payload.resolution_notes:
        ex.resolution_notes = payload.resolution_notes

    if payload.status in ("resolved", "escalated"):
        ex.resolved_by_id = current_user.user_id
        ex.resolved_by_name = _caller_name(current_user)
        ex.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(ex)
    return ex.to_dict()


@router.delete("/{exception_id}", status_code=204)
async def delete_exception(
    exception_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an exception (admin only, e.g. logged in error)."""
    org_id = current_user.org_id
    ex = db.query(ShiftException).filter(
        ShiftException.exception_id == exception_id,
        ShiftException.org_id == org_id,
    ).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exception not found")
    db.delete(ex)
    db.commit()
    return None
