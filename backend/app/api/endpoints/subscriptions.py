"""Subscription management endpoints - PayFast recurring billing."""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.services.subscription_service import SubscriptionService
from app.api.deps import get_current_user
from pydantic import BaseModel, EmailStr

router = APIRouter()


# Schemas
class SubscriptionCreateRequest(BaseModel):
    """Request to create subscription."""
    org_id: int
    billing_contact_name: str
    billing_email: EmailStr


class SubscriptionCreateResponse(BaseModel):
    """Response with PayFast payment form data."""
    status: str
    payment_url: str
    payment_data: dict
    subscription: dict


class SubscriptionStatusResponse(BaseModel):
    """Subscription status response."""
    org_id: int
    company_name: str
    subscription_status: str
    payfast_status: Optional[str]
    has_active_subscription: bool
    started_at: Optional[str]
    next_billing_date: Optional[str]
    payment_method_last_four: Optional[str]
    payment_failures: int
    billing: Optional[dict]


@router.post("/create", response_model=SubscriptionCreateResponse)
async def create_subscription(
    request: SubscriptionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create PayFast recurring subscription.

    Initiates subscription setup with PayFast.
    User will be redirected to PayFast for payment method setup.
    """
    # Verify user is admin of the organization
    if current_user.organization_id != request.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage this organization's subscription"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage subscriptions"
        )

    result = SubscriptionService.create_subscription(
        db=db,
        org_id=request.org_id,
        billing_contact_name=request.billing_contact_name,
        billing_email=request.billing_email
    )

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return SubscriptionCreateResponse(**result)


@router.post("/activate")
async def activate_subscription(
    org_id: int,
    subscription_token: str,
    payment_method_last_four: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Activate subscription after successful PayFast payment.

    Called internally after PayFast webhook confirms payment.
    """
    result = SubscriptionService.activate_subscription(
        db=db,
        org_id=org_id,
        subscription_token=subscription_token,
        payment_method_last_four=payment_method_last_four
    )

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@router.post("/pause")
async def pause_subscription(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Pause recurring subscription.

    Pauses billing until manually unpaused.
    """
    # Verify user is admin of the organization
    if current_user.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage this organization's subscription"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage subscriptions"
        )

    result = SubscriptionService.pause_subscription(db=db, org_id=org_id)

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@router.post("/unpause")
async def unpause_subscription(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Resume paused subscription.

    Resumes billing on next billing cycle.
    """
    # Verify user is admin of the organization
    if current_user.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage this organization's subscription"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage subscriptions"
        )

    result = SubscriptionService.unpause_subscription(db=db, org_id=org_id)

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@router.post("/cancel")
async def cancel_subscription(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel recurring subscription.

    Cancels subscription permanently. User must create new subscription to resume.
    """
    # Verify user is admin of the organization
    if current_user.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage this organization's subscription"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage subscriptions"
        )

    result = SubscriptionService.cancel_subscription(db=db, org_id=org_id)

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@router.get("/status/{org_id}", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get subscription status and billing details.

    Returns subscription info, payment status, and billing summary.
    """
    # Verify user is part of the organization
    if current_user.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this organization's subscription"
        )

    result = SubscriptionService.get_subscription_status(db=db, org_id=org_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    return SubscriptionStatusResponse(**result)


@router.post("/payfast/webhook")
async def payfast_subscription_webhook(request: Request, db: Session = Depends(get_db)):
    """
    PayFast subscription webhook (IPN).

    Handles subscription events:
    - subscription_created: Initial payment successful, subscription active
    - subscription_updated: Subscription details changed
    - subscription_payment_success: Monthly payment succeeded
    - subscription_payment_failed: Monthly payment failed
    - subscription_cancelled: Subscription cancelled
    """
    # Get POST data
    form_data = await request.form()
    post_data = dict(form_data)

    # Verify signature (same as one-time payment)
    from app.services.payment_service import PaymentService
    payment_service = PaymentService(db)

    if not payment_service.payfast.verify_payment(post_data):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment verification"
        )

    # Extract webhook data
    billing_date = post_data.get("billing_date")
    payment_status = post_data.get("payment_status")
    m_payment_id = post_data.get("m_payment_id")  # Our org_id
    token = post_data.get("token")  # PayFast subscription token
    amount_gross = float(post_data.get("amount_gross", 0))

    org_id = int(m_payment_id)

    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Handle different payment statuses
    if payment_status == "COMPLETE":
        # Successful payment - activate/reactivate subscription
        SubscriptionService.activate_subscription(
            db=db,
            org_id=org_id,
            subscription_token=token,
            payment_method_last_four=None  # PayFast doesn't provide this in webhook
        )

        # Reset failure count on success
        org.payment_failures = 0
        db.commit()

    elif payment_status == "FAILED":
        # Payment failed
        SubscriptionService.handle_payment_failure(db=db, org_id=org_id)

    elif payment_status == "CANCELLED":
        # Subscription cancelled
        org.payfast_subscription_status = "cancelled"
        org.subscription_status = "cancelled"
        db.commit()

    return {"status": "success"}
