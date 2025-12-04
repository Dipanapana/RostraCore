"""Yoco payment gateway integration service.

Yoco is a popular South African payment gateway.
Documentation: https://developer.yoco.com/

NOTE: Yoco does NOT support native subscriptions/recurring billing.
We implement monthly one-time payments with manual billing workflow.

Features:
- Checkout session creation
- Webhook signature verification
- Trial period management
- Per-guard billing calculation
"""

import hashlib
import hmac
import logging
import httpx
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
from app.config import settings

logger = logging.getLogger(__name__)


class YocoService:
    """Service for Yoco payment integration."""

    YOCO_API_URL = "https://payments.yoco.com/api"

    def __init__(self):
        """Initialize Yoco service with credentials from settings."""
        self.secret_key = getattr(settings, 'YOCO_SECRET_KEY', '')
        self.public_key = getattr(settings, 'YOCO_PUBLIC_KEY', '')
        self.webhook_secret = getattr(settings, 'YOCO_WEBHOOK_SECRET', '')
        self.sandbox_mode = getattr(settings, 'YOCO_SANDBOX', True)

        # Headers for API requests
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }

    async def create_checkout(
        self,
        amount_cents: int,
        currency: str,
        success_url: str,
        cancel_url: str,
        metadata: Optional[Dict[str, Any]] = None,
        line_items: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Create a Yoco checkout session.

        Args:
            amount_cents: Amount in cents (e.g., R29.00 = 2900)
            currency: Currency code (ZAR)
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment cancelled
            metadata: Custom data to attach to checkout
            line_items: Optional line items for the checkout

        Returns:
            Dict containing checkout id and redirect URL
        """
        payload = {
            "amount": amount_cents,
            "currency": currency,
            "successUrl": success_url,
            "cancelUrl": cancel_url,
        }

        if metadata:
            payload["metadata"] = metadata

        if line_items:
            payload["lineItems"] = line_items

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.YOCO_API_URL}/checkouts",
                    json=payload,
                    headers=self.headers,
                    timeout=30.0
                )

                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"Yoco checkout created: {data.get('id')}")
                    return {
                        "success": True,
                        "checkout_id": data.get("id"),
                        "redirect_url": data.get("redirectUrl"),
                        "status": data.get("status")
                    }
                else:
                    error_data = response.json() if response.content else {}
                    logger.error(f"Yoco checkout failed: {response.status_code} - {error_data}")
                    return {
                        "success": False,
                        "error": error_data.get("message", "Checkout creation failed"),
                        "status_code": response.status_code
                    }

        except Exception as e:
            logger.error(f"Yoco API error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str
    ) -> bool:
        """
        Verify webhook signature from Yoco.

        Args:
            payload: Raw request body bytes
            signature: Signature from Yoco-Signature header

        Returns:
            True if signature is valid
        """
        if not self.webhook_secret:
            logger.warning("Webhook secret not configured, skipping verification")
            return True

        try:
            # Yoco uses HMAC-SHA256 for webhook signatures
            expected_signature = hmac.new(
                self.webhook_secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Webhook signature verification error: {str(e)}")
            return False

    def parse_webhook_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse Yoco webhook event data.

        Args:
            data: Webhook payload from Yoco

        Returns:
            Parsed event data
        """
        event_type = data.get("type", "")
        payload = data.get("payload", {})

        return {
            "event_type": event_type,
            "checkout_id": payload.get("id"),
            "status": payload.get("status"),
            "amount": payload.get("amount"),
            "currency": payload.get("currency"),
            "metadata": payload.get("metadata", {}),
            "created_at": payload.get("createdDate"),
            "payment_id": payload.get("paymentId"),

            # Extract our custom metadata
            "org_id": payload.get("metadata", {}).get("org_id"),
            "billing_period": payload.get("metadata", {}).get("billing_period"),
            "guard_count": payload.get("metadata", {}).get("guard_count"),
        }

    # ==================== Subscription/Billing Management ====================

    @staticmethod
    def calculate_amount_cents(amount_zar: float) -> int:
        """Convert ZAR amount to cents for Yoco API."""
        return int(amount_zar * 100)

    @staticmethod
    def calculate_monthly_cost(active_guard_count: int) -> Decimal:
        """
        Calculate monthly subscription cost based on active guards.

        Args:
            active_guard_count: Number of active employees/guards

        Returns:
            Monthly cost in ZAR
        """
        rate = Decimal(str(settings.MVP_MONTHLY_RATE_PER_GUARD))
        return rate * active_guard_count

    async def create_subscription_checkout(
        self,
        org_id: int,
        company_name: str,
        email: str,
        active_guard_count: int,
        billing_period: str = None
    ) -> Dict[str, Any]:
        """
        Create checkout for organization subscription payment.

        Args:
            org_id: Organization ID
            company_name: Company name for reference
            email: Billing email address
            active_guard_count: Number of active guards
            billing_period: Optional billing period (e.g., "2024-01")

        Returns:
            Checkout session data with redirect URL
        """
        # Calculate cost
        monthly_cost = float(self.calculate_monthly_cost(active_guard_count))
        amount_cents = self.calculate_amount_cents(monthly_cost)

        # Default billing period to current month
        if not billing_period:
            billing_period = datetime.utcnow().strftime("%Y-%m")

        # Build success/cancel URLs
        success_url = f"{settings.FRONTEND_URL}/billing/success?org_id={org_id}"
        cancel_url = f"{settings.FRONTEND_URL}/billing/cancel"

        # Line items for receipt
        line_items = [
            {
                "displayName": f"GuardianOS Subscription - {company_name}",
                "description": f"Monthly subscription for {active_guard_count} guards @ R{settings.MVP_MONTHLY_RATE_PER_GUARD}/guard",
                "quantity": {
                    "count": active_guard_count,
                    "name": "guards",
                    "description": "Active security guards"
                },
                "pricingDetails": {
                    "price": self.calculate_amount_cents(float(settings.MVP_MONTHLY_RATE_PER_GUARD))
                }
            }
        ]

        # Metadata for webhook processing
        metadata = {
            "org_id": org_id,
            "company_name": company_name,
            "email": email,
            "guard_count": active_guard_count,
            "billing_period": billing_period,
            "monthly_rate": float(settings.MVP_MONTHLY_RATE_PER_GUARD),
            "payment_type": "subscription"
        }

        result = await self.create_checkout(
            amount_cents=amount_cents,
            currency=settings.MVP_CURRENCY,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            line_items=line_items
        )

        if result.get("success"):
            result["monthly_cost"] = monthly_cost
            result["active_guard_count"] = active_guard_count
            result["billing_period"] = billing_period

        return result

    # ==================== Trial Management Methods ====================

    @staticmethod
    def calculate_trial_end_date(start_date: datetime = None) -> datetime:
        """
        Calculate trial end date from start date.

        Args:
            start_date: When trial started (defaults to now)

        Returns:
            DateTime when trial expires
        """
        if start_date is None:
            start_date = datetime.utcnow()
        return start_date + timedelta(days=settings.FREE_TRIAL_DAYS)

    @staticmethod
    def is_trial_expired(trial_ends_at: datetime) -> bool:
        """
        Check if trial period has expired.

        Args:
            trial_ends_at: Trial expiration date

        Returns:
            True if trial has expired
        """
        if trial_ends_at is None:
            return True
        return datetime.utcnow() > trial_ends_at

    @staticmethod
    def days_until_trial_expires(trial_ends_at: datetime) -> int:
        """
        Get number of days until trial expires.

        Args:
            trial_ends_at: Trial expiration date

        Returns:
            Days remaining (negative if expired)
        """
        if trial_ends_at is None:
            return -1
        delta = trial_ends_at - datetime.utcnow()
        return delta.days

    # ==================== Billing Period Helpers ====================

    @staticmethod
    def get_current_billing_period() -> str:
        """Get current billing period in YYYY-MM format."""
        return datetime.utcnow().strftime("%Y-%m")

    @staticmethod
    def get_next_billing_date() -> datetime:
        """Get date of next billing (first of next month)."""
        now = datetime.utcnow()
        if now.month == 12:
            return datetime(now.year + 1, 1, 1)
        return datetime(now.year, now.month + 1, 1)

    @staticmethod
    def is_payment_due(last_payment_date: datetime) -> bool:
        """
        Check if a new payment is due.

        Args:
            last_payment_date: Date of last successful payment

        Returns:
            True if more than 30 days since last payment
        """
        if last_payment_date is None:
            return True
        days_since_payment = (datetime.utcnow() - last_payment_date).days
        return days_since_payment >= 30


# Singleton instance for easy access
yoco_service = YocoService()
