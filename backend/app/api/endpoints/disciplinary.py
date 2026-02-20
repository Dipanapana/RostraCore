"""Org-wide disciplinary records management endpoints."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.performance import DisciplinaryCase
from app.models.employee import Employee
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DisciplinaryCreate(BaseModel):
    employee_id: int
    incident_date: str  # YYYY-MM-DD
    case_type: str  # verbal_warning | written_warning | final_warning | suspension | dismissal
    reason: str
    outcome: Optional[str] = None


class DisciplinaryUpdate(BaseModel):
    outcome: Optional[str] = None
    case_type: Optional[str] = None


VALID_CASE_TYPES = {"verbal_warning", "written_warning", "final_warning", "suspension", "dismissal"}


def _build_response(c: DisciplinaryCase, db: Session) -> dict:
    emp = db.query(Employee).get(c.employee_id) if c.employee_id else None
    return {
        "case_id": c.case_id,
        "employee_id": c.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
        "incident_date": c.incident_date.isoformat() if c.incident_date else None,
        "case_type": c.case_type,
        "reason": c.reason,
        "outcome": c.outcome,
        "issued_by_id": c.issued_by_id,
        "issued_by_name": c.issued_by_name,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_all_disciplinary(
    employee_id: Optional[int] = None,
    case_type: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = None,
    days: int = Query(365, le=3650),
    limit: int = Query(100, le=500),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all disciplinary cases across the organisation."""
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(DisciplinaryCase).filter(
        DisciplinaryCase.org_id == org_id,
        DisciplinaryCase.created_at >= since,
    )
    if employee_id:
        q = q.filter(DisciplinaryCase.employee_id == employee_id)
    if case_type:
        q = q.filter(DisciplinaryCase.case_type == case_type)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (DisciplinaryCase.reason.ilike(like)) |
            (DisciplinaryCase.outcome.ilike(like)) |
            (DisciplinaryCase.issued_by_name.ilike(like))
        )

    total = q.count()
    cases = q.order_by(DisciplinaryCase.incident_date.desc()).offset(offset).limit(limit).all()
    return {"items": [_build_response(c, db) for c in cases], "total": total}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_disciplinary(
    body: DisciplinaryCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a new disciplinary case."""
    if body.case_type not in VALID_CASE_TYPES:
        raise HTTPException(status_code=400, detail=f"case_type must be one of: {', '.join(sorted(VALID_CASE_TYPES))}")

    # Verify employee belongs to org
    emp = db.query(Employee).filter(
        Employee.employee_id == body.employee_id,
        Employee.org_id == org_id,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    from datetime import date as date_type
    try:
        incident_dt = datetime.fromisoformat(body.incident_date).date()
    except ValueError:
        incident_dt = datetime.strptime(body.incident_date, "%Y-%m-%d").date()

    caller_name = current_user.full_name or current_user.email

    case = DisciplinaryCase(
        org_id=org_id,
        employee_id=body.employee_id,
        incident_date=incident_dt,
        case_type=body.case_type,
        reason=body.reason,
        outcome=body.outcome,
        issued_by_id=current_user.user_id,
        issued_by_name=caller_name,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return _build_response(case, db)


@router.put("/{case_id}/")
def update_disciplinary(
    case_id: int,
    body: DisciplinaryUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update a disciplinary case (add outcome, change type)."""
    case = db.query(DisciplinaryCase).filter(
        DisciplinaryCase.case_id == case_id,
        DisciplinaryCase.org_id == org_id,
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Disciplinary case not found")

    if body.outcome is not None:
        case.outcome = body.outcome
    if body.case_type is not None:
        if body.case_type not in VALID_CASE_TYPES:
            raise HTTPException(status_code=400, detail=f"case_type must be one of: {', '.join(sorted(VALID_CASE_TYPES))}")
        case.case_type = body.case_type
    db.commit()
    db.refresh(case)
    return _build_response(case, db)


@router.delete("/{case_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_disciplinary(
    case_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete a disciplinary case."""
    case = db.query(DisciplinaryCase).filter(
        DisciplinaryCase.case_id == case_id,
        DisciplinaryCase.org_id == org_id,
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Disciplinary case not found")
    db.delete(case)
    db.commit()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def disciplinary_dashboard(
    days: int = Query(365, le=3650),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Disciplinary records dashboard."""
    since = datetime.utcnow() - timedelta(days=days)
    cases = db.query(DisciplinaryCase).filter(
        DisciplinaryCase.org_id == org_id,
        DisciplinaryCase.created_at >= since,
    ).all()

    total = len(cases)

    # By type
    type_counts: dict = {}
    for c in cases:
        type_counts[c.case_type] = type_counts.get(c.case_type, 0) + 1

    # By employee (top offenders)
    emp_counts: dict = {}
    for c in cases:
        if c.employee_id not in emp_counts:
            emp = db.query(Employee).get(c.employee_id)
            emp_counts[c.employee_id] = {
                "employee_id": c.employee_id,
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
                "count": 0,
            }
        emp_counts[c.employee_id]["count"] += 1

    # Monthly trend (last 6 months)
    monthly: dict = {}
    for i in range(6):
        d = datetime.utcnow() - timedelta(days=i * 30)
        key = d.strftime("%Y-%m")
        monthly[key] = 0
    for c in cases:
        if c.created_at:
            key = c.created_at.strftime("%Y-%m")
            if key in monthly:
                monthly[key] += 1

    return {
        "period_days": days,
        "total": total,
        "by_type": sorted(type_counts.items(), key=lambda x: x[1], reverse=True),
        "by_employee": sorted(emp_counts.values(), key=lambda x: x["count"], reverse=True)[:10],
        "monthly_trend": [{"month": k, "count": v} for k, v in sorted(monthly.items())],
    }
