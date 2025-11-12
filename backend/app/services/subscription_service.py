"""Subscription service for PayFast recurring billing."""
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.models.organization import Organization, SubscriptionStatus
from app.services.payment_service import PaymentService
from app.services.billing_service import BillingService
from app.services.email_service import EmailService
from app.config import settings

logger = logging.getLogger(__name__)


class SubscriptionService:
    """
    Manages PayFast recurring subscriptions for per-guard billing.

    Integration: PayFast Subscriptions API
    Billing: Monthly recurring based on active guard count
    """

    @staticmethod
    def create_subscription(
        db: Session,
        org_id: int,
        billing_contact_name: str,
        billing_email: str
    ) -> Dict:
        """
        Create PayFast recurring subscription for organization.

        Args:
            db: Database session
            org_id: Organization ID
            billing_contact_name: Name of billing contact
            billing_email: Billing email address

        Returns:
            Dict with PayFast payment form data
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                logger.error(f"Organization {org_id} not found")
                return {
                    "status": "error",
                    "message": "Organization not found"
                }

            # Calculate initial billing amount
            billing = BillingService.calculate_monthly_cost(db, org_id)

            if billing["status"] != "success":
                return billing

            initial_amount = billing["monthly_cost"]

            # Set next billing date (30 days from now)
            next_billing_date = datetime.utcnow() + timedelta(days=30)

            # Initialize PayFast
            payment_service = PaymentService(db)

            # Create subscription
            subscription_data = payment_service.payfast.create_subscription(
                amount=initial_amount,
                subscription_name=f"GuardianOS - {org.company_name}",
                billing_date=next_billing_date.strftime("%Y-%m-%d"),
                recurring_amount=initial_amount,
                frequency=3,  # 3 = monthly
                cycles=0,  # 0 = indefinite (until cancelled)
                buyer_email=billing_email,
                buyer_name=billing_contact_name,
                subscription_id=org_id,
                return_url=f"{settings.FRONTEND_URL}/billing/subscription-success?org_id={org_id}",
                cancel_url=f"{settings.FRONTEND_URL}/billing/subscription-cancelled?org_id={org_id}",
                notify_url=f"{settings.API_URL}/api/v1/subscriptions/payfast/webhook"
            )

            # Update organization
            org.billing_email = billing_email
            org.subscription_next_billing_date = next_billing_date

            db.commit()
            db.refresh(org)

            logger.info(
                f"Subscription created for org {org_id} ({org.company_name}): "
                f"R{initial_amount}/month for {billing['active_guards']} guards"
            )

            return {
                "status": "success",
                "payment_url": subscription_data["payment_url"],
                "payment_data": subscription_data["payment_data"],
                "subscription": {
                    "initial_amount": float(initial_amount),
                    "recurring_amount": float(initial_amount),
                    "active_guards": billing["active_guards"],
                    "next_billing_date": next_billing_date.isoformat()
                }
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create subscription for org {org_id}: {e}")
            return {
                "status": "error",
                "message": f"Failed to create subscription: {str(e)}"
            }

    @staticmethod
    def activate_subscription(
        db: Session,
        org_id: int,
        subscription_token: str,
        payment_method_last_four: Optional[str] = None
    ) -> Dict:
        """
        Activate subscription after successful PayFast payment.

        Args:
            db: Database session
            org_id: Organization ID
            subscription_token: PayFast subscription token
            payment_method_last_four: Last 4 digits of payment method

        Returns:
            Dict with activation status
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                return {"status": "error", "message": "Organization not found"}

            # Update organization
            org.payfast_subscription_token = subscription_token
            org.payfast_subscription_status = "active"
            org.subscription_status = SubscriptionStatus.ACTIVE
            org.subscription_started_at = datetime.utcnow()
            org.payment_method_last_four = payment_method_last_four
            org.payment_failures = 0

            db.commit()
            db.refresh(org)

            logger.info(f"Subscription activated for org {org_id} ({org.company_name})")

            # Send confirmation email
            SubscriptionService._send_subscription_activated_email(org)

            return {
                "status": "success",
                "message": "Subscription activated successfully",
                "subscription": {
                    "org_id": org.org_id,
                    "status": org.payfast_subscription_status,
                    "started_at": org.subscription_started_at.isoformat(),
                    "next_billing_date": org.subscription_next_billing_date.isoformat() if org.subscription_next_billing_date else None
                }
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to activate subscription for org {org_id}: {e}")
            return {
                "status": "error",
                "message": f"Failed to activate subscription: {str(e)}"
            }

    @staticmethod
    def pause_subscription(db: Session, org_id: int) -> Dict:
        """
        Pause PayFast subscription.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            Dict with pause status
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                return {"status": "error", "message": "Organization not found"}

            if not org.payfast_subscription_token:
                return {"status": "error", "message": "No active subscription found"}

            # Pause via PayFast API
            payment_service = PaymentService(db)
            success = payment_service.payfast.pause_subscription(org.payfast_subscription_token)

            if success:
                org.payfast_subscription_status = "paused"
                org.subscription_status = SubscriptionStatus.SUSPENDED
                db.commit()

                logger.info(f"Subscription paused for org {org_id}")

                return {
                    "status": "success",
                    "message": "Subscription paused successfully"
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to pause subscription with PayFast"
                }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to pause subscription for org {org_id}: {e}")
            return {
                "status": "error",
                "message": f"Failed to pause subscription: {str(e)}"
            }

    @staticmethod
    def unpause_subscription(db: Session, org_id: int) -> Dict:
        """
        Unpause PayFast subscription.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            Dict with unpause status
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                return {"status": "error", "message": "Organization not found"}

            if not org.payfast_subscription_token:
                return {"status": "error", "message": "No active subscription found"}

            # Unpause via PayFast API
            payment_service = PaymentService(db)
            success = payment_service.payfast.unpause_subscription(org.payfast_subscription_token)

            if success:
                org.payfast_subscription_status = "active"
                org.subscription_status = SubscriptionStatus.ACTIVE
                db.commit()

                logger.info(f"Subscription unpaused for org {org_id}")

                return {
                    "status": "success",
                    "message": "Subscription resumed successfully"
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to resume subscription with PayFast"
                }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to unpause subscription for org {org_id}: {e}")
            return {
                "status": "error",
                "message": f"Failed to resume subscription: {str(e)}"
            }

    @staticmethod
    def cancel_subscription(db: Session, org_id: int) -> Dict:
        """
        Cancel PayFast subscription.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            Dict with cancellation status
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                return {"status": "error", "message": "Organization not found"}

            if not org.payfast_subscription_token:
                return {"status": "error", "message": "No active subscription found"}

            # Cancel via PayFast API
            payment_service = PaymentService(db)
            success = payment_service.payfast.cancel_subscription(org.payfast_subscription_token)

            if success:
                org.payfast_subscription_status = "cancelled"
                org.subscription_status = SubscriptionStatus.CANCELLED
                db.commit()

                logger.info(f"Subscription cancelled for org {org_id}")

                # Send cancellation email
                SubscriptionService._send_subscription_cancelled_email(org)

                return {
                    "status": "success",
                    "message": "Subscription cancelled successfully"
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to cancel subscription with PayFast"
                }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to cancel subscription for org {org_id}: {e}")
            return {
                "status": "error",
                "message": f"Failed to cancel subscription: {str(e)}"
            }

    @staticmethod
    def get_subscription_status(db: Session, org_id: int) -> Optional[Dict]:
        """
        Get subscription status for organization.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            Dict with subscription details or None
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                return None

            # Get billing info
            billing_summary = BillingService.get_billing_summary(db, org_id)

            subscription_info = {
                "org_id": org.org_id,
                "company_name": org.company_name,
                "subscription_status": org.subscription_status,
                "payfast_status": org.payfast_subscription_status,
                "has_active_subscription": org.payfast_subscription_token is not None,
                "subscription_token": org.payfast_subscription_token,
                "started_at": org.subscription_started_at.isoformat() if org.subscription_started_at else None,
                "next_billing_date": org.subscription_next_billing_date.isoformat() if org.subscription_next_billing_date else None,
                "payment_method_last_four": org.payment_method_last_four,
                "payment_failures": org.payment_failures,
                "billing": billing_summary["billing"] if billing_summary else None
            }

            # Fetch live status from PayFast if token exists
            if org.payfast_subscription_token:
                payment_service = PaymentService(db)
                payfast_details = payment_service.payfast.fetch_subscription(org.payfast_subscription_token)

                if payfast_details:
                    subscription_info["payfast_details"] = payfast_details

            return subscription_info

        except Exception as e:
            logger.error(f"Failed to get subscription status for org {org_id}: {e}")
            return None

    @staticmethod
    def handle_payment_failure(db: Session, org_id: int) -> Dict:
        """
        Handle failed subscription payment.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            Dict with handling status
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                return {"status": "error", "message": "Organization not found"}

            org.payment_failures += 1
            db.commit()

            logger.warning(
                f"Payment failure #{org.payment_failures} for org {org_id} ({org.company_name})"
            )

            # Suspend after 3 consecutive failures
            if org.payment_failures >= 3:
                org.subscription_status = SubscriptionStatus.SUSPENDED
                org.payfast_subscription_status = "paused"
                db.commit()

                logger.error(f"Organization {org_id} suspended due to payment failures")

                # Send suspension email
                SubscriptionService._send_payment_failure_email(org, suspended=True)

                return {
                    "status": "suspended",
                    "message": "Organization suspended due to payment failures"
                }
            else:
                # Send payment failure email
                SubscriptionService._send_payment_failure_email(org, suspended=False)

                return {
                    "status": "failure_recorded",
                    "failures": org.payment_failures
                }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to handle payment failure for org {org_id}: {e}")
            return {
                "status": "error",
                "message": f"Failed to handle payment failure: {str(e)}"
            }

    # ==================== Email Helper Methods ====================

    @staticmethod
    def _send_subscription_activated_email(org: Organization) -> None:
        """Send subscription activation email."""
        if not org.billing_email:
            logger.warning(f"No billing email for org {org.org_id}")
            return

        subject = "GuardianOS Subscription Activated"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1>GuardianOS</h1>
                    <h2>Subscription Activated!</h2>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                    <p>Hi {org.company_name},</p>

                    <p>Your GuardianOS subscription is now active!</p>

                    <div style="background: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Subscription Details:</strong></p>
                        <p style="margin: 5px 0;">Active Guards: {org.active_guard_count}</p>
                        <p style="margin: 5px 0;">Monthly Cost: R{float(org.current_month_cost):.2f}</p>
                        <p style="margin: 5px 0;">Next Billing: {org.subscription_next_billing_date.strftime('%B %d, %Y') if org.subscription_next_billing_date else 'N/A'}</p>
                        <p style="margin: 5px 0;">Payment Method: •••• {org.payment_method_last_four or 'N/A'}</p>
                    </div>

                    <p>Your monthly billing is based on active guards (R45/guard/month). As you add or remove guards, your billing will adjust automatically.</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}/billing" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">View Billing Dashboard</a>
                    </div>

                    <p style="font-size: 12px; color: #666; margin-top: 30px;">
                        Questions? Contact us at billing@guardianos.co.za
                    </p>
                </div>
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #E5E7EB;">
                    <p>© 2025 GuardianOS (Pty) Ltd. AI-Powered Security Workforce Management</p>
                </div>
            </div>
        </body>
        </html>
        """

        EmailService.send_email(
            to=org.billing_email,
            subject=subject,
            html_content=html_content
        )

        logger.info(f"Subscription activated email sent to {org.billing_email}")

    @staticmethod
    def _send_subscription_cancelled_email(org: Organization) -> None:
        """Send subscription cancellation email."""
        if not org.billing_email:
            return

        subject = "GuardianOS Subscription Cancelled"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1>GuardianOS</h1>
                    <h2>Subscription Cancelled</h2>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                    <p>Hi {org.company_name},</p>

                    <p>Your GuardianOS subscription has been cancelled.</p>

                    <p>We're sorry to see you go. If you change your mind, you can reactivate your subscription anytime.</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}/billing/reactivate" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Reactivate Subscription</a>
                    </div>

                    <p style="font-size: 12px; color: #666; margin-top: 30px;">
                        Questions? Contact us at support@guardianos.co.za
                    </p>
                </div>
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #E5E7EB;">
                    <p>© 2025 GuardianOS (Pty) Ltd. AI-Powered Security Workforce Management</p>
                </div>
            </div>
        </body>
        </html>
        """

        EmailService.send_email(
            to=org.billing_email,
            subject=subject,
            html_content=html_content
        )

    @staticmethod
    def _send_payment_failure_email(org: Organization, suspended: bool = False) -> None:
        """Send payment failure email."""
        if not org.billing_email:
            return

        if suspended:
            subject = "GuardianOS Account Suspended - Payment Failed"
            title = "Account Suspended"
            message = f"We've attempted to charge your subscription {org.payment_failures} times, but payment has failed. Your account has been suspended."
        else:
            subject = "GuardianOS Payment Failed"
            title = "Payment Failed"
            message = f"We were unable to process your most recent payment (attempt {org.payment_failures}/3). Please update your payment method."

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1>GuardianOS</h1>
                    <h2>{title}</h2>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                    <p>Hi {org.company_name},</p>

                    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Action Required</strong></p>
                        <p style="margin: 10px 0 0 0;">{message}</p>
                    </div>

                    <p>Amount Due: R{float(org.current_month_cost):.2f}</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}/billing/update-payment" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Update Payment Method</a>
                    </div>

                    <p style="font-size: 12px; color: #666; margin-top: 30px;">
                        Questions? Contact us at billing@guardianos.co.za
                    </p>
                </div>
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #E5E7EB;">
                    <p>© 2025 GuardianOS (Pty) Ltd. AI-Powered Security Workforce Management</p>
                </div>
            </div>
        </body>
        </html>
        """

        EmailService.send_email(
            to=org.billing_email,
            subject=subject,
            html_content=html_content
        )
