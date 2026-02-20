"""Injury on Duty (IOD) endpoints."""

from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.iod_record import IODRecord
from app.models.employee import Employee
from app.models.site import Site
from app.auth.security import get_current_org_id

router = APIRouter()

INJURY_TYPES = ["fracture", "laceration", "burn", "strain", "concussion", "other"]
STATUSES = ["reported", "under_review", "approved", "rejected", "closed"]


class IODCreate(BaseModel):
    employee_id: int
    incident_date: date
    report_date: Optional[date] = None
    injury_type: str
    body_part: Optional[str] = None
    description: str
    location: Optional[str] = None
    site_id: Optional[int] = None
    wca_claim_number: Optional[str] = None
    notes: Optional[str] = None


class IODUpdate(BaseModel):
    return_date: Optional[date] = None
    status: Optional[str] = None
    wca_claim_number: Optional[str] = None
    wca_submitted: Optional[bool] = None
    medical_certificate: Optional[bool] = None
    notes: Optional[str] = None


def _build_response(r: IODRecord, db: Session) -> dict:
    emp = db.query(Employee).get(r.employee_id)
    emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown"
    site = db.query(Site).get(r.site_id) if r.site_id else None
    days_off = None
    if r.return_date and r.incident_date:
        days_off = (r.return_date - r.incident_date).days
    elif r.incident_date:
        days_off = (date.today() - r.incident_date).days

    return {
        "iod_id": r.iod_id,
        "employee_id": r.employee_id,
        "employee_name": emp_name,
        "incident_date": r.incident_date.isoformat() if r.incident_date else None,
        "report_date": r.report_date.isoformat() if r.report_date else None,
        "return_date": r.return_date.isoformat() if r.return_date else None,
        "days_off": days_off,
        "injury_type": r.injury_type,
        "body_part": r.body_part,
        "description": r.description,
        "location": r.location,
        "site_id": r.site_id,
        "site_name": site.site_name if site else None,
        "status": r.status,
        "wca_claim_number": r.wca_claim_number,
        "wca_submitted": r.wca_submitted,
        "medical_certificate": r.medical_certificate,
        "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/")
def list_iod(
    status: Optional[str] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    q = db.query(IODRecord).filter(IODRecord.org_id == org_id)
    if status:
        q = q.filter(IODRecord.status == status)
    if employee_id:
        q = q.filter(IODRecord.employee_id == employee_id)
    q = q.order_by(IODRecord.incident_date.desc())
    rows = q.all()
    return {"items": [_build_response(r, db) for r in rows], "total": len(rows)}


@router.post("/", status_code=201)
def create_iod(
    body: IODCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    emp = db.query(Employee).filter(
        Employee.employee_id == body.employee_id, Employee.org_id == org_id
    ).first()
    if not emp:
        raise HTTPException(404, "Employee not found")

    rec = IODRecord(
        org_id=org_id,
        employee_id=body.employee_id,
        incident_date=body.incident_date,
        report_date=body.report_date or date.today(),
        injury_type=body.injury_type,
        body_part=body.body_part,
        description=body.description,
        location=body.location,
        site_id=body.site_id,
        wca_claim_number=body.wca_claim_number,
        notes=body.notes,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.put("/{iod_id}/")
def update_iod(
    iod_id: int,
    body: IODUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(IODRecord).filter(
        IODRecord.iod_id == iod_id, IODRecord.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "IOD record not found")
    if body.status and body.status not in STATUSES:
        raise HTTPException(400, f"status must be one of: {', '.join(STATUSES)}")
    for field, val in body.dict(exclude_unset=True).items():
        setattr(rec, field, val)
    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.delete("/{iod_id}/")
def delete_iod(
    iod_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(IODRecord).filter(
        IODRecord.iod_id == iod_id, IODRecord.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "IOD record not found")
    db.delete(rec)
    db.commit()
    return {"detail": "deleted"}


@router.get("/dashboard")
def iod_dashboard(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    records = db.query(IODRecord).filter(IODRecord.org_id == org_id).all()

    active = [r for r in records if r.status not in ("closed", "rejected") and not r.return_date]
    total = len(records)
    total_days_lost = 0
    for r in records:
        if r.return_date and r.incident_date:
            total_days_lost += (r.return_date - r.incident_date).days
        elif r.incident_date and r.status not in ("closed", "rejected"):
            total_days_lost += (date.today() - r.incident_date).days

    by_type: dict = {}
    for r in records:
        by_type[r.injury_type] = by_type.get(r.injury_type, 0) + 1

    by_status: dict = {}
    for r in records:
        by_status[r.status] = by_status.get(r.status, 0) + 1

    wca_pending = sum(1 for r in records if not r.wca_submitted and r.status not in ("rejected", "closed"))

    return {
        "total_records": total,
        "active_cases": len(active),
        "total_days_lost": total_days_lost,
        "wca_pending_submission": wca_pending,
        "by_injury_type": by_type,
        "by_status": by_status,
    }
