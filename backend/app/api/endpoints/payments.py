"""Payment webhook endpoints - PayFast integration for subscriptions."""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db
from pydantic import BaseModel

router = APIRouter()


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
    db: Session = Depends(get_db)
):
    """
    Initiate PayFast payment for subscription.

    South African payments only via PayFast.

    TODO: Implement in Phase 4 (Subscription System)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="PayFast integration coming in Phase 4"
    )


@router.post("/webhook/payfast")
async def payfast_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle PayFast payment webhook notifications.

    TODO: Implement in Phase 4 (Subscription System)
    - Verify payment signature
    - Update subscription status
    - Send confirmation email
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="PayFast webhook coming in Phase 4"
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
