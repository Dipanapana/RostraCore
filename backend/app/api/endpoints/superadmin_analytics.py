"""SuperAdmin analytics and organization management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from decimal import Decimal

from app.database import get_db
from app.models.user import User, UserRole
from app.models.organization import Organization, SubscriptionStatus
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.client import Client
from app.models.site import Site
from app.api.endpoints.superadmin_auth import get_current_superadmin

router = APIRouter()


# === SCHEMAS ===

class DashboardMetrics(BaseModel):
    """Platform-wide dashboard metrics."""
    total_organizations: int
    active_subscriptions: int
    trial_subscriptions: int
    suspended_subscriptions: int
    cancelled_subscriptions: int
    pending_approvals: int
    total_guards: int
    active_guards: int
    total_sites: int
    total_shifts_this_month: int
    monthly_recurring_revenue: float
    new_organizations_this_month: int
    new_organizations_this_week: int


class SubscriptionMetrics(BaseModel):
    """Subscription breakdown metrics."""
    plan_name: str
    organization_count: int
    monthly_revenue: float
    annual_revenue: float


class OrganizationSummary(BaseModel):
    """Organization summary for list view."""
    org_id: int
    org_code: str
    company_name: str
    subscription_tier: str
    subscription_status: str
    approval_status: str
    guard_count: int
    site_count: int
    created_at: datetime
    trial_end_date: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True


class OrganizationDetail(BaseModel):
    """Detailed organization information."""
    org_id: int
    org_code: str
    company_name: str
    psira_company_registration: Optional[str]
    billing_email: str
    subscription_tier: str
    subscription_status: str
    approval_status: str
    approved_at: Optional[datetime]
    trial_start_date: Optional[datetime]
    trial_end_date: Optional[datetime]
    subscription_start_date: Optional[datetime]
    subscription_end_date: Optional[datetime]
    created_at: datetime
    is_active: bool

    # Counts
    user_count: int
    guard_count: int
    active_guard_count: int
    site_count: int
    client_count: int
    shifts_this_month: int

    # Financial
    monthly_subscription_cost: float
    total_payroll_this_month: float

    class Config:
        from_attributes = True


class OrganizationApproval(BaseModel):
    """Organization approval/rejection data."""
    approved: bool
    notes: Optional[str] = None


class RevenueMetrics(BaseModel):
    """Revenue metrics and projections."""
    current_mrr: float  # Monthly Recurring Revenue
    projected_arr: float  # Annual Recurring Revenue
    total_active_subscriptions: int
    total_trial_conversions_this_month: int
    average_subscription_value: float
    revenue_by_plan: List[SubscriptionMetrics]


# === DASHBOARD ENDPOINTS ===

@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    current_superadmin: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Get platform-wide analytics dashboard.

    Returns key metrics:
    - Total organizations and breakdown by subscription status
    - Guard counts (total and active)
    - Revenue metrics
    - Recent activity
    """

    # Organization counts by status
    total_orgs = db.query(Organization).count()
    active_subs = db.query(Organization).filter(
        Organization.subscription_status == SubscriptionStatus.ACTIVE.value
    ).count()
    trial_subs = db.query(Organization).filter(
        Organization.subscription_status == SubscriptionStatus.TRIAL.value
    ).count()
    suspended_subs = db.query(Organization).filter(
        Organization.subscription_status == SubscriptionStatus.SUSPENDED.value
    ).count()
    cancelled_subs = db.query(Organization).filter(
        Organization.subscription_status == SubscriptionStatus.CANCELLED.value
    ).count()

    # Pending approvals
    pending_approvals = db.query(Organization).filter(
        Organization.approval_status == "pending"
    ).count()

    # Guard counts
    total_guards = db.query(Employee).count()
    active_guards = db.query(Employee).filter(
        Employee.status == "active"
    ).count()

    # Site count
    total_sites = db.query(Site).count()

    # Shifts this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    shifts_this_month = db.query(Shift).filter(
        Shift.start_time >= start_of_month
    ).count()

    # Calculate MRR (Monthly Recurring Revenue)
    from app.models.subscription_plan import SubscriptionPlan

    # Get all active organizations with their subscription plans
    active_orgs = db.query(Organization).filter(
        Organization.subscription_status == SubscriptionStatus.ACTIVE.value
    ).all()

    mrr = 0.0
    for org in active_orgs:
        if org.subscription_plan_id:
            plan = db.query(SubscriptionPlan).filter(
                SubscriptionPlan.plan_id == org.subscription_plan_id
            ).first()
            if plan:
                mrr += float(plan.monthly_price)

    # New organizations this month
    new_orgs_month = db.query(Organization).filter(
        Organization.created_at >= start_of_month
    ).count()

    # New organizations this week
    start_of_week = datetime.utcnow() - timedelta(days=7)
    new_orgs_week = db.query(Organization).filter(
        Organization.created_at >= start_of_week
    ).count()

    return DashboardMetrics(
        total_organizations=total_orgs,
        active_subscriptions=active_subs,
        trial_subscriptions=trial_subs,
        suspended_subscriptions=suspended_subs,
        cancelled_subscriptions=cancelled_subs,
        pending_approvals=pending_approvals,
        total_guards=total_guards,
        active_guards=active_guards,
        total_sites=total_sites,
        total_shifts_this_month=shifts_this_month,
        monthly_recurring_revenue=mrr,
        new_organizations_this_month=new_orgs_month,
        new_organizations_this_week=new_orgs_week
    )


