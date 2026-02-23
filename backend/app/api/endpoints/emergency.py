"""Emergency alert endpoints for panic/duress button functionality."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.emergency_alert import EmergencyAlert, AlertType, AlertStatus
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PanicTrigger(BaseModel):
    alert_type: str = "panic"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    site_id: Optional[int] = None
    shift_id: Optional[int] = None
    notes: Optional[str] = None


class AlertAcknowledge(BaseModel):
    notes: Optional[str] = None


class AlertResolve(BaseModel):
    resolution_notes: str
    false_alarm: bool = False


class AlertResponse(BaseModel):
    alert_id: int
    org_id: int
    employee_id: Optional[int]
    employee_name: Optional[str] = None
    alert_type: str
    status: str
    latitude: Optional[float]
    longitude: Optional[float]
    site_id: Optional[int]
    site_name: Optional[str] = None
    shift_id: Optional[int]
    notes: Optional[str]
    related_incident_id: Optional[int]
    acknowledged_by_user_id: Optional[int]
    acknowledged_at: Optional[str]
    resolved_at: Optional[str]
    resolution_notes: Optional[str]
    triggered_at: str
    triggered_by_name: Optional[str] = None

    class Config:
        from_attributes = True


def _to_response(alert: EmergencyAlert) -> dict:
    employee_name = None
    if alert.employee:
        employee_name = f"{alert.employee.first_name} {alert.employee.last_name}"

    triggered_by_name = None
    if alert.triggered_by:
        triggered_by_name = alert.triggered_by.full_name if hasattr(alert.triggered_by, 'full_name') else alert.triggered_by.email

    return {
        "alert_id": alert.alert_id,
        "org_id": alert.org_id,
        "employee_id": alert.employee_id,
        "employee_name": employee_name,
        "alert_type": alert.alert_type.value if hasattr(alert.alert_type, 'value') else alert.alert_type,
        "status": alert.status.value if hasattr(alert.status, 'value') else alert.status,
        "latitude": alert.latitude,
        "longitude": alert.longitude,
        "site_id": alert.site_id,
        "site_name": alert.site.site_name if alert.site else None,
        "shift_id": alert.shift_id,
        "notes": alert.notes,
        "related_incident_id": alert.related_incident_id,
        "acknowledged_by_user_id": alert.acknowledged_by_user_id,
        "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
        "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
        "resolution_notes": alert.resolution_notes,
        "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
        "triggered_by_name": triggered_by_name,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/panic", status_code=status.HTTP_201_CREATED)
def trigger_panic(
    data: PanicTrigger,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Trigger a panic/duress alert. Designed for speed -- minimal payload required.

    Automatically:
    - Creates an emergency alert record
    - Creates a linked high-priority incident
    - Notifies all supervisors/admins in the organization
    """
    # Validate alert type
    valid_types = [t.value for t in AlertType]
    if data.alert_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid alert type. Must be one of: {valid_types}",
        )

    # Find employee record for this user
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()

    # Create emergency alert
    alert = EmergencyAlert(
        org_id=org_id,
        employee_id=employee.employee_id if employee else None,
        triggered_by_user_id=current_user.user_id,
        alert_type=data.alert_type,
        status="active",
        latitude=data.latitude,
        longitude=data.longitude,
        site_id=data.site_id,
        shift_id=data.shift_id,
        notes=data.notes,
    )
    db.add(alert)
    db.flush()  # Get the alert_id

    # Auto-create a linked critical incident
    guard_name = f"{employee.first_name} {employee.last_name}" if employee else current_user.email
    incident = Incident(
        org_id=org_id,
        site_id=data.site_id,
        shift_id=data.shift_id,
        reported_by_employee_id=employee.employee_id if employee else None,
        reported_by_user_id=current_user.user_id,
        incident_type=f"emergency_{data.alert_type}",
        description=f"EMERGENCY ALERT: {data.alert_type.upper()} button triggered by {guard_name}. {data.notes or ''}".strip(),
        severity=IncidentSeverity.CRITICAL,
        status=IncidentStatus.REPORTED,
        latitude=data.latitude,
        longitude=data.longitude,
    )
    db.add(incident)
    db.flush()

    alert.related_incident_id = incident.incident_id
    db.commit()
    db.refresh(alert)

    # Build response BEFORE push notifications (which may corrupt session state)
    try:
        response_data = _to_response(alert)
    except Exception:
        response_data = {
            "alert_id": alert.alert_id,
            "org_id": alert.org_id,
            "employee_id": alert.employee_id,
            "alert_type": alert.alert_type,
            "status": alert.status,
            "latitude": alert.latitude,
            "longitude": alert.longitude,
            "site_id": alert.site_id,
            "shift_id": alert.shift_id,
            "notes": alert.notes,
            "related_incident_id": alert.related_incident_id,
            "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
        }

    # Notify all admins/supervisors
    try:
        from app.services.push_service import PushService
        push = PushService(db)
        push.notify_incident_reported(incident, org_id)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    return response_data


