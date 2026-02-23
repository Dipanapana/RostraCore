"""Location ping endpoints for GPS breadcrumb trail tracking."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.location_ping import LocationPing
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PingCreate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    battery_level: Optional[float] = None
    is_moving: Optional[bool] = False
    shift_id: Optional[int] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/ping", status_code=status.HTTP_201_CREATED)
def submit_ping(
    data: PingCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Mobile sends location every 5 minutes during active shift.
    Designed for speed -- minimal validation.
    """
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee record not found.")

    ping = LocationPing(
        employee_id=employee.employee_id,
        org_id=org_id,
        shift_id=data.shift_id,
        latitude=data.latitude,
        longitude=data.longitude,
        accuracy=data.accuracy,
        battery_level=data.battery_level,
        is_moving=data.is_moving,
    )
    db.add(ping)
    db.commit()

    return {"status": "ok", "ping_id": ping.ping_id}


@router.get("/trail/{employee_id}")
def get_location_trail(
    employee_id: int,
    shift_id: Optional[int] = None,
    hours: int = 12,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get location history (breadcrumb trail) for a guard."""
    query = db.query(LocationPing).filter(
        LocationPing.employee_id == employee_id,
        LocationPing.org_id == org_id,
    )

    if shift_id:
        query = query.filter(LocationPing.shift_id == shift_id)
    else:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(LocationPing.timestamp >= cutoff)

    pings = query.order_by(LocationPing.timestamp.asc()).all()

    return [
        {
            "ping_id": p.ping_id,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "accuracy": p.accuracy,
            "battery_level": p.battery_level,
            "is_moving": p.is_moving,
            "timestamp": p.timestamp.isoformat() if p.timestamp else None,
        }
        for p in pings
    ]


@router.get("/active")
def get_active_guard_locations(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get the most recent location for all active guards (within last 30 minutes)."""
    cutoff = datetime.utcnow() - timedelta(minutes=30)

    # Get latest ping per employee using a subquery
    latest_subq = (
        db.query(
            LocationPing.employee_id,
            func.max(LocationPing.timestamp).label("max_ts"),
        )
        .filter(
            LocationPing.org_id == org_id,
            LocationPing.timestamp >= cutoff,
        )
        .group_by(LocationPing.employee_id)
        .subquery()
    )

    pings = (
        db.query(LocationPing)
        .join(
            latest_subq,
            (LocationPing.employee_id == latest_subq.c.employee_id)
            & (LocationPing.timestamp == latest_subq.c.max_ts),
        )
        .all()
    )

    return [
        {
            "employee_id": p.employee_id,
            "employee_name": f"{p.employee.first_name} {p.employee.last_name}" if p.employee else "Unknown",
            "latitude": p.latitude,
            "longitude": p.longitude,
            "accuracy": p.accuracy,
            "battery_level": p.battery_level,
            "is_moving": p.is_moving,
            "timestamp": p.timestamp.isoformat() if p.timestamp else None,
        }
        for p in pings
    ]
