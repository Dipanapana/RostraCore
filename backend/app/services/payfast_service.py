"""PayFast payment gateway integration service.

PayFast is South Africa's leading payment gateway.
Documentation: https://developers.payfast.co.za/
"""

import hashlib
import urllib.parse
from typing import Dict, Optional
from datetime import datetime
from app.config import settings


class PayFastService:
    """Service for PayFast payment integration."""

    def __init__(self):
        """Initialize PayFast service with credentials from settings."""
        self.merchant_id = getattr(settings, 'PAYFAST_MERCHANT_ID', '')
        self.merchant_key = getattr(settings, 'PAYFAST_MERCHANT_KEY', '')
        self.passphrase = getattr(settings, 'PAYFAST_PASSPHRASE', '')
        self.sandbox_mode = getattr(settings, 'PAYFAST_SANDBOX', True)

        # PayFast URLs
        if self.sandbox_mode:
            self.payment_url = "https://sandbox.payfast.co.za/eng/process"
        else:
            self.payment_url = "https://www.payfast.co.za/eng/process"

    def generate_payment_data(
        self,
        amount: float,
        item_name: str,
        item_description: str,
        email_address: str,
        org_id: int,
        subscription_type: str = "monthly"
    ) -> Dict[str, str]:
        """
        Generate payment data for PayFast subscription.

        Args:
            amount: Monthly subscription amount
            item_name: Subscription plan name
            item_description: Plan description
            email_address: Customer email
            org_id: Organization ID (for reference)
            subscription_type: "monthly" or "annual"

        Returns:
            Dict containing PayFast form data and signature
        """
        # Build payment data
        payment_data = {
            'merchant_id': self.merchant_id,
            'merchant_key': self.merchant_key,
            'return_url': f"{settings.FRONTEND_URL}/subscription/success",
            'cancel_url': f"{settings.FRONTEND_URL}/subscription/cancel",
            'notify_url': f"{settings.BACKEND_URL}/api/v1/payments/payfast-webhook",

            # Subscription details
            'subscription_type': '1' if subscription_type == "monthly" else '2',  # 1=monthly, 2=annual
            'billing_date': datetime.utcnow().strftime('%Y-%m-%d'),
            'recurring_amount': f"{amount:.2f}",
            'frequency': '3',  # 3=monthly, 4=quarterly, 5=biannual, 6=annual
            'cycles': '0',  # 0=continuous until cancelled

            # Item details
            'item_name': item_name,
            'item_description': item_description,
            'amount': f"{amount:.2f}",

            # Customer details
            'email_address': email_address,

            # Custom fields for tracking
            'custom_str1': str(org_id),  # Organization ID
            'custom_str2': subscription_type,  # monthly/annual
            'custom_int1': org_id,
        }

        # Generate signature
        signature = self.generate_signature(payment_data)
        payment_data['signature'] = signature

        return payment_data

    def generate_signature(self, data: Dict[str, str]) -> str:
        """
        Generate MD5 signature for PayFast payment data.

        Args:
            data: Payment data dictionary

        Returns:
            MD5 hash signature
        """
        # Create parameter string
        param_string = ""
        for key in sorted(data.keys()):
            if key != 'signature':
                param_string += f"{key}={urllib.parse.quote_plus(str(data[key]).strip())}&"

        # Remove last ampersand
        param_string = param_string.rstrip('&')

        # Add passphrase if in production
        if self.passphrase:
            param_string += f"&passphrase={urllib.parse.quote_plus(self.passphrase.strip())}"

        # Generate MD5 hash
        signature = hashlib.md5(param_string.encode()).hexdigest()

        return signature

    def verify_signature(self, post_data: Dict[str, str]) -> bool:
        """
        Verify signature from PayFast webhook/ITN.

        Args:
            post_data: POST data from PayFast

        Returns:
            True if signature is valid, False otherwise
        """
        # Extract signature
        received_signature = post_data.get('signature', '')

        # Calculate expected signature
        data_without_signature = {k: v for k, v in post_data.items() if k != 'signature'}
        expected_signature = self.generate_signature(data_without_signature)

        return received_signature == expected_signature

    def verify_payment_amount(self, received_amount: float, expected_amount: float) -> bool:
        """
        Verify payment amount matches expected amount.

        Args:
            received_amount: Amount received from PayFast
            expected_amount: Expected subscription amount

        Returns:
            True if amounts match (within 1 cent tolerance)
        """
        return abs(received_amount - expected_amount) < 0.01

    @staticmethod
    def parse_webhook_data(post_data: Dict[str, str]) -> Dict:
        """
        Parse PayFast webhook/ITN data.

        Args:
            post_data: Raw POST data from PayFast

        Returns:
            Parsed webhook data
        """
        return {
            'payment_status': post_data.get('payment_status'),
            'item_name': post_data.get('item_name'),
            'item_description': post_data.get('item_description'),
            'amount_gross': float(post_data.get('amount_gross', 0)),
            'amount_fee': float(post_data.get('amount_fee', 0)),
            'amount_net': float(post_data.get('amount_net', 0)),
            'merchant_id': post_data.get('merchant_id'),
            'pf_payment_id': post_data.get('pf_payment_id'),
            'token': post_data.get('token'),  # Subscription token
            'billing_date': post_data.get('billing_date'),

            # Custom fields
            'org_id': int(post_data.get('custom_int1', 0)),
            'subscription_type': post_data.get('custom_str2', 'monthly'),
        }

    def get_payment_url(self) -> str:
        """Get PayFast payment URL (sandbox or production)."""
        return self.payment_url

    def cancel_subscription(self, token: str) -> bool:
        """
        Cancel a PayFast subscription.

        Note: PayFast doesn't provide API for cancellation.
        Users must cancel via PayFast dashboard or email support.

        Args:
            token: Subscription token from PayFast

        Returns:
            False (manual cancellation required)
        """
        # PayFast requires manual cancellation or email to support@payfast.co.za
        # For now, we just mark it as cancelled in our system
        return False  # Indicates manual action needed
