"""Payment Service - Handle PayFast and Stripe integrations."""

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


class StripeService:
    """
    Stripe Payment Gateway Integration (for international payments).

    Docs: https://stripe.com/docs/api
    """

    def __init__(self, api_key: str, webhook_secret: str):
        self.api_key = api_key
        self.webhook_secret = webhook_secret
        self.base_url = "https://api.stripe.com/v1"

    def create_payment_intent(
        self,
        amount: int,  # Amount in cents (e.g., 6000 = R60.00)
        currency: str,
        description: str,
        customer_email: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create Stripe Payment Intent.

        Args:
            amount: Amount in cents (smallest currency unit)
            currency: Currency code (e.g., 'zar', 'usd')
            description: Payment description
            customer_email: Customer email
            metadata: Additional metadata (payment_id, applicant_id, etc.)

        Returns:
            Payment intent dictionary with client_secret
        """
        try:
            import stripe
            stripe.api_key = self.api_key

            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                description=description,
                receipt_email=customer_email,
                metadata=metadata,
                automatic_payment_methods={
                    'enabled': True,
                }
            )

            return {
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'amount': intent.amount,
                'currency': intent.currency,
                'status': intent.status
            }

        except Exception as e:
            print(f"Stripe payment intent error: {e}")
            raise

    def verify_webhook(self, payload: bytes, signature: str) -> Optional[Dict[str, Any]]:
        """
        Verify Stripe webhook signature.

        Args:
            payload: Raw request body bytes
            signature: Stripe signature header

        Returns:
            Event dictionary if valid, None otherwise
        """
        try:
            import stripe
            stripe.api_key = self.api_key

            event = stripe.Webhook.construct_event(
                payload,
                signature,
                self.webhook_secret
            )

            return event

        except ValueError as e:
            # Invalid payload
            print(f"Invalid Stripe payload: {e}")
            return None
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            print(f"Invalid Stripe signature: {e}")
            return None

    def get_payment_status(self, payment_intent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get Stripe payment intent status.

        Args:
            payment_intent_id: Stripe payment intent ID

        Returns:
            Payment intent dictionary or None
        """
        try:
            import stripe
            stripe.api_key = self.api_key

            intent = stripe.PaymentIntent.retrieve(payment_intent_id)

            return {
                'id': intent.id,
                'status': intent.status,
                'amount': intent.amount,
                'currency': intent.currency,
                'metadata': intent.metadata
            }

        except Exception as e:
            print(f"Stripe status check error: {e}")
            return None


class PaymentService:
    """
    Unified payment service supporting multiple gateways.
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

        # Initialize Stripe (International)
        # In production, load from environment variables
        self.stripe = StripeService(
            api_key="sk_test_your_stripe_key",  # Replace with actual key
            webhook_secret="whsec_your_webhook_secret"  # Replace with actual secret
        )

    def create_cv_payment(
        self,
        applicant_id: int,
        purchase_id: int,
        buyer_email: str,
        buyer_name: str,
        gateway: str = "payfast"
    ) -> Dict[str, Any]:
        """
        Create payment for CV generation service.

        Args:
            applicant_id: Guard applicant ID
            purchase_id: CV purchase ID
            buyer_email: Buyer email
            buyer_name: Buyer full name
            gateway: Payment gateway ('payfast' or 'stripe')

        Returns:
            Payment details dictionary
        """
        amount = 60.00  # R60 for CV service

        if gateway == "payfast":
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

        elif gateway == "stripe":
            return self.stripe.create_payment_intent(
                amount=int(amount * 100),  # Convert to cents
                currency="zar",
                description="Professional CV Generation Service",
                customer_email=buyer_email,
                metadata={
                    'applicant_id': str(applicant_id),
                    'purchase_id': str(purchase_id),
                    'service': 'cv_generation'
                }
            )

        else:
            raise ValueError(f"Unsupported payment gateway: {gateway}")
