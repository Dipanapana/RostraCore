"""Celery tasks for trial management automation."""
import logging
from app.celery_app import celery_app
from app.database import get_db
from app.services.trial_service import TrialService

logger = logging.getLogger(__name__)


@celery_app.task(name='app.tasks.trial_tasks.check_expired_trials')
def check_expired_trials():
    """
    Daily task to check for expired trials and suspend organizations.

    Scheduled via Celery Beat to run daily at midnight.
    """
    logger.info("Starting daily trial expiration check...")

    db = next(get_db())
    try:
        result = TrialService.check_expired_trials(db)
        logger.info(f"Trial expiration check completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Trial expiration check failed: {e}")
        raise
    finally:
        db.close()


@celery_app.task(name='app.tasks.trial_tasks.send_trial_reminders')
def send_trial_reminders():
    """
    Daily task to send trial reminder emails.

    Sends reminders at Day 7, Day 12, and Day 14 (expiration).
    Scheduled via Celery Beat to run daily.
    """
    logger.info("Starting trial reminder emails...")

    db = next(get_db())
    try:
        result = TrialService.send_trial_reminders(db)
        logger.info(f"Trial reminders sent: {result}")
        return result
    except Exception as e:
        logger.error(f"Trial reminder task failed: {e}")
        raise
    finally:
        db.close()
