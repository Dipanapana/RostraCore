"""Celery tasks for billing automation."""
import logging
from app.celery_app import celery_app
from app.database import get_db
from app.services.billing_service import BillingService

logger = logging.getLogger(__name__)


@celery_app.task(name='app.tasks.billing_tasks.calculate_monthly_billing')
def calculate_monthly_billing():
    """
    Monthly task to calculate billing for all active organizations.

    Runs on the 1st of each month at midnight.
    Calculates cost based on active guard count × R45/guard/month.
    """
    logger.info("Starting monthly billing calculation...")

    db = next(get_db())
    try:
        result = BillingService.calculate_all_organizations(db)
        logger.info(f"Monthly billing calculation completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Monthly billing calculation failed: {e}")
        raise
    finally:
        db.close()


@celery_app.task(name='app.tasks.billing_tasks.send_monthly_invoices')
def send_monthly_invoices():
    """
    Monthly task to generate and send invoices to all active organizations.

    Runs on the 1st of each month after billing calculation.
    """
    logger.info("Starting monthly invoice generation...")

    db = next(get_db())
    try:
        from app.models.organization import Organization, SubscriptionStatus

        # Get all active organizations
        active_orgs = db.query(Organization).filter(
            Organization.subscription_status == SubscriptionStatus.ACTIVE,
            Organization.is_active == True
        ).all()

        invoices_sent = 0
        for org in active_orgs:
            result = BillingService.generate_invoice(db, org.org_id)
            if result["status"] == "success":
                invoices_sent += 1
                logger.info(f"Invoice sent to {org.company_name}")

        logger.info(f"Monthly invoicing completed: {invoices_sent} invoices sent")

        return {
            "status": "success",
            "invoices_sent": invoices_sent
        }

    except Exception as e:
        logger.error(f"Monthly invoicing failed: {e}")
        raise
    finally:
        db.close()
