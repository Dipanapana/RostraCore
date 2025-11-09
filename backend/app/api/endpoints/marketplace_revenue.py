"""Marketplace revenue endpoints - Commissions, premium jobs, bulk packages."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta, date
from app.database import get_db
from app.models.marketplace_commission import (
    MarketplaceCommission,
    BulkHiringPackage,
    PremiumJobPosting,
    CommissionType,
    CommissionStatus,
    PackageType,
    PackageStatus
)
from app.models.job_posting import JobPosting
from app.models.organization import Organization
from pydantic import BaseModel, Field
from decimal import Decimal

router = APIRouter()


# === COMMISSION SCHEMAS ===

class CommissionResponse(BaseModel):
    commission_id: int
    organization_id: int
    commission_type: str
    amount: float
    currency: str
    description: Optional[str]
    job_id: Optional[int]
    application_id: Optional[int]
    employee_id: Optional[int]
    status: str
    due_date: Optional[date]
    paid_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class CommissionSummary(BaseModel):
    total_commissions: float
    pending_amount: float
    paid_amount: float
    commission_count: int
    pending_count: int
    paid_count: int


# === BULK PACKAGE SCHEMAS ===

class BulkPackageCreate(BaseModel):
    organization_id: int
    package_type: str = Field(..., pattern="^(starter|professional|enterprise)$")


class BulkPackageResponse(BaseModel):
    package_id: int
    organization_id: int
    package_type: str
    hires_quota: int
    hires_used: int
    hires_remaining: int
    price_paid: float
    discount_percentage: Optional[float]
    status: str
    payment_status: str
    created_at: datetime

    class Config:
        from_attributes = True


# === PREMIUM JOB SCHEMAS ===

class PremiumJobCreate(BaseModel):
    job_id: int
    badge_color: str = Field(..., pattern="^(bronze|silver|gold)$")
    duration_days: int = Field(default=7, ge=1, le=90)


class PremiumJobResponse(BaseModel):
    premium_job_id: int
    job_id: int
    organization_id: int
    badge_color: str
    priority_rank: int
    boost_multiplier: float
    start_date: datetime
    end_date: datetime
    price_paid: float
    payment_status: str
    is_active: bool
    views_count: int
    applications_count: int

    class Config:
        from_attributes = True


# === COMMISSION ENDPOINTS ===

@router.post("/commissions/hire", response_model=CommissionResponse, status_code=status.HTTP_201_CREATED)
async def record_hire_commission(
    application_id: int,
    organization_id: int,
    db: Session = Depends(get_db)
):
    """
    Record R500 commission for successful hire.

    Automatically called when an applicant is hired.
    """

    # Check if organization has active bulk package
    package = db.query(BulkHiringPackage).filter(
        BulkHiringPackage.organization_id == organization_id,
        BulkHiringPackage.status == PackageStatus.ACTIVE,
        BulkHiringPackage.payment_status == "paid"
    ).first()

    if package and package.is_valid:
        # Use package quota instead of charging commission
        package.hires_used += 1
        if package.hires_remaining <= 0:
            package.status = PackageStatus.EXPIRED

        commission = MarketplaceCommission(
            organization_id=organization_id,
            commission_type=CommissionType.HIRE,
            amount=Decimal("0.00"),  # Covered by package
            description=f"Hire covered by {package.package_type} package",
            application_id=application_id,
            status=CommissionStatus.WAIVED
        )
    else:
        # Charge standard R500 commission
        commission = MarketplaceCommission(
            organization_id=organization_id,
            commission_type=CommissionType.HIRE,
            amount=Decimal("500.00"),
            description="Per-hire commission",
            application_id=application_id,
            status=CommissionStatus.PENDING,
            due_date=date.today() + timedelta(days=30)
        )

    db.add(commission)
    db.commit()
    db.refresh(commission)

    return commission


@router.get("/commissions", response_model=List[CommissionResponse])
async def list_commissions(
    organization_id: Optional[int] = None,
    commission_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List marketplace commissions."""

    query = db.query(MarketplaceCommission)

    if organization_id:
        query = query.filter(MarketplaceCommission.organization_id == organization_id)

    if commission_type:
        query = query.filter(MarketplaceCommission.commission_type == commission_type)

    if status_filter:
        query = query.filter(MarketplaceCommission.status == status_filter)

    query = query.order_by(MarketplaceCommission.created_at.desc())

    commissions = query.offset(skip).limit(limit).all()
    return commissions


