"""Certifications API endpoints."""

from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.certification import Certification

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
    db: Session = Depends(get_db)
):
    """Get all certifications, optionally filtered by employee_id."""
    query = db.query(Certification)

    if employee_id is not None:
        query = query.filter(Certification.employee_id == employee_id)

    certifications = query.all()
    return certifications


@router.get("/expiring", response_model=List[CertificationResponse])
async def get_expiring_certifications(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get certifications expiring within specified days."""
    today = date.today()
    expiry_threshold = today + timedelta(days=days)

    certifications = db.query(Certification).filter(
        Certification.expiry_date <= expiry_threshold,
        Certification.expiry_date >= today
    ).all()

    return certifications


@router.get("/{cert_id}", response_model=CertificationResponse)
async def get_certification(
    cert_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific certification by ID."""
    certification = db.query(Certification).filter(
        Certification.cert_id == cert_id
    ).first()

    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")

    return certification


@router.post("/", response_model=CertificationResponse, status_code=201)
async def create_certification(
    certification_data: CertificationCreate,
    db: Session = Depends(get_db)
):
    """Create a new certification."""
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
    db: Session = Depends(get_db)
):
    """Update an existing certification."""
    certification = db.query(Certification).filter(
        Certification.cert_id == cert_id
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
    db: Session = Depends(get_db)
):
    """Delete a certification."""
    certification = db.query(Certification).filter(
        Certification.cert_id == cert_id
    ).first()

    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")

    db.delete(certification)
    db.commit()

    return {"message": "Certification deleted successfully"}
