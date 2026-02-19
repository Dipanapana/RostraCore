"""Certifications API endpoints."""

from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.certification import Certification
from app.models.employee import Employee
from app.auth.security import get_current_org_id

router = APIRouter()


# Pydantic Models
class CertificationBase(BaseModel):
    employee_id: int
    cert_type: str
    issue_date: date
    expiry_date: date
    verified: bool = False
    cert_number: Optional[str] = None
    issuing_authority: Optional[str] = None


class CertificationCreate(CertificationBase):
    pass


class CertificationUpdate(BaseModel):
    cert_type: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    verified: Optional[bool] = None
    cert_number: Optional[str] = None
    issuing_authority: Optional[str] = None


class CertificationResponse(CertificationBase):
    cert_id: int

    class Config:
        from_attributes = True


# Endpoints
@router.get("/", response_model=List[CertificationResponse])
async def get_certifications(
    employee_id: Optional[int] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get all certifications (filtered by organization via employee)."""
    query = db.query(Certification).join(Employee).filter(Employee.org_id == org_id)

    if employee_id is not None:
        query = query.filter(Certification.employee_id == employee_id)

    certifications = query.all()
    return certifications


@router.get("/compliance-dashboard")
async def get_compliance_dashboard(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Workforce compliance dashboard: PSIRA, firearm, and certification status across all employees."""
    today = date.today()

    active_employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == "active",
    ).all()

    total_active = len(active_employees)
    if total_active == 0:
        return {
            "total_active_employees": 0,
            "psira_summary": {},
            "firearm_summary": {},
            "certification_summary": {},
            "expiry_alerts": [],
            "employees_without_certs": [],
        }

    emp_ids = [e.employee_id for e in active_employees]
    all_certs = db.query(Certification).filter(
        Certification.employee_id.in_(emp_ids)
    ).all()

    # --- PSIRA summary ---
    psira_certs = [c for c in all_certs if c.psira_grade is not None]
    psira_valid = [c for c in psira_certs if c.expiry_date >= today and c.verified]
    psira_expired = [c for c in psira_certs if c.expiry_date < today]
    psira_expiring_30 = [c for c in psira_certs if 0 <= (c.expiry_date - today).days <= 30]
    psira_expiring_90 = [c for c in psira_certs if 0 <= (c.expiry_date - today).days <= 90]

    grade_counts: dict[str, int] = {}
    for c in psira_valid:
        g = c.psira_grade.value if c.psira_grade else "Unknown"
        grade_counts[g] = grade_counts.get(g, 0) + 1

    # --- Firearm competency summary ---
    firearm_certs = [c for c in all_certs if c.firearm_competency is not None]
    firearm_valid = [c for c in firearm_certs if c.expiry_date >= today and c.verified]
    firearm_expired = [c for c in firearm_certs if c.expiry_date < today]
    firearm_expiring_30 = [c for c in firearm_certs if 0 <= (c.expiry_date - today).days <= 30]

    armed_employees = [e for e in active_employees if e.role and e.role.value == "armed"]
    armed_with_firearm = set()
    for c in firearm_valid:
        if c.employee_id in {e.employee_id for e in armed_employees}:
            armed_with_firearm.add(c.employee_id)

    # --- General certification summary ---
    all_valid = [c for c in all_certs if c.expiry_date >= today]
    all_expired = [c for c in all_certs if c.expiry_date < today]
    verified_count = sum(1 for c in all_certs if c.verified)

    employees_with_certs = set(c.employee_id for c in all_certs)
    employees_without = [
        {"employee_id": e.employee_id, "name": f"{e.first_name} {e.last_name}", "role": e.role.value if e.role else "unknown"}
        for e in active_employees
        if e.employee_id not in employees_with_certs
    ]

    # --- Expiry alerts (next 90 days) sorted by urgency ---
    expiry_alerts = []
    for c in all_certs:
        days_left = (c.expiry_date - today).days
        if days_left <= 90:
            emp = next((e for e in active_employees if e.employee_id == c.employee_id), None)
            severity = "expired" if days_left < 0 else "critical" if days_left <= 14 else "warning" if days_left <= 30 else "info"
            expiry_alerts.append({
                "cert_id": c.cert_id,
                "employee_id": c.employee_id,
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
                "cert_type": c.cert_type,
                "psira_grade": c.psira_grade.value if c.psira_grade else None,
                "firearm_type": c.firearm_competency.value if c.firearm_competency else None,
                "expiry_date": c.expiry_date.isoformat(),
                "days_remaining": days_left,
                "severity": severity,
                "verified": c.verified,
            })

    expiry_alerts.sort(key=lambda x: x["days_remaining"])

    return {
        "total_active_employees": total_active,
        "psira_summary": {
            "total_psira_certs": len(psira_certs),
            "valid": len(psira_valid),
            "expired": len(psira_expired),
            "expiring_30_days": len(psira_expiring_30),
            "expiring_90_days": len(psira_expiring_90),
            "grade_distribution": grade_counts,
        },
        "firearm_summary": {
            "total_firearm_certs": len(firearm_certs),
            "valid": len(firearm_valid),
            "expired": len(firearm_expired),
            "expiring_30_days": len(firearm_expiring_30),
            "armed_employees": len(armed_employees),
            "armed_with_valid_cert": len(armed_with_firearm),
            "armed_without_cert": len(armed_employees) - len(armed_with_firearm),
        },
        "certification_summary": {
            "total_certs": len(all_certs),
            "valid": len(all_valid),
            "expired": len(all_expired),
            "verified": verified_count,
            "unverified": len(all_certs) - verified_count,
            "employees_with_certs": len(employees_with_certs),
            "employees_without_certs": len(employees_without),
            "compliance_rate": round(len(employees_with_certs) / total_active * 100, 1) if total_active > 0 else 0,
        },
        "expiry_alerts": expiry_alerts,
        "employees_without_certs": employees_without[:20],
    }


