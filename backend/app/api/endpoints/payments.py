"""Payment webhook endpoints - PayFast integration for subscriptions."""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional, Dict
from datetime import datetime, timedelta
from app.database import get_db
from app.models.organization import Organization, SubscriptionStatus
from app.models.subscription_plan import SubscriptionPlan
from app.models.user import User
from app.auth.security import get_current_user
from app.services.payfast_service import PayFastService
from pydantic import BaseModel
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


# Schemas
class PaymentInitiateRequest(BaseModel):
    """Request to initiate a subscription payment."""
    organization_id: int
    subscription_plan_id: int


class PaymentInitiateResponse(BaseModel):
    """Response with payment gateway details."""
    gateway: str = "payfast"
    payment_url: str
    payment_data: dict


@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    payment_request: PaymentInitiateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate PayFast payment for subscription.

    Creates PayFast payment form data for organization subscription.
    User submits this form to PayFast to complete payment.
    """
    # Get organization
    organization = db.query(Organization).filter(
        Organization.org_id == payment_request.organization_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Verify user belongs to organization
    if current_user.org_id != organization.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only initiate payments for your own organization"
        )

    # Get subscription plan
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.plan_id == payment_request.subscription_plan_id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )

    # Initialize PayFast service
    payfast = PayFastService()

    # Generate payment data
    payment_data = payfast.generate_payment_data(
        amount=float(plan.monthly_price),
        item_name=f"{plan.display_name} Subscription",
        item_description=plan.description or f"Monthly subscription to {plan.display_name}",
        email_address=organization.billing_email or current_user.email,
        org_id=organization.org_id,
        subscription_type="monthly"
    )

    return PaymentInitiateResponse(
        gateway="payfast",
        payment_url=payfast.get_payment_url(),
        payment_data=payment_data
    )


@router.post("/webhook/payfast")
async def payfast_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle PayFast payment webhook (ITN - Instant Transaction Notification).

    PayFast sends POST data when:
    - Initial payment succeeds
    - Recurring payment succeeds
    - Subscription cancelled
    - Payment fails
    """
    try:
        # Get POST data from PayFast
        form_data = await request.form()
        post_data = dict(form_data)

        logger.info(f"PayFast webhook received: {post_data}")

        # Initialize PayFast service
        payfast = PayFastService()

        # Verify signature
        if not payfast.verify_signature(post_data):
            logger.error("Invalid PayFast signature")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )

        # Parse webhook data
        webhook_data = payfast.parse_webhook_data(post_data)
        org_id = webhook_data['org_id']
        payment_status = webhook_data['payment_status']
        pf_payment_id = webhook_data['pf_payment_id']
        token = webhook_data.get('token')

        # Get organization
        organization = db.query(Organization).filter(
            Organization.org_id == org_id
        ).first()

        if not organization:
            logger.error(f"Organization {org_id} not found for payment {pf_payment_id}")
            return {"status": "error", "message": "Organization not found"}

        # Handle payment status
        if payment_status == "COMPLETE":
            # Payment successful
            organization.subscription_status = SubscriptionStatus.ACTIVE
            organization.payfast_subscription_token = token
            organization.subscription_started_at = datetime.utcnow()
            organization.subscription_next_billing_date = datetime.utcnow() + timedelta(days=30)
            organization.payment_failures = 0

            logger.info(f"Payment successful for org {org_id}, subscription activated")

        elif payment_status == "CANCELLED":
            # Subscription cancelled
            organization.subscription_status = SubscriptionStatus.CANCELLED
            logger.info(f"Subscription cancelled for org {org_id}")

        elif payment_status == "FAILED":
            # Payment failed
            organization.payment_failures += 1

            if organization.payment_failures >= 3:
                organization.subscription_status = SubscriptionStatus.SUSPENDED
                logger.warning(f"Org {org_id} suspended after 3 payment failures")

        # Save changes
        db.commit()

        return {
            "status": "success",
            "message": "Webhook processed successfully",
            "org_id": org_id,
            "payment_status": payment_status
        }

    except Exception as e:
        logger.error(f"PayFast webhook error: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )


@router.get("/status/{payment_id}")
async def get_payment_status(
    payment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get payment status for a subscription payment.

    TODO: Implement in Phase 4 (Subscription System)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Payment status coming in Phase 4"
    )