@router.get("/commissions/summary", response_model=CommissionSummary)
async def get_commission_summary(
    organization_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get commission summary statistics."""

    query = db.query(MarketplaceCommission)

    if organization_id:
        query = query.filter(MarketplaceCommission.organization_id == organization_id)

    # Total commissions
    total = db.query(func.sum(MarketplaceCommission.amount)).filter(
        MarketplaceCommission.organization_id == organization_id if organization_id else True
    ).scalar() or 0

    # Pending commissions
    pending = db.query(func.sum(MarketplaceCommission.amount)).filter(
        MarketplaceCommission.status == CommissionStatus.PENDING,
        MarketplaceCommission.organization_id == organization_id if organization_id else True
    ).scalar() or 0

    # Paid commissions
    paid = db.query(func.sum(MarketplaceCommission.amount)).filter(
        MarketplaceCommission.status == CommissionStatus.PAID,
        MarketplaceCommission.organization_id == organization_id if organization_id else True
    ).scalar() or 0

    # Counts
    total_count = query.count()
    pending_count = query.filter(MarketplaceCommission.status == CommissionStatus.PENDING).count()
    paid_count = query.filter(MarketplaceCommission.status == CommissionStatus.PAID).count()

    return CommissionSummary(
        total_commissions=float(total),
        pending_amount=float(pending),
        paid_amount=float(paid),
        commission_count=total_count,
        pending_count=pending_count,
        paid_count=paid_count
    )


@router.post("/commissions/{commission_id}/mark-paid", response_model=CommissionResponse)
async def mark_commission_paid(
    commission_id: int,
    payment_reference: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Mark commission as paid."""

    commission = db.query(MarketplaceCommission).filter(
        MarketplaceCommission.commission_id == commission_id
    ).first()

    if not commission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commission not found"
        )

    commission.status = CommissionStatus.PAID
    commission.paid_at = datetime.utcnow()
    commission.payment_reference = payment_reference

    db.commit()
    db.refresh(commission)

    return commission


# === BULK PACKAGE ENDPOINTS ===

@router.post("/bulk-packages", response_model=BulkPackageResponse, status_code=status.HTTP_201_CREATED)
async def create_bulk_package(
    package_data: BulkPackageCreate,
    db: Session = Depends(get_db)
):
    """
    Purchase bulk hiring package.

    Pricing:
    - Starter: 5 hires @ R2000 (R400/hire, 20% discount)
    - Professional: 10 hires @ R3500 (R350/hire, 30% discount)
    - Enterprise: 25 hires @ R7500 (R300/hire, 40% discount)
    """

    # Package pricing
    package_pricing = {
        "starter": {"quota": 5, "price": 2000, "discount": 20},
        "professional": {"quota": 10, "price": 3500, "discount": 30},
        "enterprise": {"quota": 25, "price": 7500, "discount": 40},
    }

    pricing = package_pricing[package_data.package_type]

    package = BulkHiringPackage(
        organization_id=package_data.organization_id,
        package_type=package_data.package_type,
        hires_quota=pricing["quota"],
        hires_used=0,
        price_paid=Decimal(str(pricing["price"])),
        discount_percentage=pricing["discount"],
        status=PackageStatus.ACTIVE,
        payment_status="pending"
    )

    db.add(package)
    db.commit()
    db.refresh(package)

    return package


@router.get("/bulk-packages", response_model=List[BulkPackageResponse])
async def list_bulk_packages(
    organization_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List bulk hiring packages."""

    query = db.query(BulkHiringPackage)

    if organization_id:
        query = query.filter(BulkHiringPackage.organization_id == organization_id)

    if status_filter:
        query = query.filter(BulkHiringPackage.status == status_filter)

    query = query.order_by(BulkHiringPackage.created_at.desc())

    packages = query.all()
    return packages


# === PREMIUM JOB ENDPOINTS ===

@router.post("/premium-jobs", response_model=PremiumJobResponse, status_code=status.HTTP_201_CREATED)
async def create_premium_job(
    premium_data: PremiumJobCreate,
    db: Session = Depends(get_db)
):
    """
    Upgrade job to premium listing.

    Pricing:
    - Bronze: R200 (7 days, 2x visibility)
    - Silver: R350 (14 days, 3x visibility)
    - Gold: R500 (30 days, 5x visibility)
    """

    # Check if job exists
    job = db.query(JobPosting).filter(JobPosting.job_id == premium_data.job_id).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found"
        )

    # Pricing based on badge
    badge_pricing = {
        "bronze": {"price": 200, "boost": 2.0, "rank": 3},
        "silver": {"price": 350, "boost": 3.0, "rank": 2},
        "gold": {"price": 500, "boost": 5.0, "rank": 1},
    }

    pricing = badge_pricing[premium_data.badge_color]

    premium_job = PremiumJobPosting(
        job_id=premium_data.job_id,
        organization_id=job.organization_id,
        badge_color=premium_data.badge_color,
        priority_rank=pricing["rank"],
        boost_multiplier=pricing["boost"],
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow() + timedelta(days=premium_data.duration_days),
        price_paid=Decimal(str(pricing["price"])),
        payment_status="pending"
    )

    db.add(premium_job)

    # Mark job as premium
    job.is_premium = True

    db.commit()
    db.refresh(premium_job)

    return premium_job


@router.get("/premium-jobs", response_model=List[PremiumJobResponse])
async def list_premium_jobs(
    organization_id: Optional[int] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List premium job postings."""

    query = db.query(PremiumJobPosting)

    if organization_id:
        query = query.filter(PremiumJobPosting.organization_id == organization_id)

    if active_only:
        query = query.filter(
            PremiumJobPosting.payment_status == "paid",
            PremiumJobPosting.start_date <= datetime.utcnow(),
            PremiumJobPosting.end_date >= datetime.utcnow()
        )

    query = query.order_by(PremiumJobPosting.priority_rank.asc())

    premium_jobs = query.all()
    return premium_jobs
