"""Report schedule endpoints for automated report configuration."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.report_schedule import ReportSchedule, ReportFrequency, ReportType
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ReportScheduleCreate(BaseModel):
    name: str
    report_type: str
    frequency: str
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time_of_day: str = "08:00"
    recipients: List[str] = []
    client_id: Optional[int] = None
    site_ids: Optional[List[int]] = None
    enabled: bool = True


class ReportScheduleUpdate(BaseModel):
    name: Optional[str] = None
    frequency: Optional[str] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time_of_day: Optional[str] = None
    recipients: Optional[List[str]] = None
    client_id: Optional[int] = None
    site_ids: Optional[List[int]] = None
    enabled: Optional[bool] = None


def _to_response(s: ReportSchedule) -> dict:
    return {
        "schedule_id": s.schedule_id,
        "org_id": s.org_id,
        "name": s.name,
        "report_type": s.report_type.value if hasattr(s.report_type, 'value') else s.report_type,
        "frequency": s.frequency.value if hasattr(s.frequency, 'value') else s.frequency,
        "day_of_week": s.day_of_week,
        "day_of_month": s.day_of_month,
        "time_of_day": s.time_of_day,
        "recipients": s.recipients or [],
        "client_id": s.client_id,
        "client_name": s.client.company_name if s.client else None,
        "site_ids": s.site_ids or [],
        "enabled": s.enabled,
        "last_sent_at": s.last_sent_at.isoformat() if s.last_sent_at else None,
        "last_error": s.last_error,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_schedule(
    data: ReportScheduleCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Create a new automated report schedule."""
    valid_types = [t.value for t in ReportType]
    if data.report_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid report type. Must be one of: {valid_types}")

    valid_freqs = [f.value for f in ReportFrequency]
    if data.frequency not in valid_freqs:
        raise HTTPException(status_code=400, detail=f"Invalid frequency. Must be one of: {valid_freqs}")

    schedule = ReportSchedule(
        org_id=org_id,
        name=data.name,
        report_type=data.report_type,
        frequency=data.frequency,
        day_of_week=data.day_of_week,
        day_of_month=data.day_of_month,
        time_of_day=data.time_of_day,
        recipients=data.recipients,
        client_id=data.client_id,
        site_ids=data.site_ids,
        enabled=data.enabled,
        created_by_user_id=current_user.user_id,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return _to_response(schedule)


@router.get("/")
def list_schedules(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all report schedules for the organization."""
    schedules = (
        db.query(ReportSchedule)
        .filter(ReportSchedule.org_id == org_id)
        .order_by(ReportSchedule.created_at.desc())
        .all()
    )
    return [_to_response(s) for s in schedules]


@router.get("/{schedule_id}")
def get_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get a specific report schedule."""
    schedule = db.query(ReportSchedule).filter(
        ReportSchedule.schedule_id == schedule_id,
        ReportSchedule.org_id == org_id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found.")
    return _to_response(schedule)


@router.put("/{schedule_id}")
def update_schedule(
    schedule_id: int,
    data: ReportScheduleUpdate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update a report schedule."""
    schedule = db.query(ReportSchedule).filter(
        ReportSchedule.schedule_id == schedule_id,
        ReportSchedule.org_id == org_id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)
    return _to_response(schedule)


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete a report schedule."""
    schedule = db.query(ReportSchedule).filter(
        ReportSchedule.schedule_id == schedule_id,
        ReportSchedule.org_id == org_id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found.")

    db.delete(schedule)
    db.commit()
    return {"status": "ok", "message": "Schedule deleted."}


@router.post("/{schedule_id}/toggle")
def toggle_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Toggle a report schedule enabled/disabled."""
    schedule = db.query(ReportSchedule).filter(
        ReportSchedule.schedule_id == schedule_id,
        ReportSchedule.org_id == org_id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found.")

    schedule.enabled = not schedule.enabled
    db.commit()
    db.refresh(schedule)
    return _to_response(schedule)