@router.get("/revenue", response_model=RevenueMetrics)
async def get_revenue_metrics(
    current_superadmin: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Get detailed revenue metrics and projections.

    Includes:
    - Current MRR and projected ARR
    - Revenue breakdown by subscription plan
    - Conversion metrics
    """
    from app.models.subscription_plan import SubscriptionPlan

    # Get all active organizations with their plans
    active_orgs = db.query(Organization).filter(
        Organization.subscription_status == SubscriptionStatus.ACTIVE.value
    ).all()

    mrr = 0.0
    plan_revenue = {}

    for org in active_orgs:
        if org.subscription_plan_id:
            plan = db.query(SubscriptionPlan).filter(
                SubscriptionPlan.plan_id == org.subscription_plan_id
            ).first()
            if plan:
                monthly_price = float(plan.monthly_price)
                mrr += monthly_price

                # Track revenue by plan
                if plan.plan_name not in plan_revenue:
                    plan_revenue[plan.plan_name] = {
                        "count": 0,
                        "monthly": 0.0,
                        "annual": 0.0
                    }
                plan_revenue[plan.plan_name]["count"] += 1
                plan_revenue[plan.plan_name]["monthly"] += monthly_price
                plan_revenue[plan.plan_name]["annual"] += float(plan.annual_price)

    # Project ARR (Annual Recurring Revenue)
    arr = mrr * 12

    # Trial conversions this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    trial_conversions = db.query(Organization).filter(
        and_(
            Organization.subscription_status == SubscriptionStatus.ACTIVE.value,
            Organization.subscription_start_date >= start_of_month
        )
    ).count()

    # Average subscription value
    avg_sub_value = mrr / len(active_orgs) if active_orgs else 0.0

    # Build revenue by plan list
    revenue_by_plan = [
        SubscriptionMetrics(
            plan_name=plan_name,
            organization_count=data["count"],
            monthly_revenue=data["monthly"],
            annual_revenue=data["annual"]
        )
        for plan_name, data in plan_revenue.items()
    ]

    return RevenueMetrics(
        current_mrr=mrr,
        projected_arr=arr,
        total_active_subscriptions=len(active_orgs),
        total_trial_conversions_this_month=trial_conversions,
        average_subscription_value=avg_sub_value,
        revenue_by_plan=revenue_by_plan
    )


# === ORGANIZATION MANAGEMENT ENDPOINTS ===

@router.get("/organizations", response_model=List[OrganizationSummary])
async def list_all_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by subscription status"),
    approval_status: Optional[str] = Query(None, description="Filter by approval status"),
    search: Optional[str] = Query(None, description="Search by company name or org code"),
    current_superadmin: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    List all organizations with filtering and pagination.

    Filters:
    - status: active, trial, suspended, cancelled
    - approval_status: pending, approved, rejected
    - search: Search company name or org code
    """

    query = db.query(Organization)

    # Apply filters
    if status:
        query = query.filter(Organization.subscription_status == status)

    if approval_status:
        query = query.filter(Organization.approval_status == approval_status)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Organization.company_name.ilike(search_term),
                Organization.org_code.ilike(search_term)
            )
        )

    # Order by most recent first
    query = query.order_by(Organization.created_at.desc())

    # Pagination
    offset = (page - 1) * page_size
    orgs = query.offset(offset).limit(page_size).all()

    # Build response with counts
    org_summaries = []
    for org in orgs:
        guard_count = db.query(Employee).filter(Employee.org_id == org.org_id).count()
        site_count = db.query(Site).filter(Site.org_id == org.org_id).count()

        org_summaries.append(OrganizationSummary(
            org_id=org.org_id,
            org_code=org.org_code,
            company_name=org.company_name,
            subscription_tier=org.subscription_tier,
            subscription_status=org.subscription_status,
            approval_status=org.approval_status,
            guard_count=guard_count,
            site_count=site_count,
            created_at=org.created_at,
            trial_end_date=org.trial_end_date,
            is_active=org.is_active
        ))

    return org_summaries


