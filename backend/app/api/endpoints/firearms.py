"""Firearm register and compliance endpoints."""

from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.firearm import Firearm, FirearmIssue, FirearmInspection, FirearmStatus
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class FirearmCreate(BaseModel):
    serial_number: str
    make: str
    model: Optional[str] = None
    caliber: Optional[str] = None
    firearm_type: str
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    purchase_date: Optional[str] = None


class FirearmIssueCreate(BaseModel):
    employee_id: int
    ammunition_issued: int = 0
    condition_on_issue: str = "good"


class FirearmReturnData(BaseModel):
    ammunition_returned: int = 0
    condition_on_return: str = "good"


class InspectionCreate(BaseModel):
    condition: str
    passed: bool = True
    next_inspection_due: Optional[str] = None
    notes: Optional[str] = None


def _firearm_response(f: Firearm) -> dict:
    return {
        "firearm_id": f.firearm_id,
        "org_id": f.org_id,
        "serial_number": f.serial_number,
        "make": f.make,
        "model": f.model,
        "caliber": f.caliber,
        "firearm_type": f.firearm_type,
        "license_number": f.license_number,
        "license_expiry": f.license_expiry.isoformat() if f.license_expiry else None,
        "status": f.status.value if hasattr(f.status, 'value') else f.status,
        "current_holder_id": f.current_holder_id,
        "current_holder_name": f"{f.current_holder.first_name} {f.current_holder.last_name}" if f.current_holder else None,
        "purchase_date": f.purchase_date.isoformat() if f.purchase_date else None,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


# ---------------------------------------------------------------------------
# Firearm CRUD
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_firearm(
    data: FirearmCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Register a new firearm."""
    firearm = Firearm(
        org_id=org_id,
        serial_number=data.serial_number,
        make=data.make,
        model=data.model,
        caliber=data.caliber,
        firearm_type=data.firearm_type,
        license_number=data.license_number,
        license_expiry=date.fromisoformat(data.license_expiry) if data.license_expiry else None,
        purchase_date=date.fromisoformat(data.purchase_date) if data.purchase_date else None,
    )
    db.add(firearm)
    db.commit()
    db.refresh(firearm)
    return _firearm_response(firearm)


@router.get("/")
def list_firearms(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all firearms in the organization's registry."""
    query = db.query(Firearm).filter(Firearm.org_id == org_id)
    if status_filter:
        query = query.filter(Firearm.status == status_filter)
    firearms = query.order_by(Firearm.created_at.desc()).offset(skip).limit(limit).all()
    return [_firearm_response(f) for f in firearms]


@router.get("/overdue-inspections")
def get_overdue_inspections(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get firearms with overdue inspections."""
    today = date.today()

    # Find the latest inspection for each firearm
    firearms = db.query(Firearm).filter(Firearm.org_id == org_id).all()

    overdue = []
    for f in firearms:
        latest_insp = (
            db.query(FirearmInspection)
            .filter(FirearmInspection.firearm_id == f.firearm_id)
            .order_by(FirearmInspection.inspection_date.desc())
            .first()
        )
        if latest_insp and latest_insp.next_inspection_due and latest_insp.next_inspection_due < today:
            overdue.append({
                **_firearm_response(f),
                "last_inspection": latest_insp.inspection_date.isoformat(),
                "next_inspection_due": latest_insp.next_inspection_due.isoformat(),
                "days_overdue": (today - latest_insp.next_inspection_due).days,
            })
        elif not latest_insp:
            overdue.append({
                **_firearm_response(f),
                "last_inspection": None,
                "next_inspection_due": None,
                "days_overdue": None,
            })

    return overdue


@router.get("/{firearm_id}")
def get_firearm(
    firearm_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get firearm details."""
    f = db.query(Firearm).filter(Firearm.firearm_id == firearm_id, Firearm.org_id == org_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Firearm not found.")
    return _firearm_response(f)


# ---------------------------------------------------------------------------
# Issue / Return
# ---------------------------------------------------------------------------

@router.post("/{firearm_id}/issue")
def issue_firearm(
    firearm_id: int,
    data: FirearmIssueCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Issue a firearm to a guard with ammunition count."""
    f = db.query(Firearm).filter(Firearm.firearm_id == firearm_id, Firearm.org_id == org_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Firearm not found.")
    if f.status != FirearmStatus.IN_ARMORY:
        raise HTTPException(status_code=400, detail=f"Firearm is not in armory (current status: {f.status.value}).")

    issue = FirearmIssue(
        firearm_id=firearm_id,
        employee_id=data.employee_id,
        issued_by_user_id=current_user.user_id,
        ammunition_issued=data.ammunition_issued,
        condition_on_issue=data.condition_on_issue,
    )
    db.add(issue)

    f.status = FirearmStatus.ISSUED
    f.current_holder_id = data.employee_id

    db.commit()
    return {"status": "issued", "issue_id": issue.issue_id}


@router.post("/{firearm_id}/return")
def return_firearm(
    firearm_id: int,
    data: FirearmReturnData,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Return a firearm to the armory."""
    f = db.query(Firearm).filter(Firearm.firearm_id == firearm_id, Firearm.org_id == org_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Firearm not found.")
    if f.status != FirearmStatus.ISSUED:
        raise HTTPException(status_code=400, detail="Firearm is not currently issued.")

    # Find the open issue record
    issue = db.query(FirearmIssue).filter(
        FirearmIssue.firearm_id == firearm_id,
        FirearmIssue.returned_at.is_(None),
    ).first()

    if issue:
        issue.returned_at = datetime.utcnow()
        issue.ammunition_returned = data.ammunition_returned
        issue.condition_on_return = data.condition_on_return

    f.status = FirearmStatus.IN_ARMORY
    f.current_holder_id = None

    db.commit()
    return {"status": "returned"}


@router.get("/{firearm_id}/history")
def get_issue_history(
    firearm_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get issue/return history for a firearm."""
    f = db.query(Firearm).filter(Firearm.firearm_id == firearm_id, Firearm.org_id == org_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Firearm not found.")

    issues = db.query(FirearmIssue).filter(FirearmIssue.firearm_id == firearm_id).order_by(FirearmIssue.issued_at.desc()).all()

    return [
        {
            "issue_id": i.issue_id,
            "employee_name": f"{i.employee.first_name} {i.employee.last_name}" if i.employee else "Unknown",
            "issued_at": i.issued_at.isoformat() if i.issued_at else None,
            "returned_at": i.returned_at.isoformat() if i.returned_at else None,
            "ammunition_issued": i.ammunition_issued,
            "ammunition_returned": i.ammunition_returned,
            "condition_on_issue": i.condition_on_issue,
            "condition_on_return": i.condition_on_return,
        }
        for i in issues
    ]


# ---------------------------------------------------------------------------
# Inspections
# ---------------------------------------------------------------------------

@router.post("/{firearm_id}/inspect")
def record_inspection(
    firearm_id: int,
    data: InspectionCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Record a firearm inspection."""
    f = db.query(Firearm).filter(Firearm.firearm_id == firearm_id, Firearm.org_id == org_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Firearm not found.")

    inspection = FirearmInspection(
        firearm_id=firearm_id,
        inspected_by_user_id=current_user.user_id,
        inspection_date=date.today(),
        condition=data.condition,
        passed=1 if data.passed else 0,
        next_inspection_due=date.fromisoformat(data.next_inspection_due) if data.next_inspection_due else None,
        notes=data.notes,
    )
    db.add(inspection)
    db.commit()

    return {"status": "recorded", "inspection_id": inspection.inspection_id}
