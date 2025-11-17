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
