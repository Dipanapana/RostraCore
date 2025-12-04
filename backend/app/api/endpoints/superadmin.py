"""Superadmin endpoints for managing all organizations.

These endpoints are only accessible to users with role=SUPERADMIN.
They allow viewing and managing all organizations, subscriptions, and system stats.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract, and_, or_, distinct
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from pydantic import BaseModel
from app.database import get_db
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.models.employee import Employee
from app.models.client import Client
from app.models.site import Site
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment
from app.models.availability import Availability
from app.models.certification import Certification
from app.auth.security import get_current_user
from app.services.payfast_service import payfast_service
from app.config import settings
import logging
from collections import defaultdict

router = APIRouter()
logger = logging.getLogger(__name__)


def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require superadmin role."""
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required"
        )
    return current_user


# ==================== Response Schemas ====================

class OrganizationSummary(BaseModel):
    """Summary of an organization for superadmin view."""
    org_id: int
    org_code: str
    company_name: str
    subscription_status: str
    subscription_tier: str
    is_active: bool

    # Counts
    employee_count: int
    active_employee_count: int
    client_count: int
    site_count: int
    user_count: int

    # Trial info
    trial_end_date: Optional[datetime] = None
    trial_days_remaining: Optional[int] = None

    # Billing
    monthly_rate_per_guard: float
    estimated_monthly_cost: float
    payfast_active: bool

    # Timestamps
    created_at: datetime

    class Config:
        from_attributes = True


class SystemStats(BaseModel):
    """System-wide statistics."""
    total_organizations: int
    active_organizations: int
    trial_organizations: int
    paying_organizations: int
    suspended_organizations: int

    total_users: int
    total_employees: int
    total_clients: int
    total_sites: int
    total_shifts: int

    # Revenue
    total_monthly_revenue: float
    average_guards_per_org: float


