"""Client portal endpoints — self-service views for client users."""

from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.user import User
from app.models.client import Client
from app.models.site import Site
from app.models.shift import Shift
from app.models.incident import Incident
from app.models.client_invoice import ClientInvoice

router = APIRouter()


def _get_client_for_user(current_user: User, org_id: int, db: Session) -> Client:
    """Get the client associated with this portal user."""
    if not current_user.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No client association found. Access denied."
        )
    client = db.query(Client).filter(
        Client.client_id == current_user.client_id,
        Client.org_id == org_id,
    ).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    return client


@router.get("/dashboard")
def portal_dashboard(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Client portal dashboard — key metrics for the client's sites."""
    client = _get_client_for_user(current_user, org_id, db)

    # Get client's sites
    sites = db.query(Site).filter(Site.client_id == client.client_id, Site.org_id == org_id).all()
    site_ids = [s.site_id for s in sites]

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Total sites
    total_sites = len(sites)

    # Active shifts this month
    active_shifts = db.query(func.count(Shift.shift_id)).filter(
        Shift.site_id.in_(site_ids),
        Shift.org_id == org_id,
        Shift.start_time >= month_start,
    ).scalar() or 0

    # Incidents this month
    incidents_count = db.query(func.count(Incident.incident_id)).filter(
        Incident.site_id.in_(site_ids),
        Incident.org_id == org_id,
        Incident.reported_at >= month_start,
    ).scalar() or 0

    # Open incidents
    open_incidents = db.query(func.count(Incident.incident_id)).filter(
        Incident.site_id.in_(site_ids),
        Incident.org_id == org_id,
        Incident.status.in_(["reported", "investigating"]),
    ).scalar() or 0

    return {
        "client_name": client.client_name,
        "total_sites": total_sites,
        "active_shifts_this_month": active_shifts,
        "incidents_this_month": incidents_count,
        "open_incidents": open_incidents,
        "sites": [{"site_id": s.site_id, "site_name": s.site_name, "address": s.address} for s in sites],
    }


@router.get("/incidents")
def portal_incidents(
    site_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """View incidents at the client's sites (read-only)."""
    client = _get_client_for_user(current_user, org_id, db)

    site_ids = [s.site_id for s in db.query(Site).filter(Site.client_id == client.client_id, Site.org_id == org_id).all()]

    query = db.query(Incident).filter(
        Incident.site_id.in_(site_ids),
        Incident.org_id == org_id,
    )

    if site_id and site_id in site_ids:
        query = query.filter(Incident.site_id == site_id)

    incidents = query.order_by(Incident.reported_at.desc()).offset(skip).limit(limit).all()

    return [
        {
            "incident_id": i.incident_id,
            "site_name": i.site.site_name if i.site else None,
            "incident_type": i.incident_type,
            "description": i.description,
            "severity": i.severity.value if hasattr(i.severity, 'value') else i.severity,
            "status": i.status.value if hasattr(i.status, 'value') else i.status,
            "reported_at": i.reported_at.isoformat() if i.reported_at else None,
            "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
        }
        for i in incidents
    ]


@router.get("/schedule")
def portal_schedule(
    site_id: Optional[int] = None,
    days: int = 7,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """View guard schedule for the client's sites."""
    client = _get_client_for_user(current_user, org_id, db)

    site_ids = [s.site_id for s in db.query(Site).filter(Site.client_id == client.client_id, Site.org_id == org_id).all()]

    now = datetime.utcnow()
    end_date = now + timedelta(days=days)

    query = db.query(Shift).filter(
        Shift.site_id.in_(site_ids),
        Shift.org_id == org_id,
        Shift.start_time >= now,
        Shift.start_time <= end_date,
    )

    if site_id and site_id in site_ids:
        query = query.filter(Shift.site_id == site_id)

    shifts = query.order_by(Shift.start_time.asc()).all()

    return [
        {
            "shift_id": s.shift_id,
            "site_name": s.site.site_name if s.site else None,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "guards_required": s.required_staff,
            "status": s.status.value if hasattr(s.status, 'value') else s.status,
        }
        for s in shifts
    ]


@router.get("/invoices")
def portal_invoices(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """View invoices for the client."""
    client = _get_client_for_user(current_user, org_id, db)

    invoices = (
        db.query(ClientInvoice)
        .filter(ClientInvoice.client_id == client.client_id, ClientInvoice.org_id == org_id)
        .order_by(ClientInvoice.invoice_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        {
            "invoice_id": inv.invoice_id,
            "invoice_number": inv.invoice_number,
            "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "total_amount": float(inv.total_amount) if inv.total_amount else 0,
            "status": inv.status,
            "period_start": inv.period_start.isoformat() if inv.period_start else None,
            "period_end": inv.period_end.isoformat() if inv.period_end else None,
        }
        for inv in invoices
    ]
