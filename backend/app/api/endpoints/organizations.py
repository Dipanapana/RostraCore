"""Organization management API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.organization import Organization, SubscriptionTier, SubscriptionStatus


router = APIRouter()


# Pydantic schemas
class OrganizationBase(BaseModel):
    """Base organization schema."""
    company_name: str = Field(..., min_length=1, max_length=200)
    psira_company_registration: Optional[str] = Field(None, max_length=50)
    subscription_tier: SubscriptionTier = SubscriptionTier.STARTER
    max_employees: Optional[int] = None
    max_sites: Optional[int] = None
    max_shifts_per_month: Optional[int] = None
    billing_email: Optional[str] = None


class OrganizationCreate(OrganizationBase):
    """Schema for creating an organization."""
    org_code: str = Field(..., min_length=2, max_length=20, pattern="^[A-Z0-9_]+$")


class OrganizationUpdate(BaseModel):
    """Schema for updating an organization."""
    company_name: Optional[str] = Field(None, min_length=1, max_length=200)
    psira_company_registration: Optional[str] = Field(None, max_length=50)
    subscription_tier: Optional[SubscriptionTier] = None
    subscription_status: Optional[SubscriptionStatus] = None
    max_employees: Optional[int] = None
    max_sites: Optional[int] = None
    max_shifts_per_month: Optional[int] = None
    billing_email: Optional[str] = None
    is_active: Optional[bool] = None


class OrganizationResponse(OrganizationBase):
    """Schema for organization response."""
    org_id: int
    org_code: str
    subscription_status: SubscriptionStatus
    features_enabled: Optional[dict] = None
    created_at: str
    is_active: bool

    class Config:
        from_attributes = True


class UsageStats(BaseModel):
    """Organization usage statistics."""
    current_employees: int
    max_employees: Optional[int]
    current_sites: int
    max_sites: Optional[int]
    current_shifts_this_month: int
    max_shifts_per_month: Optional[int]
    employees_percentage: Optional[float] = None
    sites_percentage: Optional[float] = None
    shifts_percentage: Optional[float] = None


# Helper function to get current organization (will be replaced with proper auth later)
def get_current_org_id() -> int:
    """
    Get current organization ID from auth context.

    TODO: Replace with proper JWT token-based organization extraction.
    For now, returns the default organization ID.
    """
    return 1  # Default organization


@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_data: OrganizationCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new organization.

    **Requires**: Super Admin role (TODO: implement role checking)
    """
    # Check if org_code already exists
    existing_org = db.query(Organization).filter(
        Organization.org_code == org_data.org_code
    ).first()

    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Organization with code '{org_data.org_code}' already exists"
        )

    # Set default limits based on subscription tier
    tier_limits = {
        SubscriptionTier.STARTER: {"employees": 30, "sites": 5, "shifts": 500},
        SubscriptionTier.PROFESSIONAL: {"employees": 100, "sites": 15, "shifts": 2000},
        SubscriptionTier.BUSINESS: {"employees": 250, "sites": 50, "shifts": 5000},
        SubscriptionTier.ENTERPRISE: {"employees": None, "sites": None, "shifts": None},
    }

    limits = tier_limits.get(org_data.subscription_tier, {})

    # Create organization
    new_org = Organization(
        org_code=org_data.org_code,
        company_name=org_data.company_name,
        psira_company_registration=org_data.psira_company_registration,
        subscription_tier=org_data.subscription_tier,
        max_employees=org_data.max_employees or limits.get("employees"),
        max_sites=org_data.max_sites or limits.get("sites"),
        max_shifts_per_month=org_data.max_shifts_per_month or limits.get("shifts"),
        billing_email=org_data.billing_email
    )

    db.add(new_org)
    db.commit()
    db.refresh(new_org)

    return OrganizationResponse(
        org_id=new_org.org_id,
        org_code=new_org.org_code,
        company_name=new_org.company_name,
        psira_company_registration=new_org.psira_company_registration,
        subscription_tier=new_org.subscription_tier,
        subscription_status=new_org.subscription_status,
        max_employees=new_org.max_employees,
        max_sites=new_org.max_sites,
        max_shifts_per_month=new_org.max_shifts_per_month,
        features_enabled=new_org.features_enabled,
        billing_email=new_org.billing_email,
        created_at=new_org.created_at.isoformat() if new_org.created_at else None,
        is_active=new_org.is_active
    )


@router.get("/current", response_model=OrganizationResponse)
async def get_current_organization(
    db: Session = Depends(get_db)
):
    """
    Get current user's organization details.

    Returns organization info based on authenticated user's tenant_id.
    """
    org_id = get_current_org_id()

    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    return OrganizationResponse(
        org_id=org.org_id,
        org_code=org.org_code,
        company_name=org.company_name,
        psira_company_registration=org.psira_company_registration,
        subscription_tier=org.subscription_tier,
        subscription_status=org.subscription_status,
        max_employees=org.max_employees,
        max_sites=org.max_sites,
        max_shifts_per_month=org.max_shifts_per_month,
        features_enabled=org.features_enabled,
        billing_email=org.billing_email,
        created_at=org.created_at.isoformat() if org.created_at else None,
        is_active=org.is_active
    )