class OrganizationDetail(BaseModel):
    """Detailed organization info for superadmin."""
    org_id: int
    org_code: str
    company_name: str
    psira_company_registration: Optional[str] = None

    subscription_status: str
    subscription_tier: str
    is_active: bool

    # Approval
    approval_status: str
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    # Trial
    trial_start_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None
    trial_days_remaining: Optional[int] = None

    # Billing
    billing_email: Optional[str] = None
    active_guard_count: int
    monthly_rate_per_guard: float
    current_month_cost: float

    # PayFast
    payfast_subscription_token: Optional[str] = None
    payfast_subscription_status: Optional[str] = None
    subscription_started_at: Optional[datetime] = None
    subscription_next_billing_date: Optional[datetime] = None
    payment_failures: int

    # Limits
    max_employees: Optional[int] = None
    max_sites: Optional[int] = None

    # Counts
    employee_count: int
    client_count: int
    site_count: int
    user_count: int

    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Endpoints ====================

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Get system-wide statistics."""

    # Organization counts
    total_orgs = db.query(func.count(Organization.org_id)).scalar() or 0
    active_orgs = db.query(func.count(Organization.org_id)).filter(
        Organization.is_active == True
    ).scalar() or 0
    trial_orgs = db.query(func.count(Organization.org_id)).filter(
        Organization.subscription_status == "trial"
    ).scalar() or 0
    paying_orgs = db.query(func.count(Organization.org_id)).filter(
        Organization.subscription_status == "active"
    ).scalar() or 0
    suspended_orgs = db.query(func.count(Organization.org_id)).filter(
        Organization.subscription_status == "suspended"
    ).scalar() or 0

    # Entity counts
    total_users = db.query(func.count(User.user_id)).scalar() or 0
    total_employees = db.query(func.count(Employee.employee_id)).scalar() or 0
    total_clients = db.query(func.count(Client.client_id)).scalar() or 0
    total_sites = db.query(func.count(Site.site_id)).scalar() or 0
    total_shifts = db.query(func.count(Shift.shift_id)).scalar() or 0

    # Revenue calculation (only from paying orgs)
    total_revenue = db.query(func.sum(Organization.current_month_cost)).filter(
        Organization.subscription_status == "active"
    ).scalar() or 0

    avg_guards = total_employees / total_orgs if total_orgs > 0 else 0

    return SystemStats(
        total_organizations=total_orgs,
        active_organizations=active_orgs,
        trial_organizations=trial_orgs,
        paying_organizations=paying_orgs,
        suspended_organizations=suspended_orgs,
        total_users=total_users,
        total_employees=total_employees,
        total_clients=total_clients,
        total_sites=total_sites,
        total_shifts=total_shifts,
        total_monthly_revenue=float(total_revenue),
        average_guards_per_org=round(avg_guards, 1)
    )


@router.get("/organizations", response_model=List[OrganizationSummary])
async def list_organizations(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """List all organizations with summary stats."""

    query = db.query(Organization)

    if status:
        query = query.filter(Organization.subscription_status == status)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Organization.company_name.ilike(search_term)) |
            (Organization.org_code.ilike(search_term))
        )

    organizations = query.order_by(Organization.created_at.desc()).all()

    result = []
    for org in organizations:
        # Get counts
        employee_count = db.query(func.count(Employee.employee_id)).filter(
            Employee.org_id == org.org_id
        ).scalar() or 0

        active_employee_count = db.query(func.count(Employee.employee_id)).filter(
            Employee.org_id == org.org_id,
            Employee.status == 'ACTIVE'
        ).scalar() or 0

        client_count = db.query(func.count(Client.client_id)).filter(
            Client.org_id == org.org_id
        ).scalar() or 0

        site_count = db.query(func.count(Site.site_id)).filter(
            Site.org_id == org.org_id
        ).scalar() or 0

        user_count = db.query(func.count(User.user_id)).filter(
            User.org_id == org.org_id
        ).scalar() or 0

        # Trial days remaining
        trial_days = None
        if org.subscription_status == "trial" and org.trial_end_date:
            trial_days = payfast_service.days_until_trial_expires(org.trial_end_date)

        monthly_rate = float(org.monthly_rate_per_guard or settings.MVP_MONTHLY_RATE_PER_GUARD)
        estimated_cost = active_employee_count * monthly_rate

        result.append(OrganizationSummary(
            org_id=org.org_id,
            org_code=org.org_code,
            company_name=org.company_name,
            subscription_status=org.subscription_status,
            subscription_tier=org.subscription_tier,
            is_active=org.is_active,
            employee_count=employee_count,
            active_employee_count=active_employee_count,
            client_count=client_count,
            site_count=site_count,
            user_count=user_count,
            trial_end_date=org.trial_end_date,
            trial_days_remaining=trial_days if trial_days and trial_days > 0 else None,
            monthly_rate_per_guard=monthly_rate,
            estimated_monthly_cost=estimated_cost,
            payfast_active=bool(org.payfast_subscription_token),
            created_at=org.created_at
        ))

    return result


@router.get("/organizations/{org_id}", response_model=OrganizationDetail)
async def get_organization(
    org_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Get detailed organization info."""

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get counts
    employee_count = db.query(func.count(Employee.employee_id)).filter(
        Employee.org_id == org.org_id
    ).scalar() or 0

    client_count = db.query(func.count(Client.client_id)).filter(
        Client.org_id == org.org_id
    ).scalar() or 0

    site_count = db.query(func.count(Site.site_id)).filter(
        Site.org_id == org.org_id
    ).scalar() or 0

    user_count = db.query(func.count(User.user_id)).filter(
        User.org_id == org.org_id
    ).scalar() or 0

    # Trial days
    trial_days = None
    if org.subscription_status == "trial" and org.trial_end_date:
        trial_days = payfast_service.days_until_trial_expires(org.trial_end_date)

    return OrganizationDetail(
        org_id=org.org_id,
        org_code=org.org_code,
        company_name=org.company_name,
        psira_company_registration=org.psira_company_registration,
        subscription_status=org.subscription_status,
        subscription_tier=org.subscription_tier,
        is_active=org.is_active,
        approval_status=org.approval_status,
        approved_by=org.approved_by,
        approved_at=org.approved_at,
        rejection_reason=org.rejection_reason,
        trial_start_date=org.trial_start_date,
        trial_end_date=org.trial_end_date,
        trial_days_remaining=trial_days,
        billing_email=org.billing_email,
        active_guard_count=org.active_guard_count or 0,
        monthly_rate_per_guard=float(org.monthly_rate_per_guard or settings.MVP_MONTHLY_RATE_PER_GUARD),
        current_month_cost=float(org.current_month_cost or 0),
        payfast_subscription_token=org.payfast_subscription_token,
        payfast_subscription_status=org.payfast_subscription_status,
        subscription_started_at=org.subscription_started_at,
        subscription_next_billing_date=org.subscription_next_billing_date,
        payment_failures=org.payment_failures or 0,
        max_employees=org.max_employees,
        max_sites=org.max_sites,
        employee_count=employee_count,
        client_count=client_count,
        site_count=site_count,
        user_count=user_count,
        created_at=org.created_at
    )


