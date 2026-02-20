"""Emergency contacts endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.emergency_contact import EmergencyContact
from app.models.employee import Employee
from app.auth.security import get_current_org_id

router = APIRouter()

RELATIONSHIPS = ["spouse", "parent", "sibling", "child", "friend", "other"]


class ContactCreate(BaseModel):
    employee_id: int
    full_name: str
    relationship: str
    phone: str
    alt_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_primary: bool = False


class ContactUpdate(BaseModel):
    full_name: Optional[str] = None
    relationship: Optional[str] = None
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_primary: Optional[bool] = None


def _build_response(c: EmergencyContact, db: Session) -> dict:
    emp = db.query(Employee).get(c.employee_id)
    emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown"
    return {
        "contact_id": c.contact_id,
        "employee_id": c.employee_id,
        "employee_name": emp_name,
        "full_name": c.full_name,
        "relationship": c.relationship,
        "phone": c.phone,
        "alt_phone": c.alt_phone,
        "email": c.email,
        "address": c.address,
        "is_primary": c.is_primary,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("/")
def list_contacts(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    q = db.query(EmergencyContact).filter(EmergencyContact.org_id == org_id)
    if employee_id:
        q = q.filter(EmergencyContact.employee_id == employee_id)
    q = q.order_by(EmergencyContact.is_primary.desc(), EmergencyContact.full_name)
    rows = q.all()
    return {"items": [_build_response(c, db) for c in rows], "total": len(rows)}


@router.post("/", status_code=201)
def create_contact(
    body: ContactCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    # Verify employee belongs to org
    emp = db.query(Employee).filter(
        Employee.employee_id == body.employee_id, Employee.org_id == org_id
    ).first()
    if not emp:
        raise HTTPException(404, "Employee not found")

    # If setting as primary, unset existing primary for this employee
    if body.is_primary:
        db.query(EmergencyContact).filter(
            EmergencyContact.employee_id == body.employee_id,
            EmergencyContact.org_id == org_id,
            EmergencyContact.is_primary == True,
        ).update({"is_primary": False})

    rec = EmergencyContact(
        org_id=org_id,
        employee_id=body.employee_id,
        full_name=body.full_name,
        relationship=body.relationship,
        phone=body.phone,
        alt_phone=body.alt_phone,
        email=body.email,
        address=body.address,
        is_primary=body.is_primary,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.put("/{contact_id}/")
def update_contact(
    contact_id: int,
    body: ContactUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(EmergencyContact).filter(
        EmergencyContact.contact_id == contact_id, EmergencyContact.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Contact not found")

    updates = body.dict(exclude_unset=True)

    # If setting as primary, unset existing primary for this employee
    if updates.get("is_primary"):
        db.query(EmergencyContact).filter(
            EmergencyContact.employee_id == rec.employee_id,
            EmergencyContact.org_id == org_id,
            EmergencyContact.is_primary == True,
            EmergencyContact.contact_id != contact_id,
        ).update({"is_primary": False})

    for field, val in updates.items():
        setattr(rec, field, val)
    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.delete("/{contact_id}/")
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(EmergencyContact).filter(
        EmergencyContact.contact_id == contact_id, EmergencyContact.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Contact not found")
    db.delete(rec)
    db.commit()
    return {"detail": "deleted"}


@router.get("/dashboard")
def contacts_dashboard(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Summary: how many employees have emergency contacts, who's missing them."""
    # All active employees
    employees = db.query(Employee).filter(
        Employee.org_id == org_id, Employee.status == "active"
    ).all()

    # Employees with at least one emergency contact
    emp_with_contacts = db.query(EmergencyContact.employee_id).filter(
        EmergencyContact.org_id == org_id
    ).distinct().all()
    emp_ids_with = {r[0] for r in emp_with_contacts}

    total = len(employees)
    with_contacts = sum(1 for e in employees if e.employee_id in emp_ids_with)
    without_contacts = total - with_contacts

    # Employees missing contacts
    missing = [
        {"employee_id": e.employee_id, "name": f"{e.first_name} {e.last_name}".strip()}
        for e in employees if e.employee_id not in emp_ids_with
    ][:20]

    return {
        "total_active_employees": total,
        "with_emergency_contacts": with_contacts,
        "without_emergency_contacts": without_contacts,
        "coverage_pct": round(with_contacts / total * 100, 1) if total else 0,
        "missing_contacts": missing,
    }
