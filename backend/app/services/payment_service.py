"""Payment Service - PayFast integration for South African payments."""

import hashlib
import urllib.parse
from typing import Dict, Any, Optional
from datetime import datetime
import hmac
import requests
from sqlalchemy.orm import Session


class PayFastService:
    """
    PayFast Payment Gateway Integration for South Africa.

    Docs: https://developers.payfast.co.za/docs
    """

    def __init__(self, merchant_id: str, merchant_key: str, passphrase: str, sandbox: bool = True):
        self.merchant_id = merchant_id
        self.merchant_key = merchant_key
        self.passphrase = passphrase
        self.sandbox = sandbox

        # URLs
        if sandbox:
            self.process_url = "https://sandbox.payfast.co.za/eng/process"
            self.validate_url = "https://sandbox.payfast.co.za/eng/query/validate"
        else:
            self.process_url = "https://www.payfast.co.za/eng/process"
            self.validate_url = "https://www.payfast.co.za/eng/query/validate"

    def generate_signature(self, data: Dict[str, Any]) -> str:
        """
        Generate PayFast signature for payment verification.

        Args:
            data: Payment data dictionary

        Returns:
            MD5 signature string
        """
        # Create parameter string
        params = []
        for key in sorted(data.keys()):
            if key != 'signature':
                value = str(data[key]).strip()
                if value:
                    params.append(f"{key}={urllib.parse.quote_plus(value)}")

        param_string = '&'.join(params)

        # Add passphrase if provided
        if self.passphrase:
            param_string += f"&passphrase={urllib.parse.quote_plus(self.passphrase)}"

        # Generate MD5 signature
        signature = hashlib.md5(param_string.encode()).hexdigest()
        return signature

    def create_payment(
        self,
        amount: float,
        item_name: str,
        item_description: str,
        buyer_email: str,
        buyer_name: str,
        payment_id: int,
        return_url: str,
        cancel_url: str,
        notify_url: str
    ) -> Dict[str, Any]:
        """
        Create PayFast payment request.

        Args:
            amount: Payment amount in ZAR
            item_name: Name of item being purchased
            item_description: Description of item
            buyer_email: Buyer's email address
            buyer_name: Buyer's full name
            payment_id: Unique payment ID from your system
            return_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment cancelled
            notify_url: URL for PayFast to send IPN notifications

        Returns:
            Dictionary with payment URL and data
        """
        # Build payment data
        data = {
            'merchant_id': self.merchant_id,
            'merchant_key': self.merchant_key,
            'return_url': return_url,
            'cancel_url': cancel_url,
            'notify_url': notify_url,
            'name_first': buyer_name.split()[0] if ' ' in buyer_name else buyer_name,
            'name_last': buyer_name.split()[-1] if ' ' in buyer_name else '',
            'email_address': buyer_email,
            'amount': f"{amount:.2f}",
            'item_name': item_name,
            'item_description': item_description,
            'm_payment_id': str(payment_id),  # Your unique payment ID
        }

        # Generate signature
        data['signature'] = self.generate_signature(data)

        return {
            'payment_url': self.process_url,
            'payment_data': data
        }

    def verify_payment(self, post_data: Dict[str, Any]) -> bool:
        """
        Verify PayFast IPN (Instant Payment Notification).

        Args:
            post_data: POST data received from PayFast IPN

        Returns:
            True if payment is valid, False otherwise
        """
        # Get signature from data
        received_signature = post_data.get('signature', '')

        # Generate our own signature
        calculated_signature = self.generate_signature(post_data)

        # Compare signatures
        if received_signature != calculated_signature:
            return False

        # Verify with PayFast server
        try:
            # Send validation request to PayFast
            headers = {'Content-Type': 'application/x-www-form-urlencoded'}
            response = requests.post(
                self.validate_url,
                data=post_data,
                headers=headers,
                timeout=10
            )

            # Check response
            if response.text == 'VALID':
                return True
            else:
                return False

        except Exception as e:
            print(f"PayFast verification error: {e}")
            return False

    def check_payment_status(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """
        Check payment status with PayFast.

        Args:
            payment_id: PayFast payment ID (pf_payment_id from IPN)

        Returns:
            Payment status dictionary or None
        """
        try:
            url = f"https://api.payfast.co.za/subscriptions/{payment_id}/fetch"
            headers = {
                'merchant-id': self.merchant_id,
                'version': 'v1',
                'timestamp': datetime.utcnow().isoformat()
            }

            # Generate signature for API call
            signature_data = ''.join([
                headers['merchant-id'],
                headers['timestamp']
            ])
            signature = hashlib.md5(signature_data.encode()).hexdigest()
            headers['signature'] = signature

            response = requests.get(url, headers=headers, timeout=10)

            if response.status_code == 200:
                return response.json()
            else:
                return None

        except Exception as e:
            print(f"PayFast status check error: {e}")
            return None


class PaymentService:
    """
    Payment service for South African payments via PayFast.
    """

    def __init__(self, db: Session):
        self.db = db

        # Initialize PayFast (South Africa)
        # In production, load from environment variables
        self.payfast = PayFastService(
            merchant_id="10000100",  # Sandbox merchant ID
            merchant_key="46f0cd694581a",  # Sandbox merchant key
            passphrase="jt7NOE43FZPn",  # Your passphrase
            sandbox=True  # Set to False in production
        )

    def create_cv_payment(
        self,
        applicant_id: int,
        purchase_id: int,
        buyer_email: str,
        buyer_name: str
    ) -> Dict[str, Any]:
        """
        Create PayFast payment for CV generation service.

        Args:
            applicant_id: Guard applicant ID
            purchase_id: CV purchase ID
            buyer_email: Buyer email
            buyer_name: Buyer full name

        Returns:
            Payment details dictionary (PayFast form data)
        """
        amount = 60.00  # R60 for CV service

        return self.payfast.create_payment(
            amount=amount,
            item_name="Professional CV Generation Service",
            item_description="PSIRA-focused CV with 5 professional templates",
            buyer_email=buyer_email,
            buyer_name=buyer_name,
            payment_id=purchase_id,
            return_url=f"http://localhost:3000/marketplace/cv-templates?payment=success&purchase_id={purchase_id}",
            cancel_url=f"http://localhost:3000/marketplace/cv-templates?payment=cancelled",
            notify_url="http://localhost:8000/api/v1/payments/payfast/webhook"
        )
