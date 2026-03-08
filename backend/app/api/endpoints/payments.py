"""Payment endpoints - Yoco (primary) and PayFast (backup) integration.

MVP Pricing: R29/guard/month (counting ACTIVE employees only)
Free Trial: 14 days standard (extended for pilot customers like TUT)

NOTE: Yoco does NOT support native subscriptions/recurring billing.
We implement monthly one-time payments with manual billing workflow.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from decimal import Decimal
from app.database import get_db
from app.models.organization import Organization, SubscriptionStatus
from app.models.subscription_plan import SubscriptionPlan
from app.models.employee import Employee
from app.models.user import User
from app.models.payment_transaction import PaymentTransaction
from app.auth.security import get_current_user
from app.services.payfast_service import payfast_service, PayFastService
from app.services.yoco_service import yoco_service, YocoService
from app.config import settings
from pydantic import BaseModel
import json
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

        # Idempotency: skip if this payment was already processed
        existing = db.query(PaymentTransaction).filter(
            PaymentTransaction.gateway_transaction_id == str(pf_payment_id),
            PaymentTransaction.gateway == "payfast",
        ).first()
        if existing:
            logger.info(f"PayFast webhook already processed: {pf_payment_id}")
            return {"status": "success", "message": "Already processed"}

        # Handle payment status
        pf_amount = Decimal(str(webhook_data.get("amount_gross", 0)))

        if payment_status == "COMPLETE":
            # Payment successful
            organization.subscription_status = SubscriptionStatus.ACTIVE
            organization.payfast_subscription_token = token
            organization.subscription_started_at = datetime.utcnow()
            organization.subscription_next_billing_date = datetime.utcnow() + timedelta(days=30)
            organization.payment_failures = 0

            transaction = PaymentTransaction(
                org_id=org_id,
                gateway="payfast",
                gateway_transaction_id=str(pf_payment_id),
                gateway_status="COMPLETE",
                status="completed",
                amount=pf_amount,
                description=f"PayFast payment for {organization.company_name}",
                metadata_json=json.dumps({k: str(v) for k, v in post_data.items()}),
                completed_at=datetime.utcnow(),
            )
            db.add(transaction)

            logger.info(f"Payment successful for org {org_id}, subscription activated")

        elif payment_status == "CANCELLED":
            # Subscription cancelled
            organization.subscription_status = SubscriptionStatus.CANCELLED

            transaction = PaymentTransaction(
                org_id=org_id,
                gateway="payfast",
                gateway_transaction_id=str(pf_payment_id),
                gateway_status="CANCELLED",
                status="cancelled",
                amount=pf_amount,
                description="Subscription cancelled",
                metadata_json=json.dumps({k: str(v) for k, v in post_data.items()}),
            )
            db.add(transaction)

            logger.info(f"Subscription cancelled for org {org_id}")

        elif payment_status == "FAILED":
            # Payment failed
            organization.payment_failures += 1

            if organization.payment_failures >= 3:
                organization.subscription_status = SubscriptionStatus.SUSPENDED
                logger.warning(f"Org {org_id} suspended after 3 payment failures")

            transaction = PaymentTransaction(
                org_id=org_id,
                gateway="payfast",
                gateway_transaction_id=str(pf_payment_id),
                gateway_status="FAILED",
                status="failed",
                amount=pf_amount,
                description=f"Payment failed (failure #{organization.payment_failures})",
                metadata_json=json.dumps({k: str(v) for k, v in post_data.items()}),
            )
            db.add(transaction)

        # Save changes
        db.commit()

        return {
            "status": "success",
            "message": "Webhook processed successfully",
            "org_id": org_id,
            "payment_status": payment_status
        }

    except HTTPException:
        raise  # Re-raise HTTP exceptions (e.g. invalid signature) without wrapping
    except Exception as e:
        logger.error(f"PayFast webhook error: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )


class PaymentStatusResponse(BaseModel):
    """Payment transaction status response."""
    transaction_id: int
    gateway: str
    gateway_transaction_id: Optional[str] = None
    status: str
    amount: float
    currency: str = "ZAR"
    billing_period: Optional[str] = None
    guard_count: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("/status/{payment_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment status for a specific transaction."""
    transaction = db.query(PaymentTransaction).filter(
        PaymentTransaction.transaction_id == payment_id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment transaction not found"
        )

    # Verify user has access (same org, or superadmin)
    if not current_user.is_superadmin and current_user.org_id != transaction.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own organization's payments"
        )

    return transaction


