"""Guard deployment history endpoints."""

from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.deployment_history import DeploymentRecord
from app.models.employee import Employee
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DeploymentCreate(BaseModel):
    employee_id: int
    site_id: Optional[int] = None
    start_date: date
    end_date: Optional[date] = None
    role: Optional[str] = None
    reason: Optional[str] = None  # new_assignment, transfer, rotation, temporary
    notes: Optional[str] = None


class DeploymentUpdate(BaseModel):
    site_id: Optional[int] = None
    end_date: Optional[date] = None
    role: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


def _build_response(r: DeploymentRecord, db: Session) -> dict:
    emp = db.query(Employee).get(r.employee_id) if r.employee_id else None
    site = db.query(Site).get(r.site_id) if r.site_id else None
    emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else None
    return {
        "record_id": r.record_id,
        "employee_id": r.employee_id,
        "employee_name": emp_name,
        "site_id": r.site_id,
        "site_name": site.site_name if site else None,
        "start_date": r.start_date.isoformat() if r.start_date else None,
        "end_date": r.end_date.isoformat() if r.end_date else None,
        "role": r.role,
        "reason": r.reason,
        "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_deployments(
    employee_id: Optional[int] = None,
    site_id: Optional[int] = None,
    reason: Optional[str] = None,
    active_only: bool = False,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    q = db.query(DeploymentRecord).filter(DeploymentRecord.org_id == org_id)
    if employee_id:
        q = q.filter(DeploymentRecord.employee_id == employee_id)
    if site_id:
        q = q.filter(DeploymentRecord.site_id == site_id)
    if reason:
        q = q.filter(DeploymentRecord.reason == reason)
    if active_only:
        q = q.filter(DeploymentRecord.end_date.is_(None))
    q = q.order_by(DeploymentRecord.start_date.desc()).limit(limit)
    rows = q.all()
    return {"items": [_build_response(r, db) for r in rows], "total": len(rows)}


@router.post("/", status_code=201)
def create_deployment(
    body: DeploymentCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
):
    # Verify employee belongs to org
    emp = db.query(Employee).filter(
        Employee.employee_id == body.employee_id, Employee.org_id == org_id
    ).first()
    if not emp:
        raise HTTPException(404, "Employee not found in your organization")

    if body.reason and body.reason not in ("new_assignment", "transfer", "rotation", "temporary"):
        raise HTTPException(400, "reason must be: new_assignment, transfer, rotation, temporary")

    # Close any current active deployment for this employee if creating a new one
    if body.site_id:
        active = db.query(DeploymentRecord).filter(
            DeploymentRecord.org_id == org_id,
            DeploymentRecord.employee_id == body.employee_id,
            DeploymentRecord.end_date.is_(None),
        ).all()
        for a in active:
            a.end_date = body.start_date
            a.updated_at = datetime.utcnow()

    rec = DeploymentRecord(
        org_id=org_id,
        employee_id=body.employee_id,
        site_id=body.site_id,
        start_date=body.start_date,
        end_date=body.end_date,
        role=body.role,
        reason=body.reason,
        notes=body.notes,
        created_by_user_id=current_user.user_id,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.put("/{record_id}/")
def update_deployment(
    record_id: int,
    body: DeploymentUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(DeploymentRecord).filter(
        DeploymentRecord.record_id == record_id, DeploymentRecord.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Deployment record not found")

    for field, val in body.dict(exclude_unset=True).items():
        setattr(rec, field, val)
    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.delete("/{record_id}/")
def delete_deployment(
    record_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(DeploymentRecord).filter(
        DeploymentRecord.record_id == record_id, DeploymentRecord.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Deployment record not found")
    db.delete(rec)
    db.commit()
    return {"detail": "deleted"}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard")
def deployment_dashboard(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    all_records = db.query(DeploymentRecord).filter(DeploymentRecord.org_id == org_id).all()

    active = [r for r in all_records if r.end_date is None]
    total = len(all_records)

    # By reason
    reason_counts = {}
    for r in all_records:
        key = r.reason or "unspecified"
        reason_counts[key] = reason_counts.get(key, 0) + 1

    # By site (active deployments)
    site_map = {}
    for r in active:
        sid = r.site_id
        if sid not in site_map:
            site = db.query(Site).get(sid) if sid else None
            site_map[sid] = {"site_id": sid, "site_name": site.site_name if site else "Unassigned", "count": 0}
        site_map[sid]["count"] += 1

    # Employees with most deployments
    emp_counts = {}
    for r in all_records:
        emp_counts[r.employee_id] = emp_counts.get(r.employee_id, 0) + 1
    top_employees = []
    for eid, cnt in sorted(emp_counts.items(), key=lambda x: -x[1])[:10]:
        emp = db.query(Employee).get(eid)
        name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown"
        top_employees.append({"employee_id": eid, "employee_name": name, "deployment_count": cnt})

    return {
        "total_records": total,
        "active_deployments": len(active),
        "completed_deployments": total - len(active),
        "by_reason": [[k, v] for k, v in reason_counts.items()],
        "by_site": sorted(site_map.values(), key=lambda x: -x["count"]),
        "top_employees": top_employees,
    }
