"""Overtime management endpoints."""

from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.database import get_db
from app.models.overtime import OvertimeRecord
from app.models.employee import Employee
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class OvertimeCreate(BaseModel):
    employee_id: int
    site_id: Optional[int] = None
    date: date
    hours: float
    rate_multiplier: float = 1.5
    hourly_rate: Optional[int] = None  # cents
    reason: Optional[str] = None


class OvertimeUpdate(BaseModel):
    hours: Optional[float] = None
    rate_multiplier: Optional[float] = None
    hourly_rate: Optional[int] = None
    reason: Optional[str] = None


class OvertimeApproval(BaseModel):
    status: str  # approved or rejected
    rejection_reason: Optional[str] = None


def _build_response(r: OvertimeRecord, db: Session) -> dict:
    emp = db.query(Employee).get(r.employee_id) if r.employee_id else None
    site = db.query(Site).get(r.site_id) if r.site_id else None
    emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else None
    return {
        "record_id": r.record_id,
        "employee_id": r.employee_id,
        "employee_name": emp_name,
        "site_id": r.site_id,
        "site_name": site.site_name if site else None,
        "date": r.date.isoformat() if r.date else None,
        "hours": r.hours,
        "rate_multiplier": r.rate_multiplier,
        "hourly_rate": r.hourly_rate,
        "total_cost": r.total_cost,
        "reason": r.reason,
        "status": r.status,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "rejection_reason": r.rejection_reason,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_overtime(
    employee_id: Optional[int] = None,
    site_id: Optional[int] = None,
    status: Optional[str] = None,
    days: int = Query(90, le=365),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    cutoff = date.today() - timedelta(days=days)
    q = db.query(OvertimeRecord).filter(
        OvertimeRecord.org_id == org_id,
        OvertimeRecord.date >= cutoff,
    )
    if employee_id:
        q = q.filter(OvertimeRecord.employee_id == employee_id)
    if site_id:
        q = q.filter(OvertimeRecord.site_id == site_id)
    if status:
        q = q.filter(OvertimeRecord.status == status)
    q = q.order_by(OvertimeRecord.date.desc())
    rows = q.all()
    return {"items": [_build_response(r, db) for r in rows], "total": len(rows)}


@router.post("/", status_code=201)
def create_overtime(
    body: OvertimeCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(
        Employee.employee_id == body.employee_id, Employee.org_id == org_id
    ).first()
    if not emp:
        raise HTTPException(404, "Employee not found in your organization")

    if body.hours <= 0:
        raise HTTPException(400, "hours must be positive")

    # Calculate total cost if hourly_rate provided
    total_cost = None
    hourly_rate = body.hourly_rate
    if not hourly_rate and emp.hourly_rate:
        hourly_rate = emp.hourly_rate
    if hourly_rate:
        total_cost = int(body.hours * hourly_rate * body.rate_multiplier)

    rec = OvertimeRecord(
        org_id=org_id,
        employee_id=body.employee_id,
        site_id=body.site_id,
        date=body.date,
        hours=body.hours,
        rate_multiplier=body.rate_multiplier,
        hourly_rate=hourly_rate,
        total_cost=total_cost,
        reason=body.reason,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.put("/{record_id}/")
def update_overtime(
    record_id: int,
    body: OvertimeUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(OvertimeRecord).filter(
        OvertimeRecord.record_id == record_id, OvertimeRecord.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Overtime record not found")
    if rec.status != "pending":
        raise HTTPException(400, "Cannot edit a record that is already approved/rejected")

    for field, val in body.dict(exclude_unset=True).items():
        setattr(rec, field, val)

    # Recalculate total cost
    if rec.hourly_rate and rec.hours:
        rec.total_cost = int(rec.hours * rec.hourly_rate * rec.rate_multiplier)

    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.post("/{record_id}/approve/")
def approve_overtime(
    record_id: int,
    body: OvertimeApproval,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
):
    rec = db.query(OvertimeRecord).filter(
        OvertimeRecord.record_id == record_id, OvertimeRecord.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Overtime record not found")

    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "status must be 'approved' or 'rejected'")

    rec.status = body.status
    rec.approved_by_user_id = current_user.user_id
    rec.approved_at = datetime.utcnow()
    if body.status == "rejected":
        rec.rejection_reason = body.rejection_reason
    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.delete("/{record_id}/")
def delete_overtime(
    record_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(OvertimeRecord).filter(
        OvertimeRecord.record_id == record_id, OvertimeRecord.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Overtime record not found")
    db.delete(rec)
    db.commit()
    return {"detail": "deleted"}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard")
def overtime_dashboard(
    days: int = Query(90, le=365),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    cutoff = date.today() - timedelta(days=days)
    records = db.query(OvertimeRecord).filter(
        OvertimeRecord.org_id == org_id,
        OvertimeRecord.date >= cutoff,
    ).all()

    total = len(records)
    pending = sum(1 for r in records if r.status == "pending")
    approved = sum(1 for r in records if r.status == "approved")
    rejected = sum(1 for r in records if r.status == "rejected")

    total_hours = round(sum(r.hours for r in records), 1)
    approved_hours = round(sum(r.hours for r in records if r.status == "approved"), 1)
    total_cost = sum(r.total_cost or 0 for r in records if r.status == "approved")

    # By employee (top overtime)
    emp_hours: dict = {}
    for r in records:
        emp_hours[r.employee_id] = emp_hours.get(r.employee_id, 0) + r.hours
    top_employees = []
    for eid, hrs in sorted(emp_hours.items(), key=lambda x: -x[1])[:10]:
        emp = db.query(Employee).get(eid)
        name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown"
        top_employees.append({"employee_id": eid, "employee_name": name, "hours": round(hrs, 1)})

    # By site
    site_hours: dict = {}
    for r in records:
        sid = r.site_id or 0
        site_hours[sid] = site_hours.get(sid, 0) + r.hours
    by_site = []
    for sid, hrs in sorted(site_hours.items(), key=lambda x: -x[1]):
        site = db.query(Site).get(sid) if sid else None
        by_site.append({"site_id": sid or None, "site_name": site.site_name if site else "Unassigned", "hours": round(hrs, 1)})

    # Weekly trend (last 4 weeks)
    weekly_trend = []
    for w in range(3, -1, -1):
        week_start = date.today() - timedelta(weeks=w+1)
        week_end = date.today() - timedelta(weeks=w)
        week_recs = [r for r in records if week_start <= r.date < week_end]
        weekly_trend.append({
            "week_start": week_start.isoformat(),
            "hours": round(sum(r.hours for r in week_recs), 1),
            "count": len(week_recs),
        })

    return {
        "period_days": days,
        "total_records": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "total_hours": total_hours,
        "approved_hours": approved_hours,
        "total_approved_cost": total_cost,
        "top_employees": top_employees,
        "by_site": by_site,
        "weekly_trend": weekly_trend,
    }