@router.get("/organizations/{org_id}", response_model=OrganizationDetail)
async def get_organization_details(
    org_id: int,
    current_superadmin: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Get detailed organization information.

    Includes:
    - Organization details
    - User, guard, site, client counts
    - Subscription and financial information
    - Activity metrics
    """

    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Calculate counts
    user_count = db.query(User).filter(User.org_id == org_id).count()
    guard_count = db.query(Employee).filter(Employee.org_id == org_id).count()
    active_guard_count = db.query(Employee).filter(
        and_(Employee.org_id == org_id, Employee.status == "active")
    ).count()
    site_count = db.query(Site).filter(Site.org_id == org_id).count()
    client_count = db.query(Client).filter(Client.org_id == org_id).count()

    # Shifts this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    shifts_this_month = db.query(Shift).filter(
        and_(Shift.org_id == org_id, Shift.start_time >= start_of_month)
    ).count()

    # Financial data
    monthly_cost = 0.0
    if org.subscription_plan_id:
        from app.models.subscription_plan import SubscriptionPlan
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.plan_id == org.subscription_plan_id
        ).first()
        if plan:
            monthly_cost = float(plan.monthly_price)

    # Calculate payroll this month (from shift assignments)
    from app.models.shift_assignment import ShiftAssignment
    payroll = db.query(func.sum(ShiftAssignment.cost)).filter(
        and_(
            ShiftAssignment.org_id == org_id,
            ShiftAssignment.created_at >= start_of_month
        )
    ).scalar() or 0.0

    return OrganizationDetail(
        org_id=org.org_id,
        org_code=org.org_code,
        company_name=org.company_name,
        psira_company_registration=org.psira_company_registration,
        billing_email=org.billing_email,
        subscription_tier=org.subscription_tier,
        subscription_status=org.subscription_status,
        approval_status=org.approval_status,
        approved_at=org.approved_at,
        trial_start_date=org.trial_start_date,
        trial_end_date=org.trial_end_date,
        subscription_start_date=org.subscription_start_date,
        subscription_end_date=org.subscription_end_date,
        created_at=org.created_at,
        is_active=org.is_active,
        user_count=user_count,
        guard_count=guard_count,
        active_guard_count=active_guard_count,
        site_count=site_count,
        client_count=client_count,
        shifts_this_month=shifts_this_month,
        monthly_subscription_cost=monthly_cost,
        total_payroll_this_month=float(payroll)
    )


@router.put("/organizations/{org_id}/approve")
async def approve_organization(
    org_id: int,
    approval_data: OrganizationApproval,
    current_superadmin: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Approve or reject an organization registration.

    If approved:
    - Sets approval_status to 'approved'
    - Sets approved_at timestamp
    - Activates organization

    If rejected:
    - Sets approval_status to 'rejected'
    - Deactivates organization
    """

    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    if approval_data.approved:
        org.approval_status = "approved"
        org.approved_at = datetime.utcnow()
        org.is_active = True
        message = f"Organization '{org.company_name}' approved successfully"
    else:
        org.approval_status = "rejected"
        org.is_active = False
        message = f"Organization '{org.company_name}' rejected"

    db.commit()

    return {
        "message": message,
        "org_id": org.org_id,
        "company_name": org.company_name,
        "approval_status": org.approval_status,
        "notes": approval_data.notes
    }


@router.put("/organizations/{org_id}/suspend")
async def suspend_organization(
    org_id: int,
    current_superadmin: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Suspend an organization.

    Sets subscription_status to 'suspended' and deactivates the organization.
    Users will not be able to login while suspended.
    """

    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    org.subscription_status = SubscriptionStatus.SUSPENDED.value
    org.is_active = False
    db.commit()

    return {
        "message": f"Organization '{org.company_name}' suspended successfully",
        "org_id": org.org_id,
        "subscription_status": org.subscription_status
    }


@router.put("/organizations/{org_id}/activate")
async def activate_organization(
    org_id: int,
    current_superadmin: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Activate a suspended organization.

    Sets subscription_status back to 'active' and reactivates the organization.
    """

    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    if org.approval_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot activate organization that is not approved"
        )

    org.subscription_status = SubscriptionStatus.ACTIVE.value
    org.is_active = True
    db.commit()

    return {
        "message": f"Organization '{org.company_name}' activated successfully",
        "org_id": org.org_id,
        "subscription_status": org.subscription_status
    }


@router.delete("/organizations/{org_id}")
async def delete_organization(
    org_id: int,
    confirm: bool = Query(False, description="Must be true to confirm deletion"),
    current_superadmin: User = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """
    Delete an organization and all its associated data.

    WARNING: This is a destructive operation that will delete:
    - All users
    - All employees (guards)
    - All clients
    - All sites
    - All shifts and assignments
    - All rosters
    - All certifications and availability records

    Requires confirm=true query parameter.
    """

    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must set confirm=true to delete organization"
        )

    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    company_name = org.company_name

    # Delete organization (cascading deletes will handle related records)
    db.delete(org)
    db.commit()

    return {
        "message": f"Organization '{company_name}' and all associated data deleted successfully",
        "org_id": org_id
    }
