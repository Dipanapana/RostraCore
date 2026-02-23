"""Incident reporting endpoints for the mobile app."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class IncidentCreate(BaseModel):
    site_id: Optional[int] = None
    shift_id: Optional[int] = None
    incident_type: str          # theft, violence, medical, trespassing, fire, vandalism, other
    description: str
    severity: str = IncidentSeverity.MEDIUM
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_urls: Optional[List[str]] = None


class IncidentResponse(BaseModel):
    incident_id: int
    org_id: int
    site_id: Optional[int]
    shift_id: Optional[int]
    incident_type: str
    description: str
    severity: str
    status: str
    latitude: Optional[float]
    longitude: Optional[float]
    photo_urls: Optional[List[str]]
    reported_at: str
    resolved_at: Optional[str]
    resolution_notes: Optional[str]

    class Config:
        from_attributes = True


def _to_response(incident: Incident) -> dict:
    return {
        "incident_id": incident.incident_id,
        "org_id": incident.org_id,
        "site_id": incident.site_id,
        "shift_id": incident.shift_id,
        "incident_type": incident.incident_type,
        "description": incident.description,
        "severity": incident.severity.value if hasattr(incident.severity, 'value') else incident.severity,
        "status": incident.status.value if hasattr(incident.status, 'value') else incident.status,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "photo_urls": incident.photo_urls or [],
        "reported_at": incident.reported_at.isoformat() if incident.reported_at else None,
        "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
        "resolution_notes": incident.resolution_notes,
        "site_name": incident.site.site_name if incident.site else None,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED)
def report_incident(
    data: IncidentCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Submit a security incident report from the mobile app.

    Automatically links the report to the guard's employee record.
    """
    # Resolve employee from user email (guards use linked user accounts)
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()

    # Validate severity value
    valid_severities = [s.value for s in IncidentSeverity]
    if data.severity not in valid_severities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid severity. Must be one of: {valid_severities}",
        )

    incident = Incident(
        org_id=org_id,
        site_id=data.site_id,
        shift_id=data.shift_id,
        reported_by_employee_id=employee.employee_id if employee else None,
        reported_by_user_id=current_user.user_id,
        incident_type=data.incident_type,
        description=data.description,
        severity=data.severity,
        status=IncidentStatus.REPORTED,
        latitude=data.latitude,
        longitude=data.longitude,
        photo_urls=data.photo_urls,
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    from app.services.push_service import PushService
    PushService(db).notify_incident_reported(incident, org_id)

    return _to_response(incident)


@router.get("/mine")
def get_my_incidents(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Return the current guard's own submitted incident reports, most recent first."""
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()

    query = db.query(Incident).filter(Incident.org_id == org_id)

    if employee:
        query = query.filter(Incident.reported_by_employee_id == employee.employee_id)
    else:
        query = query.filter(Incident.reported_by_user_id == current_user.user_id)

    incidents = query.order_by(Incident.reported_at.desc()).limit(50).all()

    return [_to_response(i) for i in incidents]


@router.get("/")
def list_incidents(
    site_id: Optional[int] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    List all incidents for the organisation (admin / scheduler access).

    Supports filtering by site, severity, and status.
    """
    query = db.query(Incident).filter(Incident.org_id == org_id)

    if site_id:
        query = query.filter(Incident.site_id == site_id)
    if severity:
        query = query.filter(Incident.severity == severity)
    if status_filter:
        query = query.filter(Incident.status == status_filter)

    incidents = query.order_by(Incident.reported_at.desc()).offset(skip).limit(limit).all()

    return [_to_response(i) for i in incidents]


@router.get("/{incident_id}")
def get_incident(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get a single incident by ID."""
    incident = db.query(Incident).filter(
        Incident.incident_id == incident_id,
        Incident.org_id == org_id,
    ).first()

    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    return _to_response(incident)


@router.patch("/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    new_status: str,
    resolution_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update the status of an incident (admin/scheduler only)."""
    valid_statuses = [s.value for s in IncidentStatus]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}",
        )

    incident = db.query(Incident).filter(
        Incident.incident_id == incident_id,
        Incident.org_id == org_id,
    ).first()

    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    incident.status = new_status
    if resolution_notes:
        incident.resolution_notes = resolution_notes
    if new_status in (IncidentStatus.RESOLVED, IncidentStatus.CLOSED):
        incident.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(incident)

    return _to_response(incident)