@router.get("/expiring", response_model=List[CertificationResponse])
async def get_expiring_certifications(
    days: int = 30,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get certifications expiring within specified days (filtered by organization via employee)."""
    today = date.today()
    expiry_threshold = today + timedelta(days=days)

    certifications = db.query(Certification).join(Employee).filter(
        Employee.org_id == org_id,
        Certification.expiry_date <= expiry_threshold,
        Certification.expiry_date >= today
    ).all()

    return certifications


@router.get("/{cert_id}", response_model=CertificationResponse)
async def get_certification(
    cert_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get a specific certification by ID (filtered by organization via employee)."""
    certification = db.query(Certification).join(Employee).filter(
        Certification.cert_id == cert_id,
        Employee.org_id == org_id
    ).first()

    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")

    return certification


@router.post("/", response_model=CertificationResponse, status_code=201)
async def create_certification(
    certification_data: CertificationCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Create a new certification (employee must belong to organization)."""
    # Verify employee belongs to organization
    employee = db.query(Employee).filter(
        Employee.employee_id == certification_data.employee_id,
        Employee.org_id == org_id
    ).first()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail=f"Employee with ID {certification_data.employee_id} not found in your organization"
        )

    # Validate dates
    if certification_data.expiry_date <= certification_data.issue_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date must be after issue date"
        )

    certification = Certification(**certification_data.model_dump())
    db.add(certification)
    db.commit()
    db.refresh(certification)

    return certification


@router.put("/{cert_id}", response_model=CertificationResponse)
async def update_certification(
    cert_id: int,
    certification_data: CertificationUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Update an existing certification (filtered by organization via employee)."""
    certification = db.query(Certification).join(Employee).filter(
        Certification.cert_id == cert_id,
        Employee.org_id == org_id
    ).first()

    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")

    # Update only provided fields
    update_data = certification_data.model_dump(exclude_unset=True)

    # Validate dates if both are being updated or if one is being updated
    if "issue_date" in update_data or "expiry_date" in update_data:
        issue = update_data.get("issue_date", certification.issue_date)
        expiry = update_data.get("expiry_date", certification.expiry_date)
        if expiry <= issue:
            raise HTTPException(
                status_code=400,
                detail="Expiry date must be after issue date"
            )

    for key, value in update_data.items():
        setattr(certification, key, value)

    db.commit()
    db.refresh(certification)

    return certification


@router.delete("/{cert_id}")
async def delete_certification(
    cert_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Delete a certification (filtered by organization via employee)."""
    certification = db.query(Certification).join(Employee).filter(
        Certification.cert_id == cert_id,
        Employee.org_id == org_id
    ).first()

    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")

    db.delete(certification)
    db.commit()

    return {"message": "Certification deleted successfully"}
