"""Billing service for per-guard subscription billing (R45/guard/month)."""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.organization import Organization, SubscriptionStatus
from app.models.employee import Employee
from app.services.email_service import EmailService
from app.config import settings

logger = logging.getLogger(__name__)


class BillingService:
    """
    Manages per-guard billing for GuardianOS.

    Pricing: R45 per active guard per month
    Billing Cycle: Monthly, on the anniversary of subscription start
    Payment: Via PayFast recurring billing
    """

    PRICE_PER_GUARD_PER_MONTH = 45.00  # R45

    @staticmethod
    def calculate_monthly_cost(db: Session, org_id: int) -> Dict:
        """
        Calculate monthly cost for an organization based on active guards.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            Dict with guard count, cost breakdown, and total
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                logger.error(f"Organization {org_id} not found")
                return {
                    "status": "error",
                    "message": "Organization not found"
                }

            # Count active guards (employees with role 'guard' and is_active=True)
            active_guards_count = db.query(Employee).filter(
                Employee.organization_id == org_id,
                Employee.role_name == "guard",
                Employee.is_active == True
            ).count()

            # Calculate cost
            monthly_cost = active_guards_count * BillingService.PRICE_PER_GUARD_PER_MONTH

            # Update organization record
            org.active_guard_count = active_guards_count
            org.current_month_cost = monthly_cost
            org.last_billing_calculation = datetime.utcnow()

            db.commit()
            db.refresh(org)

            logger.info(
                f"Billing calculated for org {org_id} ({org.company_name}): "
                f"{active_guards_count} guards × R{BillingService.PRICE_PER_GUARD_PER_MONTH} = R{monthly_cost}"
            )

            return {
                "status": "success",
                "organization": org.company_name,
                "active_guards": active_guards_count,
                "price_per_guard": BillingService.PRICE_PER_GUARD_PER_MONTH,
                "monthly_cost": float(monthly_cost),
                "billing_date": org.last_billing_calculation.isoformat()
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to calculate billing for org {org_id}: {e}")
            return {
                "status": "error",
                "message": f"Failed to calculate billing: {str(e)}"
            }

    @staticmethod
    def get_billing_summary(db: Session, org_id: int) -> Optional[Dict]:
        """
        Get current billing summary for an organization.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            Dict with billing information or None if not found
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                return None

            # Get guard details
            guards = db.query(Employee).filter(
                Employee.organization_id == org_id,
                Employee.role_name == "guard",
                Employee.is_active == True
            ).all()

            guard_list = [
                {
                    "employee_id": g.employee_id,
                    "full_name": g.full_name,
                    "psira_number": g.psira_number
                }
                for g in guards
            ]

            return {
                "organization": {
                    "org_id": org.org_id,
                    "company_name": org.company_name,
                    "subscription_status": org.subscription_status,
                    "subscription_tier": org.subscription_tier
                },
                "billing": {
                    "active_guards": org.active_guard_count,
                    "price_per_guard": float(org.monthly_rate_per_guard),
                    "monthly_cost": float(org.current_month_cost),
                    "last_calculated": org.last_billing_calculation.isoformat() if org.last_billing_calculation else None
                },
                "guards": guard_list
            }

        except Exception as e:
            logger.error(f"Failed to get billing summary for org {org_id}: {e}")
            return None

    @staticmethod
    def calculate_all_organizations(db: Session) -> Dict:
        """
        Calculate billing for all active organizations.

        Called monthly by Celery Beat task.

        Args:
            db: Database session

        Returns:
            Dict with count of organizations billed
        """
        try:
            # Get all active (non-trial, non-suspended) organizations
            active_orgs = db.query(Organization).filter(
                Organization.subscription_status == SubscriptionStatus.ACTIVE,
                Organization.is_active == True
            ).all()

            billed_count = 0
            total_revenue = 0.0
            results = []

            for org in active_orgs:
                result = BillingService.calculate_monthly_cost(db, org.org_id)

                if result["status"] == "success":
                    billed_count += 1
                    total_revenue += result["monthly_cost"]
                    results.append({
                        "org_id": org.org_id,
                        "company_name": org.company_name,
                        "guards": result["active_guards"],
                        "cost": result["monthly_cost"]
                    })

            logger.info(
                f"Monthly billing calculated for {billed_count} organizations. "
                f"Total revenue: R{total_revenue:.2f}"
            )

            return {
                "status": "success",
                "organizations_billed": billed_count,
                "total_revenue": total_revenue,
                "billing_date": datetime.utcnow().isoformat(),
                "results": results
            }

        except Exception as e:
            logger.error(f"Failed to calculate billing for all organizations: {e}")
            return {
                "status": "error",
                "message": f"Failed to calculate billing: {str(e)}"
            }

    @staticmethod
    def generate_invoice(db: Session, org_id: int, month: Optional[datetime] = None) -> Dict:
        """
        Generate invoice for an organization for a specific month.

        Args:
            db: Database session
            org_id: Organization ID
            month: Month to invoice (defaults to current month)

        Returns:
            Dict with invoice details
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                logger.error(f"Organization {org_id} not found")
                return {
                    "status": "error",
                    "message": "Organization not found"
                }

            if month is None:
                month = datetime.utcnow()

            # Calculate current billing
            billing = BillingService.calculate_monthly_cost(db, org_id)

            if billing["status"] != "success":
                return billing

            # Generate invoice number
            invoice_number = f"INV-{org_id}-{month.strftime('%Y%m')}"
            invoice_date = datetime.utcnow()
            due_date = invoice_date + timedelta(days=7)  # 7 days payment term

            invoice = {
                "invoice_number": invoice_number,
                "invoice_date": invoice_date.isoformat(),
                "due_date": due_date.isoformat(),
                "organization": {
                    "org_id": org.org_id,
                    "company_name": org.company_name,
                    "billing_email": org.billing_email
                },
                "billing_period": {
                    "month": month.strftime("%B %Y"),
                    "start_date": month.replace(day=1).isoformat(),
                    "end_date": (month.replace(day=1) + timedelta(days=32)).replace(day=1).isoformat()
                },
                "line_items": [
                    {
                        "description": f"Security Guard Management - {billing['active_guards']} active guards",
                        "quantity": billing["active_guards"],
                        "unit_price": billing["price_per_guard"],
                        "amount": billing["monthly_cost"]
                    }
                ],
                "subtotal": billing["monthly_cost"],
                "vat": billing["monthly_cost"] * 0.15,  # 15% VAT
                "total": billing["monthly_cost"] * 1.15,
                "currency": "ZAR"
            }

            logger.info(
                f"Invoice {invoice_number} generated for {org.company_name}: R{invoice['total']:.2f}"
            )

            # Send invoice email
            if org.billing_email:
                BillingService._send_invoice_email(org, invoice)

            return {
                "status": "success",
                "invoice": invoice
            }

        except Exception as e:
            logger.error(f"Failed to generate invoice for org {org_id}: {e}")
            return {
                "status": "error",
                "message": f"Failed to generate invoice: {str(e)}"
            }

    @staticmethod
    def check_payment_status(db: Session, org_id: int) -> Optional[Dict]:
        """
        Check payment status for an organization.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            Dict with payment status info
        """
        try:
            org = db.query(Organization).filter(Organization.org_id == org_id).first()

            if not org:
                return None

            # Check if organization has active subscription
            is_paid = org.subscription_status == SubscriptionStatus.ACTIVE

            # Check if payment is overdue (simplified - would integrate with PayFast)
            payment_overdue = False
            if org.last_billing_calculation:
                days_since_billing = (datetime.utcnow() - org.last_billing_calculation).days
                payment_overdue = days_since_billing > 7 and not is_paid

            return {
                "org_id": org.org_id,
                "company_name": org.company_name,
                "subscription_status": org.subscription_status,
                "is_paid": is_paid,
                "payment_overdue": payment_overdue,
                "current_month_cost": float(org.current_month_cost),
                "active_guards": org.active_guard_count,
                "last_billing_date": org.last_billing_calculation.isoformat() if org.last_billing_calculation else None
            }

        except Exception as e:
            logger.error(f"Failed to check payment status for org {org_id}: {e}")
            return None

    # ==================== Email Helper Methods ====================

    @staticmethod
    def _send_invoice_email(org: Organization, invoice: Dict) -> None:
        """Send invoice email to organization."""
        if not org.billing_email:
            logger.warning(f"No billing email for org {org.org_id}")
            return

        subject = f"GuardianOS Invoice - {invoice['invoice_number']}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1>GuardianOS</h1>
                    <h2>Invoice</h2>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                        <div>
                            <p><strong>Invoice Number:</strong> {invoice['invoice_number']}</p>
                            <p><strong>Invoice Date:</strong> {datetime.fromisoformat(invoice['invoice_date']).strftime('%B %d, %Y')}</p>
                            <p><strong>Due Date:</strong> {datetime.fromisoformat(invoice['due_date']).strftime('%B %d, %Y')}</p>
                        </div>
                        <div>
                            <p><strong>Bill To:</strong></p>
                            <p>{org.company_name}</p>
                        </div>
                    </div>

                    <h3>Billing Period: {invoice['billing_period']['month']}</h3>

                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background: #E5E7EB;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Description</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Quantity</th>
                                <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Unit Price</th>
                                <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {_generate_invoice_rows(invoice['line_items'])}
                        </tbody>
                    </table>

                    <div style="text-align: right; margin-top: 20px;">
                        <p><strong>Subtotal:</strong> R{invoice['subtotal']:.2f}</p>
                        <p><strong>VAT (15%):</strong> R{invoice['vat']:.2f}</p>
                        <h3 style="color: #3B82F6;"><strong>Total:</strong> R{invoice['total']:.2f}</h3>
                    </div>

                    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Payment Terms:</strong> Due within 7 days</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}/billing/pay/{invoice['invoice_number']}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Pay Now</a>
                    </div>

                    <p style="font-size: 12px; color: #666; margin-top: 30px;">
                        Thank you for using GuardianOS. If you have any questions about this invoice, please contact us at billing@guardianos.co.za
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

        logger.info(f"Invoice email sent to {org.billing_email} for {invoice['invoice_number']}")


def _generate_invoice_rows(line_items: List[Dict]) -> str:
    """Helper function to generate invoice table rows."""
    rows = ""
    for item in line_items:
        rows += f"""
            <tr>
                <td style="padding: 12px; border: 1px solid #ddd;">{item['description']}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">{item['quantity']}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">R{item['unit_price']:.2f}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">R{item['amount']:.2f}</td>
            </tr>
        """
    return rows