@router.get("/history")
async def get_payment_history(
    skip: int = 0,
    limit: int = 20,
    gateway: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment transaction history for user's organization."""
    if current_user.org_id is None and not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No organization associated with your account"
        )

    limit = min(limit, 100)

    query = db.query(PaymentTransaction)

    if not current_user.is_superadmin:
        query = query.filter(PaymentTransaction.org_id == current_user.org_id)

    if gateway:
        query = query.filter(PaymentTransaction.gateway == gateway)

    if status_filter:
        query = query.filter(PaymentTransaction.status == status_filter)

    total = query.count()
    transactions = query.order_by(
        PaymentTransaction.created_at.desc()
    ).offset(skip).limit(limit).all()

    return {
        "transactions": [
            {
                "transaction_id": t.transaction_id,
                "gateway": t.gateway,
                "gateway_transaction_id": t.gateway_transaction_id,
                "status": t.status,
                "amount": float(t.amount),
                "currency": t.currency,
                "billing_period": t.billing_period,
                "guard_count": t.guard_count,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            }
            for t in transactions
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ==================== Per-Guard Subscription Endpoints ====================

class SubscriptionStatusResponse(BaseModel):
    """Current subscription status for organization."""
    subscription_status: str
    is_trial: bool
    trial_days_remaining: Optional[int] = None
    trial_end_date: Optional[datetime] = None
    active_guard_count: int
    monthly_rate_per_guard: float
    estimated_monthly_cost: float
    currency: str = "ZAR"
    payfast_active: bool = False
    next_billing_date: Optional[datetime] = None
    can_generate_rosters: bool = True


class SubscribeRequest(BaseModel):
    """Request to start a subscription."""
    pass  # Uses current user's org


class SubscribeResponse(BaseModel):
    """Response with PayFast checkout data."""
    payment_url: str
    payment_data: dict
    active_guard_count: int
    monthly_cost: float


@router.get("/subscription/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current subscription status for user's organization.

    Returns trial info, guard count, estimated cost, and whether
    roster generation is allowed.
    """
    # Superadmins don't belong to any organization
    if current_user.org_id is None:
        # Return a default response for superadmins (they don't need subscriptions)
        return SubscriptionStatusResponse(
            subscription_status="superadmin",
            is_trial=False,
            trial_days_remaining=None,
            trial_end_date=None,
            active_guard_count=0,
            monthly_rate_per_guard=0.0,
            estimated_monthly_cost=0.0,
            currency=settings.MVP_CURRENCY,
            payfast_active=False,
            next_billing_date=None,
            can_generate_rosters=True  # Superadmins have full access
        )

    # Get user's organization
    organization = db.query(Organization).filter(
        Organization.org_id == current_user.org_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Count active guards (employees with status='ACTIVE')
    active_guard_count = db.query(func.count(Employee.employee_id)).filter(
        Employee.org_id == organization.org_id,
        Employee.status == 'ACTIVE'
    ).scalar() or 0

    # Update organization's guard count cache
    organization.active_guard_count = active_guard_count
    organization.last_billing_calculation = datetime.utcnow()

    # Calculate estimated cost
    monthly_rate = float(organization.monthly_rate_per_guard or settings.MVP_MONTHLY_RATE_PER_GUARD)
    estimated_cost = active_guard_count * monthly_rate
    organization.current_month_cost = Decimal(str(estimated_cost))

    db.commit()

    # Check trial status
    is_trial = organization.subscription_status == "trial"
    trial_days_remaining = None

    if is_trial and organization.trial_end_date:
        trial_days_remaining = payfast_service.days_until_trial_expires(organization.trial_end_date)

    # Determine if roster generation is allowed
    can_generate = True
    if organization.subscription_status == "suspended":
        can_generate = False
    elif organization.subscription_status == "cancelled":
        can_generate = False
    elif is_trial and trial_days_remaining is not None and trial_days_remaining < 0:
        # Trial expired and no active subscription
        can_generate = False

    return SubscriptionStatusResponse(
        subscription_status=organization.subscription_status,
        is_trial=is_trial,
        trial_days_remaining=trial_days_remaining if trial_days_remaining and trial_days_remaining > 0 else None,
        trial_end_date=organization.trial_end_date,
        active_guard_count=active_guard_count,
        monthly_rate_per_guard=monthly_rate,
        estimated_monthly_cost=estimated_cost,
        currency=settings.MVP_CURRENCY,
        payfast_active=bool(organization.payfast_subscription_token),
        next_billing_date=organization.subscription_next_billing_date,
        can_generate_rosters=can_generate
    )


@router.post("/subscribe", response_model=SubscribeResponse)
async def start_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate PayFast checkout form for per-guard subscription.

    Calculates cost based on current ACTIVE employee count.
    Returns PayFast form data that frontend submits to PayFast.
    """
    # Get user's organization
    organization = db.query(Organization).filter(
        Organization.org_id == current_user.org_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Check if already subscribed
    if organization.subscription_status == "active" and organization.payfast_subscription_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization already has an active subscription"
        )

    # Count active guards
    active_guard_count = db.query(func.count(Employee.employee_id)).filter(
        Employee.org_id == organization.org_id,
        Employee.status == 'ACTIVE'
    ).scalar() or 0

    if active_guard_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot subscribe with 0 active guards. Please add employees first."
        )

    # Generate subscription checkout data
    payment_data = payfast_service.generate_subscription_data(
        org_id=organization.org_id,
        company_name=organization.company_name,
        email=organization.billing_email or current_user.email,
        active_guard_count=active_guard_count
    )

    # Calculate monthly cost for response
    monthly_cost = float(payfast_service.calculate_monthly_cost(active_guard_count))

    logger.info(f"Subscription checkout generated for org {organization.org_id}: "
                f"{active_guard_count} guards @ R{settings.MVP_MONTHLY_RATE_PER_GUARD}/guard = R{monthly_cost}/month")

    return SubscribeResponse(
        payment_url=payfast_service.get_payment_url(),
        payment_data=payment_data,
        active_guard_count=active_guard_count,
        monthly_cost=monthly_cost
    )


@router.post("/start-trial")
async def start_trial(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start free trial for organization.

    Called when organization is first created or to reset trial.
    Trial length: 14 days (or extended for pilot customers).
    """
    organization = db.query(Organization).filter(
        Organization.org_id == current_user.org_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Check if already on active subscription
    if organization.subscription_status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization already has an active subscription"
        )

    # Start trial
    organization.subscription_status = "trial"
    organization.trial_start_date = datetime.utcnow()
    organization.trial_end_date = payfast_service.calculate_trial_end_date()

    db.commit()

    return {
        "status": "success",
        "message": f"Trial started! You have {settings.FREE_TRIAL_DAYS} days free.",
        "trial_start_date": organization.trial_start_date,
        "trial_end_date": organization.trial_end_date
    }


@router.post("/extend-trial")
async def extend_trial(
    days: int = 30,
    org_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extend trial period (superadmin only).

    Used for pilot customers like TUT who get extended trials.
    """
    # Only superadmins can extend trials
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can extend trials"
        )

    # Get target organization
    target_org_id = org_id or current_user.org_id
    organization = db.query(Organization).filter(
        Organization.org_id == target_org_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Extend trial from current end date or now
    base_date = organization.trial_end_date or datetime.utcnow()
    organization.trial_end_date = base_date + timedelta(days=days)
    organization.subscription_status = "trial"

    db.commit()

    logger.info(f"Trial extended for org {target_org_id} by {days} days (by superadmin {current_user.user_id})")

    return {
        "status": "success",
        "message": f"Trial extended by {days} days for {organization.company_name}",
        "new_trial_end_date": organization.trial_end_date
    }


# ==================== Yoco Payment Endpoints (Primary Gateway) ====================

class YocoCheckoutResponse(BaseModel):
    """Response with Yoco checkout details."""
    success: bool
    checkout_id: Optional[str] = None
    redirect_url: Optional[str] = None
    active_guard_count: int
    monthly_cost: float
    billing_period: str
    error: Optional[str] = None


@router.post("/yoco/checkout", response_model=YocoCheckoutResponse)
async def create_yoco_checkout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create Yoco checkout for monthly subscription payment.

    Since Yoco doesn't support recurring billing, this creates a one-time
    payment for the current month. Organizations need to pay monthly.
    """
    # Get user's organization
    organization = db.query(Organization).filter(
        Organization.org_id == current_user.org_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Count active guards
    active_guard_count = db.query(func.count(Employee.employee_id)).filter(
        Employee.org_id == organization.org_id,
        Employee.status == 'ACTIVE'
    ).scalar() or 0

    if active_guard_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot subscribe with 0 active guards. Please add employees first."
        )

    # Check if payment already made this month
    current_period = yoco_service.get_current_billing_period()
    if organization.last_payment_period == current_period:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment already completed for {current_period}. Next payment due: {organization.subscription_next_billing_date}"
        )

    # Create Yoco checkout session
    result = await yoco_service.create_subscription_checkout(
        org_id=organization.org_id,
        company_name=organization.company_name,
        email=organization.billing_email or current_user.email,
        active_guard_count=active_guard_count
    )

    if not result.get("success"):
        logger.error(f"Yoco checkout failed for org {organization.org_id}: {result.get('error')}")
        return YocoCheckoutResponse(
            success=False,
            active_guard_count=active_guard_count,
            monthly_cost=float(yoco_service.calculate_monthly_cost(active_guard_count)),
            billing_period=current_period,
            error=result.get("error", "Failed to create checkout")
        )

    logger.info(f"Yoco checkout created for org {organization.org_id}: "
                f"{active_guard_count} guards @ R{settings.MVP_MONTHLY_RATE_PER_GUARD}/guard")

    return YocoCheckoutResponse(
        success=True,
        checkout_id=result.get("checkout_id"),
        redirect_url=result.get("redirect_url"),
        active_guard_count=active_guard_count,
        monthly_cost=result.get("monthly_cost", 0),
        billing_period=result.get("billing_period", current_period)
    )


@router.post("/yoco/webhook")
async def yoco_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Yoco webhook events.

    Yoco sends webhooks for:
    - checkout.completed: Payment successful
    - checkout.expired: Checkout session expired
    - refund.completed: Refund processed
    """
    try:
        # Get raw body for signature verification
        body = await request.body()
        signature = request.headers.get("Yoco-Signature", "")

        # Verify signature
        if not yoco_service.verify_webhook_signature(body, signature):
            logger.warning("Invalid Yoco webhook signature")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )

        # Parse JSON body
        data = json.loads(body)

        logger.info(f"Yoco webhook received: {data.get('type')}")

        # Parse event data
        event = yoco_service.parse_webhook_event(data)
        event_type = event.get("event_type")
        org_id = event.get("org_id")

        if not org_id:
            logger.warning("Webhook missing org_id in metadata")
            return {"status": "ignored", "message": "No org_id in metadata"}

        # Get organization
        organization = db.query(Organization).filter(
            Organization.org_id == org_id
        ).first()

        if not organization:
            logger.error(f"Organization {org_id} not found for webhook")
            return {"status": "error", "message": "Organization not found"}

        # Idempotency: skip if this event was already processed
        checkout_id = event.get("checkout_id")
        if checkout_id:
            existing = db.query(PaymentTransaction).filter(
                PaymentTransaction.gateway_transaction_id == checkout_id,
                PaymentTransaction.gateway == "yoco",
            ).first()
            if existing:
                logger.info(f"Yoco webhook already processed: {checkout_id}")
                return {"status": "success", "message": "Already processed"}

        # Handle event types
        yoco_amount = Decimal(str(event.get("amount", 0) / 100)) if event.get("amount") else Decimal("0")

        if event_type == "checkout.completed":
            # Payment successful
            organization.subscription_status = SubscriptionStatus.ACTIVE
            organization.last_payment_date = datetime.utcnow()
            organization.last_payment_amount = yoco_amount
            organization.last_payment_period = event.get("billing_period")
            organization.subscription_next_billing_date = yoco_service.get_next_billing_date()
            organization.payment_failures = 0

            # Store last checkout ID for reference
            organization.yoco_last_checkout_id = event.get("checkout_id")

            transaction = PaymentTransaction(
                org_id=org_id,
                gateway="yoco",
                gateway_transaction_id=event.get("checkout_id"),
                gateway_status="completed",
                status="completed",
                amount=yoco_amount,
                currency=event.get("currency", "ZAR"),
                billing_period=event.get("billing_period"),
                guard_count=event.get("guard_count"),
                description=f"Yoco payment for {organization.company_name}",
                metadata_json=json.dumps(data),
                completed_at=datetime.utcnow(),
            )
            db.add(transaction)

            logger.info(f"Payment successful for org {org_id}: R{organization.last_payment_amount}")

        elif event_type == "checkout.expired":
            # Payment window expired
            transaction = PaymentTransaction(
                org_id=org_id,
                gateway="yoco",
                gateway_transaction_id=event.get("checkout_id"),
                gateway_status="expired",
                status="expired",
                amount=yoco_amount,
                currency=event.get("currency", "ZAR"),
                billing_period=event.get("billing_period"),
                description="Checkout session expired",
                metadata_json=json.dumps(data),
            )
            db.add(transaction)

            logger.warning(f"Checkout expired for org {org_id}")

        elif event_type == "refund.completed":
            # Refund processed
            transaction = PaymentTransaction(
                org_id=org_id,
                gateway="yoco",
                gateway_transaction_id=event.get("checkout_id"),
                gateway_status="refunded",
                status="refunded",
                amount=yoco_amount,
                currency=event.get("currency", "ZAR"),
                description="Refund processed",
                metadata_json=json.dumps(data),
                completed_at=datetime.utcnow(),
            )
            db.add(transaction)

            logger.info(f"Refund completed for org {org_id}")

        db.commit()

        return {
            "status": "success",
            "event_type": event_type,
            "org_id": org_id
        }

    except json.JSONDecodeError:
        logger.error("Invalid JSON in Yoco webhook")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON"
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions (e.g. invalid signature) without wrapping
    except Exception as e:
        logger.error(f"Yoco webhook error: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )


@router.get("/billing/info")
async def get_billing_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive billing information for organization.

    Includes guard count, costs, payment history, and next due date.
    """
    organization = db.query(Organization).filter(
        Organization.org_id == current_user.org_id
    ).first()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Count active guards
    active_guard_count = db.query(func.count(Employee.employee_id)).filter(
        Employee.org_id == organization.org_id,
        Employee.status == 'ACTIVE'
    ).scalar() or 0

    # Calculate monthly cost
    monthly_cost = float(yoco_service.calculate_monthly_cost(active_guard_count))

    # Check if payment is due
    is_payment_due = yoco_service.is_payment_due(organization.last_payment_date)

    # Trial info
    is_trial = organization.subscription_status == "trial"
    trial_days_remaining = None
    if is_trial and organization.trial_end_date:
        trial_days_remaining = yoco_service.days_until_trial_expires(organization.trial_end_date)

    return {
        "organization": {
            "org_id": organization.org_id,
            "company_name": organization.company_name,
            "subscription_status": organization.subscription_status
        },
        "billing": {
            "active_guard_count": active_guard_count,
            "rate_per_guard": float(settings.MVP_MONTHLY_RATE_PER_GUARD),
            "monthly_cost": monthly_cost,
            "currency": settings.MVP_CURRENCY,
            "current_period": yoco_service.get_current_billing_period(),
            "is_payment_due": is_payment_due,
            "next_billing_date": organization.subscription_next_billing_date
        },
        "last_payment": {
            "date": organization.last_payment_date,
            "amount": float(organization.last_payment_amount) if organization.last_payment_amount else None,
            "period": organization.last_payment_period
        },
        "trial": {
            "is_trial": is_trial,
            "days_remaining": trial_days_remaining if trial_days_remaining and trial_days_remaining > 0 else None,
            "end_date": organization.trial_end_date
        },
        "payment_gateway": "yoco"
    }
