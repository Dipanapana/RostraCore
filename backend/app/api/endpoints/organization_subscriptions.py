"""Organization subscription management endpoints - Superadmin manages org subscriptions."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from app.database import get_db
from app.models.organization import Organization
from app.models.subscription_plan import SubscriptionPlan
from app.models.superadmin_user import SuperadminUser
from app.api.endpoints.superadmin_auth import get_current_superadmin

router = APIRouter()


# === SCHEMAS ===

class SubscriptionAssign(BaseModel):
    organization_id: int
    plan_id: int
    billing_cycle: str = Field(..., pattern="^(monthly|annual)$")
    trial_days: int = Field(default=14, ge=0, le=90)


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[int] = None
    billing_cycle: Optional[str] = Field(None, pattern="^(monthly|annual)$")
    subscription_status: Optional[str] = Field(None, pattern="^(trial|active|suspended|cancelled)$")


class OrganizationSubscriptionResponse(BaseModel):
    organization_id: int
    organization_name: str
    subscription_plan_id: Optional[int]
    plan_name: Optional[str]
    plan_display_name: Optional[str]
    subscription_status: Optional[str]
    subscription_start_date: Optional[datetime]
    subscription_end_date: Optional[datetime]
    billing_cycle: Optional[str]
    trial_end_date: Optional[datetime]
    is_trial: bool
    days_remaining: Optional[int]

    class Config:
        from_attributes = True


class SubscriptionSummary(BaseModel):
    total_organizations: int
    active_subscriptions: int
    trial_subscriptions: int
    suspended_subscriptions: int
    cancelled_subscriptions: int
    total_mrr: float  # Monthly Recurring Revenue
    total_arr: float  # Annual Recurring Revenue


# === HELPER FUNCTIONS ===

def check_superadmin_permission(superadmin: SuperadminUser, permission: str):
    """Check if superadmin has required permission."""
    if not superadmin.has_permission(permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {permission} required"
        )


def calculate_days_remaining(end_date: Optional[datetime]) -> Optional[int]:
    """Calculate days remaining in subscription."""
    if not end_date:
        return None
    delta = end_date - datetime.utcnow()
    return max(0, delta.days)


# === SUBSCRIPTION MANAGEMENT ENDPOINTS ===

@router.get("/subscriptions", response_model=List[OrganizationSubscriptionResponse])
async def list_organization_subscriptions(
    status_filter: Optional[str] = None,
    plan_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_superadmin: SuperadminUser = Depends(get_current_superadmin)
):
    """
    List all organization subscriptions.

    Superadmin only. View all organizations and their subscription status.
    """
    check_superadmin_permission(current_superadmin, "view_analytics")

    query = db.query(Organization)

    if status_filter:
        query = query.filter(Organization.subscription_status == status_filter)

    if plan_id:
        query = query.filter(Organization.subscription_plan_id == plan_id)

    query = query.order_by(Organization.created_at.desc())
    organizations = query.offset(skip).limit(limit).all()

    result = []
    for org in organizations:
        plan = None
        if org.subscription_plan_id:
            plan = db.query(SubscriptionPlan).filter(
                SubscriptionPlan.plan_id == org.subscription_plan_id
            ).first()

        is_trial = org.subscription_status == 'trial'
        days_remaining = None

        if is_trial and org.trial_end_date:
            days_remaining = calculate_days_remaining(org.trial_end_date)
        elif org.subscription_end_date:
            days_remaining = calculate_days_remaining(org.subscription_end_date)

        result.append(OrganizationSubscriptionResponse(
            organization_id=org.id,
            organization_name=org.name,
            subscription_plan_id=org.subscription_plan_id,
            plan_name=plan.plan_name if plan else None,
            plan_display_name=plan.display_name if plan else None,
            subscription_status=org.subscription_status,
            subscription_start_date=org.subscription_start_date,
            subscription_end_date=org.subscription_end_date,
            billing_cycle=org.billing_cycle,
            trial_end_date=org.trial_end_date,
            is_trial=is_trial,
            days_remaining=days_remaining
        ))

    return result


@router.post("/subscriptions/assign", response_model=OrganizationSubscriptionResponse)
async def assign_subscription_to_organization(
    subscription_data: SubscriptionAssign,
    db: Session = Depends(get_db),
    current_superadmin: SuperadminUser = Depends(get_current_superadmin)
):
    """
    Assign a subscription plan to an organization.

    Superadmin only. Can set trial period.
    """
    check_superadmin_permission(current_superadmin, "manage_orgs")

    # Check organization exists
    organization = db.query(Organization).filter(
        Organization.id == subscription_data.organization_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Check plan exists
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.plan_id == subscription_data.plan_id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )

    if not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign inactive plan to organization"
        )

    # Calculate subscription dates
    now = datetime.utcnow()
    trial_end = now + timedelta(days=subscription_data.trial_days) if subscription_data.trial_days > 0 else None

    if subscription_data.billing_cycle == "monthly":
        subscription_end = now + timedelta(days=30)
    else:  # annual
        subscription_end = now + timedelta(days=365)

    # Update organization subscription
    organization.subscription_plan_id = subscription_data.plan_id
    organization.subscription_status = 'trial' if trial_end else 'active'
    organization.subscription_start_date = now
    organization.subscription_end_date = subscription_end
    organization.billing_cycle = subscription_data.billing_cycle
    organization.trial_end_date = trial_end

    db.commit()
    db.refresh(organization)

    is_trial = organization.subscription_status == 'trial'
    days_remaining = None

    if is_trial and organization.trial_end_date:
        days_remaining = calculate_days_remaining(organization.trial_end_date)
    elif organization.subscription_end_date:
        days_remaining = calculate_days_remaining(organization.subscription_end_date)

    return OrganizationSubscriptionResponse(
        organization_id=organization.id,
        organization_name=organization.name,
        subscription_plan_id=organization.subscription_plan_id,
        plan_name=plan.plan_name,
        plan_display_name=plan.display_name,
        subscription_status=organization.subscription_status,
        subscription_start_date=organization.subscription_start_date,
        subscription_end_date=organization.subscription_end_date,
        billing_cycle=organization.billing_cycle,
        trial_end_date=organization.trial_end_date,
        is_trial=is_trial,
        days_remaining=days_remaining
    )


@router.put("/subscriptions/{organization_id}", response_model=OrganizationSubscriptionResponse)
async def update_organization_subscription(
    organization_id: int,
    subscription_data: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_superadmin: SuperadminUser = Depends(get_current_superadmin)
):
    """
    Update an organization's subscription.

    Superadmin only. Can change plan, billing cycle, or status.
    """
    check_superadmin_permission(current_superadmin, "manage_orgs")

    organization = db.query(Organization).filter(
        Organization.id == organization_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Update plan if provided
    if subscription_data.plan_id is not None:
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.plan_id == subscription_data.plan_id
        ).first()

        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found"
            )

        organization.subscription_plan_id = subscription_data.plan_id

    # Update billing cycle if provided
    if subscription_data.billing_cycle:
        organization.billing_cycle = subscription_data.billing_cycle

    # Update status if provided
    if subscription_data.subscription_status:
        organization.subscription_status = subscription_data.subscription_status

    db.commit()
    db.refresh(organization)

    plan = None
    if organization.subscription_plan_id:
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.plan_id == organization.subscription_plan_id
        ).first()

    is_trial = organization.subscription_status == 'trial'
    days_remaining = None

    if is_trial and organization.trial_end_date:
        days_remaining = calculate_days_remaining(organization.trial_end_date)
    elif organization.subscription_end_date:
        days_remaining = calculate_days_remaining(organization.subscription_end_date)

    return OrganizationSubscriptionResponse(
        organization_id=organization.id,
        organization_name=organization.name,
        subscription_plan_id=organization.subscription_plan_id,
        plan_name=plan.plan_name if plan else None,
        plan_display_name=plan.display_name if plan else None,
        subscription_status=organization.subscription_status,
        subscription_start_date=organization.subscription_start_date,
        subscription_end_date=organization.subscription_end_date,
        billing_cycle=organization.billing_cycle,
        trial_end_date=organization.trial_end_date,
        is_trial=is_trial,
        days_remaining=days_remaining
    )


@router.post("/subscriptions/{organization_id}/suspend")
async def suspend_organization_subscription(
    organization_id: int,
    db: Session = Depends(get_db),
    current_superadmin: SuperadminUser = Depends(get_current_superadmin)
):
    """Suspend an organization's subscription."""
    check_superadmin_permission(current_superadmin, "manage_orgs")

    organization = db.query(Organization).filter(
        Organization.id == organization_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    organization.subscription_status = 'suspended'
    db.commit()

    return {
        "message": "Organization subscription suspended",
        "organization_name": organization.name,
        "subscription_status": organization.subscription_status
    }


@router.post("/subscriptions/{organization_id}/activate")
async def activate_organization_subscription(
    organization_id: int,
    db: Session = Depends(get_db),
    current_superadmin: SuperadminUser = Depends(get_current_superadmin)
):
    """Activate a suspended organization's subscription."""
    check_superadmin_permission(current_superadmin, "manage_orgs")

    organization = db.query(Organization).filter(
        Organization.id == organization_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    organization.subscription_status = 'active'
    db.commit()

    return {
        "message": "Organization subscription activated",
        "organization_name": organization.name,
        "subscription_status": organization.subscription_status
    }


@router.get("/subscriptions/summary", response_model=SubscriptionSummary)
async def get_subscription_summary(
    db: Session = Depends(get_db),
    current_superadmin: SuperadminUser = Depends(get_current_superadmin)
):
    """
    Get subscription summary statistics.

    Superadmin only. Platform-wide subscription metrics.
    """
    check_superadmin_permission(current_superadmin, "view_analytics")

    total_orgs = db.query(Organization).count()

    active_subs = db.query(Organization).filter(
        Organization.subscription_status == 'active'
    ).count()

    trial_subs = db.query(Organization).filter(
        Organization.subscription_status == 'trial'
    ).count()

    suspended_subs = db.query(Organization).filter(
        Organization.subscription_status == 'suspended'
    ).count()

    cancelled_subs = db.query(Organization).filter(
        Organization.subscription_status == 'cancelled'
    ).count()

    # Calculate MRR and ARR
    mrr = 0.0
    arr = 0.0

    active_orgs = db.query(Organization).filter(
        Organization.subscription_status.in_(['active', 'trial'])
    ).all()

    for org in active_orgs:
        if org.subscription_plan_id:
            plan = db.query(SubscriptionPlan).filter(
                SubscriptionPlan.plan_id == org.subscription_plan_id
            ).first()

            if plan:
                if org.billing_cycle == 'monthly':
                    mrr += float(plan.monthly_price)
                    arr += float(plan.monthly_price) * 12
                else:  # annual
                    mrr += float(plan.annual_price) / 12
                    arr += float(plan.annual_price)

    return SubscriptionSummary(
        total_organizations=total_orgs,
        active_subscriptions=active_subs,
        trial_subscriptions=trial_subs,
        suspended_subscriptions=suspended_subs,
        cancelled_subscriptions=cancelled_subs,
        total_mrr=round(mrr, 2),
        total_arr=round(arr, 2)
    )
