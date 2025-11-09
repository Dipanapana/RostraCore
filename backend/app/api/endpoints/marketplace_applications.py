"""Job marketplace endpoints - Applications."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.job_application import JobApplication, ApplicationStatus
from app.models.job_posting import JobPosting
from app.models.guard_applicant import GuardApplicant
from app.models.employee import Employee, EmployeeRole, EmployeeStatus
from pydantic import BaseModel, Field

router = APIRouter()


# Schemas
class ApplicationCreate(BaseModel):
    job_id: int
    applicant_id: int
    cover_letter: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    review_notes: Optional[str] = None
    interview_date: Optional[datetime] = None
    interview_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class ApplicationResponse(BaseModel):
    application_id: int
    job_id: int
    applicant_id: int
    cover_letter: Optional[str]
    status: str
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[int]
    review_notes: Optional[str]
    interview_date: Optional[datetime]
    interview_notes: Optional[str]
    hired: bool
    hired_at: Optional[datetime]
    hired_as_employee_id: Optional[int]
    rejection_reason: Optional[str]
    applied_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HireApplicantRequest(BaseModel):
    hourly_rate: float = Field(..., gt=0)
    max_hours_week: int = Field(default=48)
    role: str = Field(default="unarmed", pattern="^(armed|unarmed|supervisor)$")


@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply_to_job(application_data: ApplicationCreate, db: Session = Depends(get_db)):
    """Submit application to a job posting."""

    # Check if job exists and is open
    job = db.query(JobPosting).filter(JobPosting.job_id == application_data.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found"
        )

    if job.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job posting is not accepting applications"
        )

    # Check if guard exists
    guard = db.query(GuardApplicant).filter(
        GuardApplicant.applicant_id == application_data.applicant_id
    ).first()
    if not guard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guard profile not found"
        )

    # Check if already applied
    existing = db.query(JobApplication).filter(
        JobApplication.job_id == application_data.job_id,
        JobApplication.applicant_id == application_data.applicant_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already applied to this job"
        )

    # Create application
    application = JobApplication(
        job_id=application_data.job_id,
        applicant_id=application_data.applicant_id,
        cover_letter=application_data.cover_letter,
        status=ApplicationStatus.SUBMITTED,
        hired=False
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return application


@router.get("/", response_model=List[ApplicationResponse])
async def list_applications(
    job_id: Optional[int] = None,
    applicant_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List job applications with filters."""

    query = db.query(JobApplication)

    if job_id:
        query = query.filter(JobApplication.job_id == job_id)

    if applicant_id:
        query = query.filter(JobApplication.applicant_id == applicant_id)

    if status_filter:
        query = query.filter(JobApplication.status == status_filter)

    query = query.order_by(JobApplication.applied_at.desc())

    applications = query.offset(skip).limit(limit).all()
    return applications


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(application_id: int, db: Session = Depends(get_db)):
    """Get application by ID."""
    application = db.query(JobApplication).filter(
        JobApplication.application_id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    return application


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: int,
    application_data: ApplicationUpdate,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Update application (review, schedule interview, etc)."""
    application = db.query(JobApplication).filter(
        JobApplication.application_id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    # Update fields
    update_data = application_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(application, field, value)

    # If status is being changed to under_review and not already reviewed
    if application_data.status and not application.reviewed_at:
        application.reviewed_at = datetime.utcnow()
        if user_id:
            application.reviewed_by = user_id

    application.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(application)

    return application


@router.post("/{application_id}/hire", response_model=ApplicationResponse)
async def hire_applicant(
    application_id: int,
    hire_data: HireApplicantRequest,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Hire an applicant - converts them from guard applicant to employee."""
    application = db.query(JobApplication).filter(
        JobApplication.application_id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    if application.hired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Applicant already hired"
        )

    # Get guard details
    guard = db.query(GuardApplicant).filter(
        GuardApplicant.applicant_id == application.applicant_id
    ).first()

    if not guard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guard profile not found"
        )

    # Get job to get organization_id
    job = db.query(JobPosting).filter(JobPosting.job_id == application.job_id).first()

    # Create employee from guard applicant
    # Split full name into first and last
    name_parts = guard.full_name.split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    employee = Employee(
        first_name=first_name,
        last_name=last_name,
        id_number=guard.id_number if guard.id_number else f"TEMP-{guard.applicant_id}",
        role=EmployeeRole(hire_data.role),
        hourly_rate=hire_data.hourly_rate,
        max_hours_week=hire_data.max_hours_week,
        status=EmployeeStatus.ACTIVE,
        email=guard.email,
        phone=guard.phone,
        psira_number=guard.psira_number,
        psira_expiry_date=guard.psira_expiry_date,
        psira_grade=guard.psira_grade,
        province=guard.province,
        address=f"{guard.street_address or ''}, {guard.suburb or ''}, {guard.city or ''}, {guard.province}".strip(', '),
        profile_photo_url=guard.profile_photo_url,
        hired_from_marketplace=True,
        marketplace_applicant_id=guard.applicant_id
    )

    db.add(employee)
    db.flush()  # Get employee_id

    # Update application
    application.hired = True
    application.hired_at = datetime.utcnow()
    application.hired_as_employee_id = employee.employee_id
    application.status = ApplicationStatus.HIRED

    # Update job filled count
    job.filled_count += 1
    if job.filled_count >= job.positions_available:
        job.status = "filled"

    # Mark guard as no longer available
    guard.available_for_work = False

    # Record hire commission - DEDUCTED FROM GUARD'S SALARY (not company)
    from app.models.marketplace_commission import MarketplaceCommission, BulkHiringPackage, CommissionType, CommissionStatus, DeductionMethod
    from app.models.marketplace_settings import MarketplaceSettings
    from decimal import Decimal
    from datetime import date, timedelta

    # Get configurable commission settings
    commission_settings = MarketplaceSettings.get_commission_settings(db)
    commission_amount = Decimal(str(commission_settings.get('amount', 500)))
    deduction_method = commission_settings.get('deduction_method', 'split')  # full or split
    installments = commission_settings.get('installments', 3)  # 1 or 3

    # Check if organization has bulk package that SPONSORS guard fees
    package = db.query(BulkHiringPackage).filter(
        BulkHiringPackage.organization_id == job.organization_id,
        BulkHiringPackage.status == "active",
        BulkHiringPackage.payment_status == "paid"
    ).first()

    if package and package.hires_remaining > 0:
        # Company sponsors the R500 fee - NO deduction from guard
        package.hires_used += 1
        if package.hires_remaining <= 0:
            package.status = "expired"

        commission = MarketplaceCommission(
            organization_id=job.organization_id,
            commission_type=CommissionType.HIRE,
            amount=Decimal("0.00"),
            description=f"Hire fee sponsored by company via {package.package_type} package (Hire {package.hires_used}/{package.hires_quota})",
            application_id=application.application_id,
            employee_id=employee.employee_id,
            job_id=job.job_id,
            status=CommissionStatus.WAIVED,
            deduction_method=None,
            installments=0
        )
    else:
        # Deduct R500 from GUARD's salary (first payment or split over 3)
        if deduction_method == 'full':
            # Full R500 on first payroll
            installments_count = 1
            amount_per_payment = commission_amount
            description = "Marketplace placement fee (deducted from first salary payment)"
        else:
            # Split over 3 payrolls (R166.67 each)
            installments_count = installments
            amount_per_payment = commission_amount / installments_count
            description = f"Marketplace placement fee (R{float(amount_per_payment):.2f} per payroll over {installments_count} payments)"

        commission = MarketplaceCommission(
            organization_id=job.organization_id,
            commission_type=CommissionType.HIRE,
            amount=commission_amount,
            description=description,
            application_id=application.application_id,
            employee_id=employee.employee_id,
            job_id=job.job_id,
            status=CommissionStatus.PENDING,
            deduction_method=deduction_method,
            installments=installments_count,
            installments_paid=0,
            amount_per_installment=amount_per_payment,
            next_deduction_date=None  # Will be set when first payroll is processed
        )

        # Link employee to commission for payroll integration
        employee.marketplace_commission_id = commission.commission_id
        employee.marketplace_commission_status = "pending"

    db.add(commission)
    application.commission_charged = True
    application.commission_id = commission.commission_id

    db.commit()
    db.refresh(application)

    return application


@router.post("/{application_id}/reject", response_model=ApplicationResponse)
async def reject_application(
    application_id: int,
    rejection_reason: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Reject an application."""
    application = db.query(JobApplication).filter(
        JobApplication.application_id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    application.status = ApplicationStatus.REJECTED
    application.rejection_reason = rejection_reason
    application.reviewed_at = datetime.utcnow()
    if user_id:
        application.reviewed_by = user_id
    application.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(application)

    return application


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def withdraw_application(application_id: int, db: Session = Depends(get_db)):
    """Withdraw application (by applicant)."""
    application = db.query(JobApplication).filter(
        JobApplication.application_id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    application.status = ApplicationStatus.WITHDRAWN
    application.updated_at = datetime.utcnow()
    db.commit()

    return None
