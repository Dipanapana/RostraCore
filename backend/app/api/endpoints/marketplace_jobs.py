"""Job marketplace endpoints - Job postings."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models.job_posting import JobPosting, JobStatus, ContractType
from pydantic import BaseModel, Field

router = APIRouter()


# Schemas
class JobPostingCreate(BaseModel):
    organization_id: int
    client_id: Optional[int] = None
    site_id: Optional[int] = None

    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10)
    required_psira_grade: str = Field(..., pattern="^[A-E]$")
    required_skills: Optional[List[str]] = None
    required_experience_years: Optional[int] = None

    province: str = Field(..., min_length=2, max_length=50)
    city: Optional[str] = None
    remote_possible: bool = False

    shift_pattern: Optional[str] = None
    hourly_rate: Optional[float] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    positions_available: int = Field(default=1, ge=1)
    start_date: Optional[date] = None
    contract_type: str = Field(..., pattern="^(permanent|temporary|contract|part_time)$")
    contract_duration_months: Optional[int] = None

    requires_drivers_license: bool = False
    requires_firearm_competency: bool = False

    expires_at: Optional[datetime] = None


class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_psira_grade: Optional[str] = None
    required_skills: Optional[List[str]] = None
    required_experience_years: Optional[int] = None

    province: Optional[str] = None
    city: Optional[str] = None
    remote_possible: Optional[bool] = None

    shift_pattern: Optional[str] = None
    hourly_rate: Optional[float] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    positions_available: Optional[int] = None
    start_date: Optional[date] = None
    contract_duration_months: Optional[int] = None

    requires_drivers_license: Optional[bool] = None
    requires_firearm_competency: Optional[bool] = None

    status: Optional[str] = None
    expires_at: Optional[datetime] = None


class JobPostingResponse(BaseModel):
    job_id: int
    organization_id: int
    client_id: Optional[int]
    site_id: Optional[int]

    title: str
    description: str
    required_psira_grade: str
    required_skills: Optional[List[str]]
    required_experience_years: Optional[int]

    province: str
    city: Optional[str]
    remote_possible: bool

    shift_pattern: Optional[str]
    hourly_rate: Optional[float]
    salary_min: Optional[float]
    salary_max: Optional[float]
    positions_available: int
    start_date: Optional[date]
    contract_type: str
    contract_duration_months: Optional[int]

    requires_drivers_license: bool
    requires_firearm_competency: bool

    status: str
    created_by: Optional[int]
    expires_at: Optional[datetime]
    filled_count: int

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("/", response_model=JobPostingResponse, status_code=status.HTTP_201_CREATED)
async def create_job_posting(
    job_data: JobPostingCreate,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Create a new job posting."""

    job = JobPosting(
        organization_id=job_data.organization_id,
        client_id=job_data.client_id,
        site_id=job_data.site_id,
        title=job_data.title,
        description=job_data.description,
        required_psira_grade=job_data.required_psira_grade,
        required_skills=job_data.required_skills,
        required_experience_years=job_data.required_experience_years,
        province=job_data.province,
        city=job_data.city,
        remote_possible=job_data.remote_possible,
        shift_pattern=job_data.shift_pattern,
        hourly_rate=job_data.hourly_rate,
        salary_min=job_data.salary_min,
        salary_max=job_data.salary_max,
        positions_available=job_data.positions_available,
        start_date=job_data.start_date,
        contract_type=job_data.contract_type,
        contract_duration_months=job_data.contract_duration_months,
        requires_drivers_license=job_data.requires_drivers_license,
        requires_firearm_competency=job_data.requires_firearm_competency,
        status=JobStatus.OPEN,
        created_by=user_id,
        expires_at=job_data.expires_at,
        filled_count=0
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job


@router.get("/", response_model=List[JobPostingResponse])
async def browse_jobs(
    province: Optional[str] = None,
    psira_grade: Optional[str] = None,
    contract_type: Optional[str] = None,
    status_filter: str = "open",
    organization_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Browse job postings."""

    query = db.query(JobPosting)

    if status_filter:
        query = query.filter(JobPosting.status == status_filter)

    if organization_id:
        query = query.filter(JobPosting.organization_id == organization_id)

    if province:
        query = query.filter(JobPosting.province == province)

    if psira_grade:
        query = query.filter(JobPosting.required_psira_grade == psira_grade)

    if contract_type:
        query = query.filter(JobPosting.contract_type == contract_type)

    # Order by most recent first
    query = query.order_by(JobPosting.created_at.desc())

    jobs = query.offset(skip).limit(limit).all()
    return jobs


@router.get("/{job_id}", response_model=JobPostingResponse)
async def get_job_posting(job_id: int, db: Session = Depends(get_db)):
    """Get job posting by ID."""
    job = db.query(JobPosting).filter(JobPosting.job_id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found"
        )

    return job


@router.put("/{job_id}", response_model=JobPostingResponse)
async def update_job_posting(
    job_id: int,
    job_data: JobPostingUpdate,
    db: Session = Depends(get_db)
):
    """Update job posting."""
    job = db.query(JobPosting).filter(JobPosting.job_id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found"
        )

    # Update fields
    update_data = job_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_posting(job_id: int, db: Session = Depends(get_db)):
    """Delete job posting."""
    job = db.query(JobPosting).filter(JobPosting.job_id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found"
        )

    db.delete(job)
    db.commit()
    return None


@router.post("/{job_id}/close", response_model=JobPostingResponse)
async def close_job_posting(job_id: int, db: Session = Depends(get_db)):
    """Close job posting (no longer accepting applications)."""
    job = db.query(JobPosting).filter(JobPosting.job_id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found"
        )

    job.status = JobStatus.CLOSED
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    return job


@router.post("/{job_id}/mark-filled", response_model=JobPostingResponse)
async def mark_job_filled(job_id: int, db: Session = Depends(get_db)):
    """Mark job as filled (all positions filled)."""
    job = db.query(JobPosting).filter(JobPosting.job_id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found"
        )

    job.status = JobStatus.FILLED
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    return job
