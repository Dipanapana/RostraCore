"""Lone worker protection endpoints — monitoring sessions for solo guards."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.lone_worker import LoneWorkerSession, LoneWorkerStatus
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class StartSession(BaseModel):
    shift_id: Optional[int] = None
    site_id: Optional[int] = None
    check_in_interval_minutes: int = 60
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CheckIn(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None


def _to_response(s: LoneWorkerSession) -> dict:
    employee_name = None
    if s.employee:
        employee_name = f"{s.employee.first_name} {s.employee.last_name}"

    return {
        "session_id": s.session_id,
        "org_id": s.org_id,
        "employee_id": s.employee_id,
        "employee_name": employee_name,
        "shift_id": s.shift_id,
        "site_id": s.site_id,
        "site_name": s.site.site_name if s.site else None,
        "check_in_interval_minutes": s.check_in_interval_minutes,
        "status": s.status.value if hasattr(s.status, 'value') else s.status,
        "last_check_in": s.last_check_in.isoformat() if s.last_check_in else None,
        "next_check_in_due": s.next_check_in_due.isoformat() if s.next_check_in_due else None,
        "missed_check_ins": s.missed_check_ins,
        "escalation_level": s.escalation_level,
        "last_latitude": s.last_latitude,
        "last_longitude": s.last_longitude,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/start", status_code=status.HTTP_201_CREATED)
def start_session(
    data: StartSession,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Start a lone worker monitoring session when a guard begins a solo shift."""
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()

    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee record not found.")

    # Check for existing active session
    existing = db.query(LoneWorkerSession).filter(
        LoneWorkerSession.employee_id == employee.employee_id,
        LoneWorkerSession.org_id == org_id,
        LoneWorkerSession.status.in_([LoneWorkerStatus.ACTIVE, LoneWorkerStatus.OVERDUE]),
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guard already has an active lone worker session.",
        )

    now = datetime.utcnow()
    session = LoneWorkerSession(
        org_id=org_id,
        employee_id=employee.employee_id,
        user_id=current_user.user_id,
        shift_id=data.shift_id,
        site_id=data.site_id,
        check_in_interval_minutes=data.check_in_interval_minutes,
        status=LoneWorkerStatus.ACTIVE,
        last_check_in=now,
        next_check_in_due=now + timedelta(minutes=data.check_in_interval_minutes),
        last_latitude=data.latitude,
        last_longitude=data.longitude,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return _to_response(session)


@router.post("/check-in")
def check_in(
    data: CheckIn,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Guard confirms they are OK during a lone worker session."""
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()

    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee record not found.")

    session = db.query(LoneWorkerSession).filter(
        LoneWorkerSession.employee_id == employee.employee_id,
        LoneWorkerSession.org_id == org_id,
        LoneWorkerSession.status.in_([LoneWorkerStatus.ACTIVE, LoneWorkerStatus.OVERDUE, LoneWorkerStatus.ESCALATED]),
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active lone worker session found.")

    now = datetime.utcnow()
    session.last_check_in = now
    session.next_check_in_due = now + timedelta(minutes=session.check_in_interval_minutes)
    session.status = LoneWorkerStatus.ACTIVE
    session.missed_check_ins = 0
    session.escalation_level = 0
    if data.latitude is not None:
        session.last_latitude = data.latitude
    if data.longitude is not None:
        session.last_longitude = data.longitude

    db.commit()
    db.refresh(session)

    return _to_response(session)


@router.post("/{session_id}/end")
def end_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """End a lone worker monitoring session."""
    session = db.query(LoneWorkerSession).filter(
        LoneWorkerSession.session_id == session_id,
        LoneWorkerSession.org_id == org_id,
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    session.status = LoneWorkerStatus.ENDED
    session.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(session)

    return _to_response(session)


@router.get("/overdue")
def get_overdue_sessions(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all overdue lone worker sessions for the organization."""
    now = datetime.utcnow()

    # First, update status for any sessions that are past due
    overdue_sessions = (
        db.query(LoneWorkerSession)
        .filter(
            LoneWorkerSession.org_id == org_id,
            LoneWorkerSession.status.in_([LoneWorkerStatus.ACTIVE, LoneWorkerStatus.OVERDUE]),
            LoneWorkerSession.next_check_in_due < now,
        )
        .all()
    )

    for s in overdue_sessions:
        if s.status == LoneWorkerStatus.ACTIVE:
            s.status = LoneWorkerStatus.OVERDUE
            s.missed_check_ins = (s.missed_check_ins or 0) + 1
        if s.missed_check_ins >= 3:
            s.escalation_level = 3
            s.status = LoneWorkerStatus.ESCALATED
        elif s.missed_check_ins >= 2:
            s.escalation_level = 2
        elif s.missed_check_ins >= 1:
            s.escalation_level = 1

    if overdue_sessions:
        db.commit()

    # Return all non-ended sessions that need attention
    sessions = (
        db.query(LoneWorkerSession)
        .filter(
            LoneWorkerSession.org_id == org_id,
            LoneWorkerSession.status.in_([LoneWorkerStatus.OVERDUE, LoneWorkerStatus.ESCALATED]),
        )
        .order_by(LoneWorkerSession.escalation_level.desc(), LoneWorkerSession.next_check_in_due.asc())
        .all()
    )

    return [_to_response(s) for s in sessions]


@router.get("/active")
def get_active_sessions(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all active lone worker sessions for the organization."""
    sessions = (
        db.query(LoneWorkerSession)
        .filter(
            LoneWorkerSession.org_id == org_id,
            LoneWorkerSession.status.in_([LoneWorkerStatus.ACTIVE, LoneWorkerStatus.OVERDUE, LoneWorkerStatus.ESCALATED]),
        )
        .order_by(LoneWorkerSession.escalation_level.desc(), LoneWorkerSession.started_at.desc())
        .all()
    )

    return [_to_response(s) for s in sessions]


@router.get("/")
def list_sessions(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all lone worker sessions with optional status filter."""
    query = db.query(LoneWorkerSession).filter(LoneWorkerSession.org_id == org_id)

    if status_filter:
        query = query.filter(LoneWorkerSession.status == status_filter)

    sessions = query.order_by(LoneWorkerSession.started_at.desc()).offset(skip).limit(limit).all()
    total = query.count()

    return {"sessions": [_to_response(s) for s in sessions], "total": total}