@router.put("/current", response_model=OrganizationResponse)
async def update_current_organization(
    org_update: OrganizationUpdate,
    db: Session = Depends(get_db)
):
    """
    Update current user's organization.

    **Requires**: Company Admin role or higher (TODO: implement role checking)
    """
    org_id = get_current_org_id()

    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Update fields that are provided
    update_data = org_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)

    db.commit()
    db.refresh(org)

    return OrganizationResponse(
        org_id=org.org_id,
        org_code=org.org_code,
        company_name=org.company_name,
        psira_company_registration=org.psira_company_registration,
        subscription_tier=org.subscription_tier,
        subscription_status=org.subscription_status,
        max_employees=org.max_employees,
        max_sites=org.max_sites,
        max_shifts_per_month=org.max_shifts_per_month,
        features_enabled=org.features_enabled,
        billing_email=org.billing_email,
        created_at=org.created_at.isoformat() if org.created_at else None,
        is_active=org.is_active
    )


@router.get("/current/usage", response_model=UsageStats)
async def get_organization_usage(
    db: Session = Depends(get_db)
):
    """
    Get current organization's usage statistics.

    Returns counts of employees, sites, and shifts compared to subscription limits.
    """
    from app.models.employee import Employee
    from app.models.site import Site
    from app.models.shift import Shift
    from sqlalchemy import func, extract
    from datetime import datetime

    org_id = get_current_org_id()

    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Count current resources
    current_employees = db.query(func.count(Employee.emp_id)).filter(
        Employee.tenant_id == org_id
    ).scalar() or 0

    current_sites = db.query(func.count(Site.site_id)).filter(
        Site.tenant_id == org_id
    ).scalar() or 0

    # Count shifts for current month
    current_month = datetime.now().month
    current_year = datetime.now().year

    current_shifts_this_month = db.query(func.count(Shift.shift_id)).filter(
        Shift.tenant_id == org_id,
        extract('month', Shift.start_time) == current_month,
        extract('year', Shift.start_time) == current_year
    ).scalar() or 0

    # Calculate percentages
    employees_percentage = None
    if org.max_employees:
        employees_percentage = round((current_employees / org.max_employees) * 100, 1)

    sites_percentage = None
    if org.max_sites:
        sites_percentage = round((current_sites / org.max_sites) * 100, 1)

    shifts_percentage = None
    if org.max_shifts_per_month:
        shifts_percentage = round((current_shifts_this_month / org.max_shifts_per_month) * 100, 1)

    return UsageStats(
        current_employees=current_employees,
        max_employees=org.max_employees,
        current_sites=current_sites,
        max_sites=org.max_sites,
        current_shifts_this_month=current_shifts_this_month,
        max_shifts_per_month=org.max_shifts_per_month,
        employees_percentage=employees_percentage,
        sites_percentage=sites_percentage,
        shifts_percentage=shifts_percentage
    )


@router.get("/", response_model=List[OrganizationResponse])
async def list_organizations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all organizations.

    **Requires**: Super Admin role (TODO: implement role checking)
    """
    organizations = db.query(Organization).offset(skip).limit(limit).all()

    return [
        OrganizationResponse(
            org_id=org.org_id,
            org_code=org.org_code,
            company_name=org.company_name,
            psira_company_registration=org.psira_company_registration,
            subscription_tier=org.subscription_tier,
            subscription_status=org.subscription_status,
            max_employees=org.max_employees,
            max_sites=org.max_sites,
            max_shifts_per_month=org.max_shifts_per_month,
            features_enabled=org.features_enabled,
            billing_email=org.billing_email,
            created_at=org.created_at.isoformat() if org.created_at else None,
            is_active=org.is_active
        )
        for org in organizations
    ]


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: int,
    db: Session = Depends(get_db)
):
    """
    Get organization by ID.

    **Requires**: Super Admin role (TODO: implement role checking)
    """
    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with ID {org_id} not found"
        )

    return OrganizationResponse(
        org_id=org.org_id,
        org_code=org.org_code,
        company_name=org.company_name,
        psira_company_registration=org.psira_company_registration,
        subscription_tier=org.subscription_tier,
        subscription_status=org.subscription_status,
        max_employees=org.max_employees,
        max_sites=org.max_sites,
        max_shifts_per_month=org.max_shifts_per_month,
        features_enabled=org.features_enabled,
        billing_email=org.billing_email,
        created_at=org.created_at.isoformat() if org.created_at else None,
        is_active=org.is_active
    )
