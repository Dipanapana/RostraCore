"""Trial management service for 14-day free trial automation."""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from app.models.organization import Organization, SubscriptionStatus
from app.services.email_service import EmailService
from app.config import settings

logger = logging.getLogger(__name__)


class TrialService:
    """
    Manages 14-day trial lifecycle for organizations.

    Key features:
    - Auto-set 14-day trial period on organization creation
    - Daily expiration checks via Celery Beat
    - Automated reminder emails (Day 7, 12, 14)
    - Graceful conversion to paid/suspended status
    """

    TRIAL_DURATION_DAYS = 14
    REMINDER_DAYS = [7, 12, 14]  # Days after trial start to send reminders

    @staticmethod
    def start_trial(db: Session, org_id: int) -> Dict:
        """
        Start 14-day trial for an organization.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            Dict with status and trial dates
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                logger.error(f"Organization {org_id} not found")
                return {
                    "status": "error",
                    "message": "Organization not found"
                }

            # Set trial dates
            now = datetime.utcnow()
            org.trial_start_date = now
            org.trial_end_date = now + timedelta(days=TrialService.TRIAL_DURATION_DAYS)
            org.subscription_status = SubscriptionStatus.TRIAL

            db.commit()
            db.refresh(org)

            logger.info(
                f"Trial started for org {org_id} ({org.company_name}): "
                f"{org.trial_start_date} to {org.trial_end_date}"
            )

            # Send welcome email with trial info
            TrialService._send_trial_started_email(org)

            return {
                "status": "success",
                "message": f"14-day trial started for {org.company_name}",
                "trial_start_date": org.trial_start_date.isoformat(),
                "trial_end_date": org.trial_end_date.isoformat()
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to start trial for org {org_id}: {e}")
            return {
                "status": "error",
                "message": f"Failed to start trial: {str(e)}"
            }

    @staticmethod
    def check_expired_trials(db: Session) -> Dict:
        """
        Check all active trials and suspend expired ones.

        Called daily by Celery Beat task.

        Args:
            db: Database session

        Returns:
            Dict with count of expired trials
        """
        try:
            now = datetime.utcnow()

            # Find all trials that have expired
            expired_orgs = db.query(Organization).filter(
                Organization.subscription_status == SubscriptionStatus.TRIAL,
                Organization.trial_end_date <= now
            ).all()

            expired_count = 0
            for org in expired_orgs:
                # Suspend the organization
                org.subscription_status = SubscriptionStatus.SUSPENDED
                expired_count += 1

                logger.warning(
                    f"Trial expired for org {org.org_id} ({org.company_name}). "
                    f"Status changed to SUSPENDED."
                )

                # Send trial expired email
                TrialService._send_trial_expired_email(org)

            if expired_count > 0:
                db.commit()
                logger.info(f"Suspended {expired_count} expired trials")

            return {
                "status": "success",
                "expired_count": expired_count,
                "message": f"Processed {expired_count} expired trials"
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to check expired trials: {e}")
            return {
                "status": "error",
                "message": f"Failed to check trials: {str(e)}"
            }

    @staticmethod
    def send_trial_reminders(db: Session) -> Dict:
        """
        Send reminder emails to organizations approaching trial expiration.

        Sends at Day 7, Day 12, and Day 14 (expiration day).

        Args:
            db: Database session

        Returns:
            Dict with count of reminders sent
        """
        try:
            now = datetime.utcnow()
            reminders_sent = 0

            # Get all active trial organizations
            trial_orgs = db.query(Organization).filter(
                Organization.subscription_status == SubscriptionStatus.TRIAL,
                Organization.trial_start_date.isnot(None),
                Organization.trial_end_date.isnot(None)
            ).all()

            for org in trial_orgs:
                days_elapsed = (now - org.trial_start_date).days
                days_remaining = (org.trial_end_date - now).days

                # Send reminder at specific milestones
                if days_elapsed in TrialService.REMINDER_DAYS:
                    TrialService._send_trial_reminder_email(org, days_remaining)
                    reminders_sent += 1
                    logger.info(
                        f"Sent trial reminder to org {org.org_id} ({org.company_name}): "
                        f"{days_remaining} days remaining"
                    )

            return {
                "status": "success",
                "reminders_sent": reminders_sent,
                "message": f"Sent {reminders_sent} trial reminders"
            }

        except Exception as e:
            logger.error(f"Failed to send trial reminders: {e}")
            return {
                "status": "error",
                "message": f"Failed to send reminders: {str(e)}"
            }

    @staticmethod
    def convert_to_paid(db: Session, org_id: int, subscription_tier: str = "professional") -> Dict:
        """
        Convert trial organization to paid subscription.

        Args:
            db: Database session
            org_id: Organization ID
            subscription_tier: Subscription tier (default: professional)

        Returns:
            Dict with status and subscription details
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                logger.error(f"Organization {org_id} not found")
                return {
                    "status": "error",
                    "message": "Organization not found"
                }

            # Update subscription status
            org.subscription_status = SubscriptionStatus.ACTIVE
            org.subscription_tier = subscription_tier

            db.commit()
            db.refresh(org)

            logger.info(
                f"Converted org {org_id} ({org.company_name}) from trial to "
                f"{subscription_tier} subscription"
            )

            # Send conversion success email
            TrialService._send_conversion_success_email(org)

            return {
                "status": "success",
                "message": f"Organization upgraded to {subscription_tier}",
                "subscription_tier": org.subscription_tier,
                "subscription_status": org.subscription_status
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to convert trial to paid for org {org_id}: {e}")
            return {
                "status": "error",
                "message": f"Failed to convert: {str(e)}"
            }

    @staticmethod
    def get_trial_status(db: Session, org_id: int) -> Optional[Dict]:
        """
        Get trial status for an organization.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            Dict with trial status info or None if not found
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                return None

            if org.subscription_status != SubscriptionStatus.TRIAL:
                return {
                    "is_trial": False,
                    "subscription_status": org.subscription_status,
                    "message": "Organization is not on trial"
                }

            if not org.trial_start_date or not org.trial_end_date:
                return {
                    "is_trial": True,
                    "error": "Trial dates not set",
                    "message": "Trial is active but dates are missing"
                }

            now = datetime.utcnow()
            days_remaining = (org.trial_end_date - now).days
            days_elapsed = (now - org.trial_start_date).days

            return {
                "is_trial": True,
                "trial_start_date": org.trial_start_date.isoformat(),
                "trial_end_date": org.trial_end_date.isoformat(),
                "days_elapsed": days_elapsed,
                "days_remaining": max(0, days_remaining),
                "is_expired": days_remaining < 0,
                "company_name": org.company_name
            }

        except Exception as e:
            logger.error(f"Failed to get trial status for org {org_id}: {e}")
            return None

    # ==================== Email Helper Methods ====================

    @staticmethod
    def _send_trial_started_email(org: Organization) -> None:
        """Send welcome email when trial starts."""
        # Get primary admin user for this organization
        admin_user = next((u for u in org.users if u.role_name == "org_admin"), None)
        if not admin_user or not admin_user.email:
            logger.warning(f"No admin email found for org {org.org_id}")
            return

        subject = f"Welcome to GuardianOS - Your 14-Day Trial Has Started!"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px;">
                    <h1>🚀 Welcome to GuardianOS!</h1>
                </div>
                <div style="padding: 30px;">
                    <h2>Your 14-Day Trial Has Started</h2>
                    <p>Hi {admin_user.full_name or "there"},</p>
                    <p>Your trial for <strong>{org.company_name}</strong> is now active! You have full access to all GuardianOS features for the next 14 days.</p>

                    <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Trial Period:</strong> {org.trial_start_date.strftime('%B %d, %Y')} - {org.trial_end_date.strftime('%B %d, %Y')}</p>
                    </div>

                    <h3>Get Started in 4 Easy Steps:</h3>
                    <ol>
                        <li><strong>Add Security Guards:</strong> Import your employee roster</li>
                        <li><strong>Set Up Client Sites:</strong> Define your coverage locations</li>
                        <li><strong>Configure Shifts:</strong> Create shift templates</li>
                        <li><strong>Generate Your First Roster:</strong> Let our AI optimize your schedule!</li>
                    </ol>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Go to Dashboard</a>
                    </div>

                    <p>Questions? Email us at <a href="mailto:hello@guardianos.co.za">hello@guardianos.co.za</a></p>
                </div>
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #E5E7EB;">
                    <p>© 2025 GuardianOS (Pty) Ltd. AI-Powered Security Workforce Management</p>
                </div>
            </div>
        </body>
        </html>
        """

        EmailService.send_email(
            to=admin_user.email,
            subject=subject,
            html_content=html_content
        )

    @staticmethod
    def _send_trial_reminder_email(org: Organization, days_remaining: int) -> None:
        """Send reminder email as trial approaches expiration."""
        admin_user = next((u for u in org.users if u.role_name == "org_admin"), None)
        if not admin_user or not admin_user.email:
            return

        subject = f"Your GuardianOS Trial Expires in {days_remaining} Days"

        urgency_color = "#F59E0B" if days_remaining > 2 else "#EF4444"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: {urgency_color}; color: white; padding: 30px; text-align: center; border-radius: 8px;">
                    <h1>⏰ Trial Ending Soon</h1>
                    <h2 style="margin: 10px 0;">{days_remaining} Days Remaining</h2>
                </div>
                <div style="padding: 30px;">
                    <p>Hi {admin_user.full_name or "there"},</p>
                    <p>Your 14-day trial for <strong>{org.company_name}</strong> will expire on <strong>{org.trial_end_date.strftime('%B %d, %Y')}</strong>.</p>

                    <h3>Don't lose access to:</h3>
                    <ul>
                        <li>✅ AI-powered roster optimization</li>
                        <li>✅ BCEA & PSIRA compliance automation</li>
                        <li>✅ Real-time GPS guard tracking</li>
                        <li>✅ Per-guard billing (only R45/guard/month)</li>
                        <li>✅ Mobile app for guards & supervisors</li>
                    </ul>

                    <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Special Offer:</strong> Upgrade now and get your first month at 20% off!</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}/billing/upgrade" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Upgrade Now</a>
                    </div>

                    <p>Questions? Email us at <a href="mailto:hello@guardianos.co.za">hello@guardianos.co.za</a></p>
                </div>
            </div>
        </body>
        </html>
        """

        EmailService.send_email(
            to=admin_user.email,
            subject=subject,
            html_content=html_content
        )

    @staticmethod
    def _send_trial_expired_email(org: Organization) -> None:
        """Send email when trial has expired."""
        admin_user = next((u for u in org.users if u.role_name == "org_admin"), None)
        if not admin_user or not admin_user.email:
            return

        subject = "Your GuardianOS Trial Has Expired"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #EF4444; color: white; padding: 30px; text-align: center; border-radius: 8px;">
                    <h1>Trial Expired</h1>
                </div>
                <div style="padding: 30px;">
                    <p>Hi {admin_user.full_name or "there"},</p>
                    <p>Your 14-day trial for <strong>{org.company_name}</strong> has expired.</p>

                    <p>Your account is now <strong>suspended</strong>, but all your data is safe. Upgrade now to restore full access!</p>

                    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Limited Time:</strong> Upgrade within 7 days to keep your 20% discount!</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}/billing/upgrade" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Restore Access Now</a>
                    </div>

                    <p>Need more time to decide? Contact us at <a href="mailto:hello@guardianos.co.za">hello@guardianos.co.za</a></p>
                </div>
            </div>
        </body>
        </html>
        """

        EmailService.send_email(
            to=admin_user.email,
            subject=subject,
            html_content=html_content
        )

    @staticmethod
    def _send_conversion_success_email(org: Organization) -> None:
        """Send email when trial is successfully converted to paid."""
        admin_user = next((u for u in org.users if u.role_name == "org_admin"), None)
        if not admin_user or not admin_user.email:
            return

        subject = "Welcome to GuardianOS - Subscription Activated!"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px;">
                    <h1>🎉 Welcome Aboard!</h1>
                </div>
                <div style="padding: 30px;">
                    <p>Hi {admin_user.full_name or "there"},</p>
                    <p>Thank you for upgrading <strong>{org.company_name}</strong> to a paid GuardianOS subscription!</p>

                    <p>You now have unlimited access to all features:</p>
                    <ul>
                        <li>✅ Unlimited roster generation</li>
                        <li>✅ Advanced AI optimization algorithms</li>
                        <li>✅ Mobile app for all guards</li>
                        <li>✅ Priority support</li>
                        <li>✅ Monthly invoicing & billing portal</li>
                    </ul>

                    <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Billing:</strong> You'll be charged R45 per active guard per month. Your first invoice will arrive at the end of this billing cycle.</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}/billing" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">View Billing Dashboard</a>
                    </div>

                    <p>Questions? Email us at <a href="mailto:hello@guardianos.co.za">hello@guardianos.co.za</a></p>
                </div>
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #E5E7EB;">
                    <p>© 2025 GuardianOS (Pty) Ltd.</p>
                </div>
            </div>
        </body>
        </html>
        """

        EmailService.send_email(
            to=admin_user.email,
            subject=subject,
            html_content=html_content
        )
