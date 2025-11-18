"""Subscription plan management endpoints - Superadmin only."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from decimal import Decimal
from app.database import get_db
from app.models.subscription_plan import SubscriptionPlan
from app.models.user import User
from app.api.endpoints.superadmin_auth import get_current_superadmin

router = APIRouter()


# === SCHEMAS ===

class PlanCreate(BaseModel):
    plan_name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    monthly_price: float = Field(gt=0)
    annual_price: float = Field(gt=0)
    currency: str = Field(default="ZAR", max_length=10)
    max_employees: Optional[int] = Field(default=None, ge=1)
    max_sites: Optional[int] = Field(default=None, ge=1)
    max_clients: Optional[int] = Field(default=None, ge=1)
    max_supervisors: Optional[int] = Field(default=None, ge=1)
    features: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = Field(default=True)
    sort_order: int = Field(default=0)


class PlanUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    monthly_price: Optional[float] = Field(None, gt=0)
    annual_price: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=10)
    max_employees: Optional[int] = Field(None, ge=1)
    max_sites: Optional[int] = Field(None, ge=1)
    max_clients: Optional[int] = Field(None, ge=1)
    max_supervisors: Optional[int] = Field(None, ge=1)
    features: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class PlanResponse(BaseModel):
    plan_id: int
    plan_name: str
    display_name: str
    description: Optional[str]
    monthly_price: float
    annual_price: float
    currency: str
    max_employees: Optional[int]
    max_sites: Optional[int]
    max_clients: Optional[int]
    max_supervisors: Optional[int]
    features: Dict[str, Any]
    is_active: bool
    sort_order: int
    annual_savings: float
    annual_discount_percent: float
    organization_count: int = 0

    class Config:
        from_attributes = True


# === HELPER FUNCTIONS ===

def check_superadmin_permission(superadmin: User, permission: str):
    """Check if superadmin has required permission."""
    if not superadmin.has_permission(permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {permission} required"
        )


# === PLAN MANAGEMENT ENDPOINTS ===

@router.get("/plans", response_model=List[PlanResponse])
async def list_subscription_plans(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_superadmin: User = Depends(get_current_superadmin)
):
    """
    List all subscription plans.

    Superadmin only.
    """

    query = db.query(SubscriptionPlan)

    if not include_inactive:
        query = query.filter(SubscriptionPlan.is_active == True)

    query = query.order_by(SubscriptionPlan.sort_order.asc())

    plans = query.all()

    # Add organization count for each plan
    from app.models.organization import Organization
    plans_with_counts = []
    for plan in plans:
        org_count = db.query(Organization).filter(
            Organization.subscription_plan_id == plan.plan_id
        ).count()

        plan_dict = {
            "plan_id": plan.plan_id,
            "plan_name": plan.plan_name,
            "display_name": plan.display_name,
            "description": plan.description,
            "monthly_price": float(plan.monthly_price),
            "annual_price": float(plan.annual_price),
            "currency": plan.currency,
            "max_employees": plan.max_employees,
            "max_sites": plan.max_sites,
            "max_clients": plan.max_clients,
            "max_supervisors": plan.max_supervisors,
            "features": plan.features or {},
            "is_active": plan.is_active,
            "sort_order": plan.sort_order,
            "annual_savings": plan.annual_savings,
            "annual_discount_percent": plan.annual_discount_percent,
            "organization_count": org_count
        }
        plans_with_counts.append(PlanResponse(**plan_dict))

    return plans_with_counts


@router.get("/plans/{plan_id}", response_model=PlanResponse)
async def get_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_superadmin: User = Depends(get_current_superadmin)
):
    """Get a specific subscription plan by ID. Superadmin only."""

    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.plan_id == plan_id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )

    # Add organization count
    from app.models.organization import Organization
    org_count = db.query(Organization).filter(
        Organization.subscription_plan_id == plan.plan_id
    ).count()

    plan_dict = {
        "plan_id": plan.plan_id,
        "plan_name": plan.plan_name,
        "display_name": plan.display_name,
        "description": plan.description,
        "monthly_price": float(plan.monthly_price),
        "annual_price": float(plan.annual_price),
        "currency": plan.currency,
        "max_employees": plan.max_employees,
        "max_sites": plan.max_sites,
        "max_clients": plan.max_clients,
        "max_supervisors": plan.max_supervisors,
        "features": plan.features or {},
        "is_active": plan.is_active,
        "sort_order": plan.sort_order,
        "annual_savings": plan.annual_savings,
        "annual_discount_percent": plan.annual_discount_percent,
        "organization_count": org_count
    }

    return PlanResponse(**plan_dict)


@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription_plan(
    plan_data: PlanCreate,
    db: Session = Depends(get_db),
    current_superadmin: User = Depends(get_current_superadmin)
):
    """
    Create a new subscription plan.

    Superadmin only.
    """

    # Check if plan name already exists
    existing_plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.plan_name == plan_data.plan_name
    ).first()

    if existing_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan with name '{plan_data.plan_name}' already exists"
        )

    # Create new plan
    new_plan = SubscriptionPlan(
        plan_name=plan_data.plan_name,
        display_name=plan_data.display_name,
        description=plan_data.description,
        monthly_price=Decimal(str(plan_data.monthly_price)),
        annual_price=Decimal(str(plan_data.annual_price)),
        currency=plan_data.currency,
        max_employees=plan_data.max_employees,
        max_sites=plan_data.max_sites,
        max_clients=plan_data.max_clients,
        max_supervisors=plan_data.max_supervisors,
        features=plan_data.features,
        is_active=plan_data.is_active,
        sort_order=plan_data.sort_order
    )

    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    plan_dict = {
        "plan_id": new_plan.plan_id,
        "plan_name": new_plan.plan_name,
        "display_name": new_plan.display_name,
        "description": new_plan.description,
        "monthly_price": float(new_plan.monthly_price),
        "annual_price": float(new_plan.annual_price),
        "currency": new_plan.currency,
        "max_employees": new_plan.max_employees,
        "max_sites": new_plan.max_sites,
        "max_clients": new_plan.max_clients,
        "max_supervisors": new_plan.max_supervisors,
        "features": new_plan.features or {},
        "is_active": new_plan.is_active,
        "sort_order": new_plan.sort_order,
        "annual_savings": new_plan.annual_savings,
        "annual_discount_percent": new_plan.annual_discount_percent,
        "organization_count": 0
    }

    return PlanResponse(**plan_dict)


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_subscription_plan(
    plan_id: int,
    plan_data: PlanUpdate,
    db: Session = Depends(get_db),
    current_superadmin: User = Depends(get_current_superadmin)
):
    """
    Update an existing subscription plan.

    Superadmin only.
    """

    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.plan_id == plan_id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )

    # Update fields if provided
    update_data = plan_data.dict(exclude_unset=True)

    for field, value in update_data.items():
        if field in ['monthly_price', 'annual_price'] and value is not None:
            setattr(plan, field, Decimal(str(value)))
        else:
            setattr(plan, field, value)

    db.commit()
    db.refresh(plan)

    # Add organization count
    from app.models.organization import Organization
    org_count = db.query(Organization).filter(
        Organization.subscription_plan_id == plan.plan_id
    ).count()

    plan_dict = {
        "plan_id": plan.plan_id,
        "plan_name": plan.plan_name,
        "display_name": plan.display_name,
        "description": plan.description,
        "monthly_price": float(plan.monthly_price),
        "annual_price": float(plan.annual_price),
        "currency": plan.currency,
        "max_employees": plan.max_employees,
        "max_sites": plan.max_sites,
        "max_clients": plan.max_clients,
        "max_supervisors": plan.max_supervisors,
        "features": plan.features or {},
        "is_active": plan.is_active,
        "sort_order": plan.sort_order,
        "annual_savings": plan.annual_savings,
        "annual_discount_percent": plan.annual_discount_percent,
        "organization_count": org_count
    }

    return PlanResponse(**plan_dict)


@router.delete("/plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_superadmin: User = Depends(get_current_superadmin)
):
    """
    Delete a subscription plan.

    Superadmin only. Can only delete if no organizations are using it.
    """

    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.plan_id == plan_id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )

    # Check if any organizations are using this plan
    from app.models.organization import Organization
    org_count = db.query(Organization).filter(
        Organization.subscription_plan_id == plan.plan_id
    ).count()

    if org_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete plan. {org_count} organization(s) are currently using it. "
                   f"Deactivate the plan instead or migrate organizations to another plan first."
        )

    db.delete(plan)
    db.commit()

    return {
        "message": "Subscription plan deleted successfully",
        "plan_name": plan.plan_name
    }


@router.put("/plans/{plan_id}/toggle-active")
async def toggle_plan_active_status(
    plan_id: int,
    db: Session = Depends(get_db),
    current_superadmin: User = Depends(get_current_superadmin)
):
    """Toggle plan active/inactive status. Superadmin only."""

    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.plan_id == plan_id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )

    plan.is_active = not plan.is_active
    db.commit()

    return {
        "message": f"Plan {'activated' if plan.is_active else 'deactivated'} successfully",
        "plan_name": plan.plan_name,
        "is_active": plan.is_active
    }
