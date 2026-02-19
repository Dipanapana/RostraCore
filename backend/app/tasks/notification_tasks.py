"""Celery tasks for scheduled push notifications."""

import logging
from datetime import datetime, timedelta

from app.celery_app import celery_app
from app.database import get_db

logger = logging.getLogger(__name__)


@celery_app.task(name='app.tasks.notification_tasks.send_shift_reminders')
def send_shift_reminders():
    """
    Send push reminders to guards whose confirmed shifts start in 45–75 minutes.

    Runs every 30 minutes via Celery Beat. The 30-minute window avoids sending
    duplicate reminders while covering any slight timing drift between runs.
    """
    from app.models.shift import Shift
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.notification import NotificationType
    from app.services.push_service import PushService

    db = next(get_db())
    try:
        now = datetime.utcnow()
        window_start = now + timedelta(minutes=45)
        window_end = now + timedelta(minutes=75)

        assignments = (
            db.query(ShiftAssignment)
            .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
            .filter(
                Shift.start_time >= window_start,
                Shift.start_time < window_end,
                ShiftAssignment.status == AssignmentStatus.CONFIRMED,
                ShiftAssignment.checked_in == False,
            )
            .all()
        )

        if not assignments:
            return {"reminders_sent": 0}

        push_svc = PushService(db)
        count = 0

        for assignment in assignments:
            shift = assignment.shift
            user = push_svc._user_for_employee(assignment.employee_id)
            if not user:
                continue

            shift_time = shift.start_time.strftime("%H:%M")
            mins_away = int((shift.start_time - now).total_seconds() / 60)

            push_svc._notify_user(
                user,
                shift.org_id,
                "Shift Reminder",
                f"Your shift starts in ~{mins_away} minutes ({shift_time}). "
                "Remember to check in when you arrive.",
                NotificationType.SHIFT_REMINDER,
                "shift", shift.shift_id,
                {"type": "shift_reminder", "shift_id": shift.shift_id},
            )
            count += 1

        if count:
            db.commit()

        logger.info("Shift reminders sent: %d", count)
        return {"reminders_sent": count}

    except Exception as exc:
        logger.error("send_shift_reminders failed: %s", exc)
        raise
    finally:
        db.close()
