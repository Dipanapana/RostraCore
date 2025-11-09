"""Payment webhook endpoints - PayFast and Stripe integrations."""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.cv_generation import CVPurchase, PaymentStatus
from app.models.guard_applicant import GuardApplicant
from app.services.payment_service import PaymentService
from pydantic import BaseModel

router = APIRouter()


# Schemas
class PaymentInitiateRequest(BaseModel):
    applicant_id: int
    purchase_id: int
    gateway: str = "payfast"  # payfast or stripe


class PaymentInitiateResponse(BaseModel):
    gateway: str
    payment_url: Optional[str] = None
    payment_data: Optional[dict] = None
    client_secret: Optional[str] = None
    payment_intent_id: Optional[str] = None


@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    payment_request: PaymentInitiateRequest,
    db: Session = Depends(get_db)
):
    """
    Initiate payment for CV purchase.

    Supports PayFast (South African) and Stripe (International).
    """

    # Get purchase
    purchase = db.query(CVPurchase).filter(
        CVPurchase.purchase_id == payment_request.purchase_id
    ).first()

    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )

    # Get applicant
    applicant = db.query(GuardApplicant).filter(
        GuardApplicant.applicant_id == payment_request.applicant_id
    ).first()

    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant not found"
        )

    # Create payment with chosen gateway
    payment_service = PaymentService(db)

    try:
        payment_details = payment_service.create_cv_payment(
            applicant_id=payment_request.applicant_id,
            purchase_id=payment_request.purchase_id,
            buyer_email=applicant.email,
            buyer_name=applicant.full_name,
            gateway=payment_request.gateway
        )

        if payment_request.gateway == "payfast":
            return PaymentInitiateResponse(
                gateway="payfast",
                payment_url=payment_details['payment_url'],
                payment_data=payment_details['payment_data']
            )
        elif payment_request.gateway == "stripe":
            return PaymentInitiateResponse(
                gateway="stripe",
                client_secret=payment_details['client_secret'],
                payment_intent_id=payment_details['payment_intent_id']
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment initiation failed: {str(e)}"
        )


@router.post("/payfast/webhook")
async def payfast_webhook(request: Request, db: Session = Depends(get_db)):
    """
    PayFast IPN (Instant Payment Notification) webhook.

    Called by PayFast when payment status changes.
    """

    # Get POST data
    form_data = await request.form()
    post_data = dict(form_data)

    # Initialize payment service
    payment_service = PaymentService(db)

    # Verify payment
    if not payment_service.payfast.verify_payment(post_data):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment verification"
        )

    # Extract payment details
    payment_status = post_data.get('payment_status')
    m_payment_id = post_data.get('m_payment_id')  # Our purchase_id
    amount_gross = float(post_data.get('amount_gross', 0))

    # Get purchase
    purchase = db.query(CVPurchase).filter(
        CVPurchase.purchase_id == int(m_payment_id)
    ).first()

    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )

    # Update purchase based on payment status
    if payment_status == "COMPLETE":
        purchase.payment_status = PaymentStatus.COMPLETED
        purchase.paid_at = datetime.utcnow()
        purchase.payment_reference = post_data.get('pf_payment_id')

        # Update applicant
        applicant = db.query(GuardApplicant).filter(
            GuardApplicant.applicant_id == purchase.applicant_id
        ).first()
        if applicant:
            applicant.cv_purchase_id = purchase.purchase_id

    elif payment_status == "FAILED":
        purchase.payment_status = PaymentStatus.FAILED

    elif payment_status == "CANCELLED":
        purchase.payment_status = PaymentStatus.CANCELLED

    db.commit()

    return {"status": "success"}


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db)
):
    """
    Stripe webhook endpoint.

    Handles payment intent succeeded, failed, etc.
    """

    # Get raw body
    body = await request.body()

    # Initialize payment service
    payment_service = PaymentService(db)

    # Verify webhook signature
    event = payment_service.stripe.verify_webhook(body, stripe_signature)

    if not event:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature"
        )

    # Handle different event types
    event_type = event['type']
    event_data = event['data']['object']

    if event_type == 'payment_intent.succeeded':
        # Payment successful
        metadata = event_data.get('metadata', {})
        purchase_id = int(metadata.get('purchase_id'))

        purchase = db.query(CVPurchase).filter(
            CVPurchase.purchase_id == purchase_id
        ).first()

        if purchase:
            purchase.payment_status = PaymentStatus.COMPLETED
            purchase.paid_at = datetime.utcnow()
            purchase.payment_reference = event_data.get('id')

            # Update applicant
            applicant = db.query(GuardApplicant).filter(
                GuardApplicant.applicant_id == purchase.applicant_id
            ).first()
            if applicant:
                applicant.cv_purchase_id = purchase.purchase_id

            db.commit()

    elif event_type == 'payment_intent.payment_failed':
        # Payment failed
        metadata = event_data.get('metadata', {})
        purchase_id = int(metadata.get('purchase_id'))

        purchase = db.query(CVPurchase).filter(
            CVPurchase.purchase_id == purchase_id
        ).first()

        if purchase:
            purchase.payment_status = PaymentStatus.FAILED
            db.commit()

    return {"status": "success"}


@router.get("/status/{purchase_id}")
async def get_payment_status(
    purchase_id: int,
    db: Session = Depends(get_db)
):
    """
    Get payment status for a purchase.
    """

    purchase = db.query(CVPurchase).filter(
        CVPurchase.purchase_id == purchase_id
    ).first()

    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )

    return {
        "purchase_id": purchase.purchase_id,
        "amount": float(purchase.amount),
        "payment_method": purchase.payment_method,
        "payment_status": purchase.payment_status,
        "paid_at": purchase.paid_at,
        "payment_reference": purchase.payment_reference,
        "created_at": purchase.created_at
    }