@router.post("/organizations/{org_id}/approve")
async def approve_organization(
    org_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Approve a pending organization."""

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.approval_status = "approved"
    org.approved_by = current_user.user_id
    org.approved_at = datetime.utcnow()
    org.is_active = True

    db.commit()

    logger.info(f"Organization {org_id} approved by superadmin {current_user.user_id}")

    return {"status": "success", "message": f"{org.company_name} has been approved"}


@router.post("/organizations/{org_id}/suspend")
async def suspend_organization(
    org_id: int,
    reason: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Suspend an organization."""

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.subscription_status = "suspended"
    org.rejection_reason = reason

    db.commit()

    logger.info(f"Organization {org_id} suspended by superadmin {current_user.user_id}: {reason}")

    return {"status": "success", "message": f"{org.company_name} has been suspended"}


@router.post("/organizations/{org_id}/activate")
async def activate_organization(
    org_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Reactivate a suspended organization."""

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.subscription_status = "active"
    org.is_active = True
    org.rejection_reason = None

    db.commit()

    logger.info(f"Organization {org_id} activated by superadmin {current_user.user_id}")

    return {"status": "success", "message": f"{org.company_name} has been activated"}


@router.post("/organizations/{org_id}/extend-trial")
async def extend_org_trial(
    org_id: int,
    days: int = 30,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Extend trial period for an organization."""

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Extend from current end date or now
    base_date = org.trial_end_date or datetime.utcnow()
    org.trial_end_date = base_date + timedelta(days=days)
    org.subscription_status = "trial"

    db.commit()

    logger.info(f"Trial extended for org {org_id} by {days} days (by superadmin {current_user.user_id})")

    return {
        "status": "success",
        "message": f"Trial extended by {days} days for {org.company_name}",
        "new_trial_end_date": org.trial_end_date
    }


@router.put("/organizations/{org_id}/tier")
async def update_organization_tier(
    org_id: int,
    tier: str,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Update organization subscription tier."""

    valid_tiers = ["starter", "professional", "business", "enterprise"]
    if tier not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Must be one of: {valid_tiers}")

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    old_tier = org.subscription_tier
    org.subscription_tier = tier

    # Update limits based on tier
    tier_limits = Organization.get_tier_limits(tier)
    org.max_employees = tier_limits.get("max_employees")
    org.max_sites = tier_limits.get("max_sites")
    org.max_shifts_per_month = tier_limits.get("max_shifts_per_month")
    org.features_enabled = tier_limits.get("features")

    db.commit()

    logger.info(f"Organization {org_id} tier changed from {old_tier} to {tier} by superadmin {current_user.user_id}")

    return {
        "status": "success",
        "message": f"{org.company_name} upgraded to {tier}",
        "new_limits": tier_limits
    }
