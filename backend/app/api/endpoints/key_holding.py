"""Key holding / access management endpoints.

Register keys per site, issue to guards, track returns, audit trail.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.key_register import KeyRegister, KeyLog, KeyStatus
from app.models.site import Site
from app.models.employee import Employee
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class KeyCreate(BaseModel):
    site_id: int
    key_number: str
    key_type: str = "master"  # master, gate, office, access_card, remote, padlock
    description: Optional[str] = None
    notes: Optional[str] = None


class KeyUpdate(BaseModel):
    key_number: Optional[str] = None
    key_type: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class KeyIssue(BaseModel):
    employee_id: int
    notes: Optional[str] = None


class KeyReturn(BaseModel):
    notes: Optional[str] = None


def _build_response(k: KeyRegister, db: Session) -> dict:
    site = db.query(Site).get(k.site_id)
    holder = db.query(Employee).get(k.issued_to_employee_id) if k.issued_to_employee_id else None
    return {
        "key_id": k.key_id,
        "site_id": k.site_id,
        "site_name": site.site_name if site else "Unknown",
        "key_number": k.key_number,
        "key_type": k.key_type,
        "description": k.description,
        "status": k.status,
        "issued_to_employee_id": k.issued_to_employee_id,
        "issued_to_name": f"{holder.first_name} {holder.last_name}" if holder else None,
        "issued_at": k.issued_at,
        "notes": k.notes,
        "created_at": k.created_at,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_keys(
    site_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    key_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all keys for the org."""
    q = db.query(KeyRegister).filter(KeyRegister.org_id == org_id)

    if site_id:
        q = q.filter(KeyRegister.site_id == site_id)
    if status_filter:
        q = q.filter(KeyRegister.status == status_filter)
    if key_type:
        q = q.filter(KeyRegister.key_type == key_type)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (KeyRegister.key_number.ilike(like)) |
            (KeyRegister.description.ilike(like))
        )

    total = q.count()
    keys = q.order_by(KeyRegister.site_id, KeyRegister.key_number).offset(offset).limit(limit).all()

    return {
        "items": [_build_response(k, db) for k in keys],
        "total": total,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_key(
    body: KeyCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Register a new key."""
    site = db.query(Site).filter(Site.site_id == body.site_id, Site.org_id == org_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    k = KeyRegister(
        org_id=org_id,
        site_id=body.site_id,
        key_number=body.key_number,
        key_type=body.key_type,
        description=body.description,
        notes=body.notes,
        status=KeyStatus.AVAILABLE.value,
    )
    db.add(k)
    db.commit()
    db.refresh(k)

    return _build_response(k, db)


@router.put("/{key_id}/")
def update_key(
    key_id: int,
    body: KeyUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update key details."""
    k = db.query(KeyRegister).filter(KeyRegister.key_id == key_id, KeyRegister.org_id == org_id).first()
    if not k:
        raise HTTPException(status_code=404, detail="Key not found")

    if body.key_number is not None:
        k.key_number = body.key_number
    if body.key_type is not None:
        k.key_type = body.key_type
    if body.description is not None:
        k.description = body.description
    if body.notes is not None:
        k.notes = body.notes

    db.commit()
    db.refresh(k)
    return _build_response(k, db)


# ---------------------------------------------------------------------------
# Issue / Return / Report Lost
# ---------------------------------------------------------------------------

@router.post("/{key_id}/issue/")
def issue_key(
    key_id: int,
    body: KeyIssue,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Issue a key to an employee."""
    k = db.query(KeyRegister).filter(KeyRegister.key_id == key_id, KeyRegister.org_id == org_id).first()
    if not k:
        raise HTTPException(status_code=404, detail="Key not found")

    if k.status != KeyStatus.AVAILABLE.value:
        raise HTTPException(status_code=400, detail=f"Key is currently {k.status}")

    emp = db.query(Employee).filter(Employee.employee_id == body.employee_id, Employee.org_id == org_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    k.status = KeyStatus.ISSUED.value
    k.issued_to_employee_id = body.employee_id
    k.issued_at = datetime.utcnow()
    k.issued_by = current_user.user_id

    log = KeyLog(
        key_id=key_id, org_id=org_id, action="issued",
        employee_id=body.employee_id, performed_by=current_user.user_id,
        notes=body.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(k)

    return _build_response(k, db)


@router.post("/{key_id}/return/")
def return_key(
    key_id: int,
    body: KeyReturn,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a key from an employee."""
    k = db.query(KeyRegister).filter(KeyRegister.key_id == key_id, KeyRegister.org_id == org_id).first()
    if not k:
        raise HTTPException(status_code=404, detail="Key not found")

    if k.status != KeyStatus.ISSUED.value:
        raise HTTPException(status_code=400, detail="Key is not currently issued")

    prev_holder = k.issued_to_employee_id
    k.status = KeyStatus.AVAILABLE.value
    k.issued_to_employee_id = None
    k.issued_at = None
    k.issued_by = None

    log = KeyLog(
        key_id=key_id, org_id=org_id, action="returned",
        employee_id=prev_holder, performed_by=current_user.user_id,
        notes=body.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(k)

    return _build_response(k, db)


@router.post("/{key_id}/report-lost/")
def report_key_lost(
    key_id: int,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Report a key as lost."""
    k = db.query(KeyRegister).filter(KeyRegister.key_id == key_id, KeyRegister.org_id == org_id).first()
    if not k:
        raise HTTPException(status_code=404, detail="Key not found")

    prev_holder = k.issued_to_employee_id
    k.status = KeyStatus.LOST.value

    log = KeyLog(
        key_id=key_id, org_id=org_id, action="lost",
        employee_id=prev_holder, performed_by=current_user.user_id,
    )
    db.add(log)
    db.commit()
    db.refresh(k)

    return _build_response(k, db)


# ---------------------------------------------------------------------------
# History log
# ---------------------------------------------------------------------------

@router.get("/{key_id}/history/")
def key_history(
    key_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get audit log for a specific key."""
    k = db.query(KeyRegister).filter(KeyRegister.key_id == key_id, KeyRegister.org_id == org_id).first()
    if not k:
        raise HTTPException(status_code=404, detail="Key not found")

    logs = db.query(KeyLog).filter(KeyLog.key_id == key_id).order_by(KeyLog.created_at.desc()).all()

    results = []
    for log in logs:
        emp = db.query(Employee).get(log.employee_id) if log.employee_id else None
        results.append({
            "log_id": log.log_id,
            "action": log.action,
            "employee_id": log.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
            "notes": log.notes,
            "created_at": log.created_at,
        })

    return results


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

@router.get("/summary/")
def key_summary(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Summary of key holdings across the org."""
    keys = db.query(KeyRegister).filter(KeyRegister.org_id == org_id).all()

    total = len(keys)
    available = sum(1 for k in keys if k.status == KeyStatus.AVAILABLE.value)
    issued = sum(1 for k in keys if k.status == KeyStatus.ISSUED.value)
    lost = sum(1 for k in keys if k.status == KeyStatus.LOST.value)

    # Per-site breakdown
    site_map: dict = {}
    for k in keys:
        sid = k.site_id
        if sid not in site_map:
            site = db.query(Site).get(sid)
            site_map[sid] = {
                "site_id": sid,
                "site_name": site.site_name if site else "Unknown",
                "total": 0, "available": 0, "issued": 0, "lost": 0,
            }
        site_map[sid]["total"] += 1
        site_map[sid][k.status] = site_map[sid].get(k.status, 0) + 1

    return {
        "total": total,
        "available": available,
        "issued": issued,
        "lost": lost,
        "sites": sorted(site_map.values(), key=lambda x: x["total"], reverse=True),
    }