@router.get("/active")
def get_active_alerts(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all active (unresolved) emergency alerts for the organization."""
    alerts = (
        db.query(EmergencyAlert)
        .filter(
            EmergencyAlert.org_id == org_id,
            EmergencyAlert.status.in_(["active", "acknowledged", "dispatched"]),
        )
        .order_by(EmergencyAlert.triggered_at.desc())
        .all()
    )
    return [_to_response(a) for a in alerts]


@router.get("/")
def list_all_alerts(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all emergency alerts with optional status filter."""
    query = db.query(EmergencyAlert).filter(EmergencyAlert.org_id == org_id)

    if status_filter:
        query = query.filter(EmergencyAlert.status == status_filter)

    alerts = query.order_by(EmergencyAlert.triggered_at.desc()).offset(skip).limit(limit).all()
    total = query.count()

    return {"alerts": [_to_response(a) for a in alerts], "total": total}


@router.put("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    data: AlertAcknowledge,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Supervisor acknowledges an emergency alert."""
    alert = db.query(EmergencyAlert).filter(
        EmergencyAlert.alert_id == alert_id,
        EmergencyAlert.org_id == org_id,
    ).first()

    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

    if alert.status not in ("active",):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Alert is already {alert.status.value if hasattr(alert.status, 'value') else alert.status}.",
        )

    alert.status = "acknowledged"
    alert.acknowledged_by_user_id = current_user.user_id
    alert.acknowledged_at = datetime.utcnow()
    if data.notes:
        alert.notes = (alert.notes or "") + f"\n[Acknowledged] {data.notes}"

    db.commit()
    db.refresh(alert)

    return _to_response(alert)


@router.put("/{alert_id}/dispatch")
def dispatch_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Mark alert as dispatched -- response team is en route."""
    alert = db.query(EmergencyAlert).filter(
        EmergencyAlert.alert_id == alert_id,
        EmergencyAlert.org_id == org_id,
    ).first()

    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

    alert.status = "dispatched"
    db.commit()
    db.refresh(alert)

    return _to_response(alert)


@router.put("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    data: AlertResolve,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Resolve an emergency alert with notes."""
    alert = db.query(EmergencyAlert).filter(
        EmergencyAlert.alert_id == alert_id,
        EmergencyAlert.org_id == org_id,
    ).first()

    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

    alert.status = "false_alarm" if data.false_alarm else "resolved"
    alert.resolved_at = datetime.utcnow()
    alert.resolution_notes = data.resolution_notes

    # Also update the linked incident
    if alert.related_incident_id:
        incident = db.query(Incident).filter(
            Incident.incident_id == alert.related_incident_id
        ).first()
        if incident:
            incident.status = IncidentStatus.RESOLVED
            incident.resolved_at = datetime.utcnow()
            incident.resolution_notes = data.resolution_notes

    db.commit()
    db.refresh(alert)

    return _to_response(alert)
