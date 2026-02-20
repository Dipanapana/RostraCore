"""Visitor management endpoints.

Guards sign visitors in/out at sites; management views visitor logs.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.visitor import Visitor, VisitorStatus
from app.models.site import Site
from app.models.employee import Employee
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class VisitorSignIn(BaseModel):
    site_id: int
    full_name: str
    id_number: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    vehicle_reg: Optional[str] = None
    purpose: str
    visiting_person: Optional[str] = None
    badge_number: Optional[str] = None
    expected_out_at: Optional[datetime] = None
    notes: Optional[str] = None


class VisitorSignOut(BaseModel):
    notes: Optional[str] = None


def _build_response(v: Visitor, db: Session) -> dict:
    site = db.query(Site).get(v.site_id)
    guard = db.query(Employee).get(v.processed_by) if v.processed_by else None
    return {
        "visitor_id": v.visitor_id,
        "site_id": v.site_id,
        "site_name": site.site_name if site else "Unknown",
        "full_name": v.full_name,
        "id_number": v.id_number,
        "company": v.company,
        "phone": v.phone,
        "vehicle_reg": v.vehicle_reg,
        "purpose": v.purpose,
        "visiting_person": v.visiting_person,
        "badge_number": v.badge_number,
        "status": v.status,
        "signed_in_at": v.signed_in_at,
        "signed_out_at": v.signed_out_at,
        "expected_out_at": v.expected_out_at,
        "processed_by_name": f"{guard.first_name} {guard.last_name}" if guard else None,
        "notes": v.notes,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_visitors(
    site_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    days: int = Query(7, le=365),
    limit: int = Query(50, le=200),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List visitor records for the org."""
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(Visitor).filter(
        Visitor.org_id == org_id,
        Visitor.signed_in_at >= since,
    )

    if site_id:
        q = q.filter(Visitor.site_id == site_id)
    if status_filter:
        q = q.filter(Visitor.status == status_filter)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Visitor.full_name.ilike(like)) |
            (Visitor.company.ilike(like)) |
            (Visitor.id_number.ilike(like)) |
            (Visitor.vehicle_reg.ilike(like))
        )

    total = q.count()
    visitors = q.order_by(Visitor.signed_in_at.desc()).offset(offset).limit(limit).all()

    return {
        "items": [_build_response(v, db) for v in visitors],
        "total": total,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def sign_in_visitor(
    body: VisitorSignIn,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sign in a visitor at a site."""
    # Verify site belongs to org
    site = db.query(Site).filter(Site.site_id == body.site_id, Site.org_id == org_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    # Find employee by current user
    emp = db.query(Employee).filter(Employee.email == current_user.email, Employee.org_id == org_id).first()

    v = Visitor(
        org_id=org_id,
        site_id=body.site_id,
        full_name=body.full_name,
        id_number=body.id_number,
        company=body.company,
        phone=body.phone,
        vehicle_reg=body.vehicle_reg,
        purpose=body.purpose,
        visiting_person=body.visiting_person,
        badge_number=body.badge_number,
        expected_out_at=body.expected_out_at,
        notes=body.notes,
        status=VisitorStatus.SIGNED_IN.value,
        processed_by=emp.employee_id if emp else None,
    )
    db.add(v)
    db.commit()
    db.refresh(v)

    return _build_response(v, db)


@router.post("/{visitor_id}/sign-out/")
def sign_out_visitor(
    visitor_id: int,
    body: VisitorSignOut,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sign out a visitor."""
    v = db.query(Visitor).filter(
        Visitor.visitor_id == visitor_id,
        Visitor.org_id == org_id,
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visitor not found")

    if v.status == VisitorStatus.SIGNED_OUT.value:
        raise HTTPException(status_code=400, detail="Visitor already signed out")

    emp = db.query(Employee).filter(Employee.email == current_user.email, Employee.org_id == org_id).first()

    v.status = VisitorStatus.SIGNED_OUT.value
    v.signed_out_at = datetime.utcnow()
    v.signed_out_by = emp.employee_id if emp else None
    if body.notes:
        v.notes = (v.notes + "\n" + body.notes) if v.notes else body.notes
    db.commit()
    db.refresh(v)

    return _build_response(v, db)


# ---------------------------------------------------------------------------
# Currently on site
# ---------------------------------------------------------------------------

@router.get("/on-site/")
def visitors_on_site(
    site_id: Optional[int] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get count and list of visitors currently signed in."""
    q = db.query(Visitor).filter(
        Visitor.org_id == org_id,
        Visitor.status == VisitorStatus.SIGNED_IN.value,
    )
    if site_id:
        q = q.filter(Visitor.site_id == site_id)

    visitors = q.order_by(Visitor.signed_in_at.desc()).all()

    return {
        "count": len(visitors),
        "visitors": [_build_response(v, db) for v in visitors],
    }


# ---------------------------------------------------------------------------
# DASHBOARD
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def visitor_dashboard(
    days: int = Query(30, le=365),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Visitor statistics for the last N days."""
    since = datetime.utcnow() - timedelta(days=days)

    visitors = db.query(Visitor).filter(
        Visitor.org_id == org_id,
        Visitor.signed_in_at >= since,
    ).all()

    total = len(visitors)
    currently_in = sum(1 for v in visitors if v.status == VisitorStatus.SIGNED_IN.value)
    signed_out = sum(1 for v in visitors if v.status == VisitorStatus.SIGNED_OUT.value)

    # Per-site breakdown
    site_map: dict = {}
    for v in visitors:
        sid = v.site_id
        if sid not in site_map:
            site = db.query(Site).get(sid)
            site_map[sid] = {
                "site_id": sid,
                "site_name": site.site_name if site else "Unknown",
                "total": 0,
                "currently_in": 0,
            }
        site_map[sid]["total"] += 1
        if v.status == VisitorStatus.SIGNED_IN.value:
            site_map[sid]["currently_in"] += 1

    # Busiest hours
    hour_counts: dict = {}
    for v in visitors:
        h = v.signed_in_at.hour if v.signed_in_at else 0
        hour_counts[h] = hour_counts.get(h, 0) + 1

    # Top companies visiting
    company_counts: dict = {}
    for v in visitors:
        c = v.company or "Individual"
        company_counts[c] = company_counts.get(c, 0) + 1

    return {
        "period_days": days,
        "total_visitors": total,
        "currently_in": currently_in,
        "signed_out": signed_out,
        "sites": sorted(site_map.values(), key=lambda x: x["total"], reverse=True),
        "busiest_hours": sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)[:5],
        "top_companies": sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:10],
    }
