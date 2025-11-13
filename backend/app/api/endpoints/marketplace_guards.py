"""Guard marketplace endpoints - Registration and profiles."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models.guard_applicant import GuardApplicant, ApplicantStatus
from app.models.employee import Employee
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Schemas
class GuardRegistration(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=8)

    # PSIRA Details
    psira_number: str = Field(..., min_length=5, max_length=50)
    psira_grade: str = Field(..., pattern="^[A-E]$")
    psira_expiry_date: date

    # Location
    province: str = Field(..., min_length=2, max_length=50)
    city: Optional[str] = None

    # Work Preferences
    provinces_willing_to_work: Optional[List[str]] = None
    hourly_rate_expectation: Optional[float] = None


class GuardProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None

    # Location
    street_address: Optional[str] = None
    suburb: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None

    # Work Preferences
    provinces_willing_to_work: Optional[List[str]] = None
    available_for_work: Optional[bool] = None
    hourly_rate_expectation: Optional[float] = None
    years_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None

    # Qualifications
    has_drivers_license: Optional[bool] = None
    drivers_license_code: Optional[str] = None
    has_firearm_competency: Optional[bool] = None
    firearm_competency_expiry: Optional[date] = None


class GuardResponse(BaseModel):
    applicant_id: int
    full_name: str
    email: str
    phone: str
    psira_number: str
    psira_grade: str
    psira_expiry_date: date
    province: str
    city: Optional[str]
    provinces_willing_to_work: Optional[List[str]]
    available_for_work: bool
    hourly_rate_expectation: Optional[float]
    years_experience: Optional[int]
    skills: Optional[List[str]]
    languages: Optional[List[str]]
    has_drivers_license: bool
    has_firearm_competency: bool
    profile_photo_url: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class GuardLogin(BaseModel):
    email: EmailStr
    password: str


@router.post("/register", response_model=GuardResponse, status_code=status.HTTP_201_CREATED)
async def register_guard(guard_data: GuardRegistration, db: Session = Depends(get_db)):
    """Register as a PSIRA-certified guard looking for work."""

    # Check if email already exists
    existing_email = db.query(GuardApplicant).filter(GuardApplicant.email == guard_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if PSIRA number already exists
    existing_psira = db.query(GuardApplicant).filter(GuardApplicant.psira_number == guard_data.psira_number).first()
    if existing_psira:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PSIRA number already registered"
        )

    # Hash password
    hashed_password = pwd_context.hash(guard_data.password)

    # Create guard applicant
    guard = GuardApplicant(
        full_name=guard_data.full_name,
        email=guard_data.email,
        phone=guard_data.phone,
        password_hash=hashed_password,
        psira_number=guard_data.psira_number,
        psira_grade=guard_data.psira_grade,
        psira_expiry_date=guard_data.psira_expiry_date,
        province=guard_data.province,
        city=guard_data.city,
        provinces_willing_to_work=guard_data.provinces_willing_to_work,
        hourly_rate_expectation=guard_data.hourly_rate_expectation,
        status=ApplicantStatus.PENDING_VERIFICATION,
        available_for_work=True
    )

    db.add(guard)
    db.commit()
    db.refresh(guard)

    return guard


@router.post("/login")
async def login_guard(credentials: GuardLogin, db: Session = Depends(get_db)):
    """Guard login."""
    guard = db.query(GuardApplicant).filter(GuardApplicant.email == credentials.email).first()

    if not guard:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not pwd_context.verify(credentials.password, guard.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if guard.status == ApplicantStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended"
        )

    return {
        "applicant_id": guard.applicant_id,
        "full_name": guard.full_name,
        "email": guard.email,
        "status": guard.status
    }


@router.get("/", response_model=List[GuardResponse])
async def browse_guards(
    province: Optional[str] = None,
    psira_grade: Optional[str] = None,
    available_only: bool = True,
    has_drivers_license: Optional[bool] = None,
    has_firearm_competency: Optional[bool] = None,
    min_experience: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Browse available guards (for companies to recruit)."""

    query = db.query(GuardApplicant).filter(
        GuardApplicant.status == ApplicantStatus.VERIFIED
    )

    if available_only:
        query = query.filter(GuardApplicant.available_for_work == True)

    if province:
        # Check if province is in provinces_willing_to_work or matches their home province
        query = query.filter(
            or_(
                GuardApplicant.province == province,
                GuardApplicant.provinces_willing_to_work.contains([province])
            )
        )

    if psira_grade:
        query = query.filter(GuardApplicant.psira_grade == psira_grade)

    if has_drivers_license is not None:
        query = query.filter(GuardApplicant.has_drivers_license == has_drivers_license)

    if has_firearm_competency is not None:
        query = query.filter(GuardApplicant.has_firearm_competency == has_firearm_competency)

    if min_experience is not None:
        query = query.filter(GuardApplicant.years_experience >= min_experience)

    # Order by rating (if we add it later), for now by created date
    query = query.order_by(GuardApplicant.created_at.desc())

    guards = query.offset(skip).limit(limit).all()
    return guards


@router.get("/{applicant_id}", response_model=GuardResponse)
async def get_guard_profile(applicant_id: int, db: Session = Depends(get_db)):
    """Get guard profile by ID."""
    guard = db.query(GuardApplicant).filter(GuardApplicant.applicant_id == applicant_id).first()

    if not guard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guard profile not found"
        )

    return guard


@router.put("/{applicant_id}", response_model=GuardResponse)
async def update_guard_profile(
    applicant_id: int,
    profile_data: GuardProfileUpdate,
    db: Session = Depends(get_db)
):
    """Update guard profile."""
    guard = db.query(GuardApplicant).filter(GuardApplicant.applicant_id == applicant_id).first()

    if not guard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guard profile not found"
        )

    # Update fields
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(guard, field, value)

    guard.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(guard)

    return guard


@router.post("/{applicant_id}/verify", response_model=GuardResponse)
async def verify_guard(
    applicant_id: int,
    user_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Verify a guard applicant (admin only)."""
    guard = db.query(GuardApplicant).filter(GuardApplicant.applicant_id == applicant_id).first()

    if not guard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guard profile not found"
        )

    guard.status = ApplicantStatus.VERIFIED
    guard.verified_at = datetime.utcnow()
    guard.verified_by = user_id
    guard.verification_notes = notes

    db.commit()
    db.refresh(guard)

    return guard
