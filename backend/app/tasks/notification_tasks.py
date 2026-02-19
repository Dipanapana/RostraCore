"""Celery tasks for scheduled push notifications."""

import logging
from datetime import datetime, timedelta

from sqlalchemy import func

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


# ---------------------------------------------------------------------------
# BCEA weekly overtime alerts
# ---------------------------------------------------------------------------

BCEA_WEEKLY_LIMIT = 54.0   # Hard cap (BCEA s.9)
BCEA_WARNING_THRESHOLD = 45.0  # Early-warning at 45 h (~83 % of cap)


@celery_app.task(name='app.tasks.notification_tasks.send_overtime_alerts')
def send_overtime_alerts():
    """
    Alert admins/schedulers about guards approaching or exceeding the BCEA
    54-hour weekly cap.

    - Warning   : ≥ 45 h worked this week  (sent once per guard per week)
    - Critical  : ≥ 54 h worked this week  (hard BCEA limit breached)

    Runs every 6 hours via Celery Beat.  Hours are summed from
    ShiftAssignment.regular_hours + overtime_hours for shifts whose
    start_time falls within the current Mon–Sun week.
    """
    from app.models.shift import Shift
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.employee import Employee
    from app.models.user import User, UserRole
    from app.models.notification import NotificationType
    from app.services.push_service import PushService

    db = next(get_db())
    try:
        now = datetime.utcnow()
        # Monday 00:00 UTC of the current ISO week
        week_start = now - timedelta(days=now.weekday(), hours=now.hour,
                                     minutes=now.minute, seconds=now.second,
                                     microseconds=now.microsecond)

        # Sum hours per (employee_id, org_id) for the current week
        rows = (
            db.query(
                ShiftAssignment.employee_id,
                Shift.org_id,
                func.sum(
                    ShiftAssignment.regular_hours + ShiftAssignment.overtime_hours
                ).label("weekly_hours"),
            )
            .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
            .filter(
                Shift.start_time >= week_start,
                ShiftAssignment.status.in_([
                    AssignmentStatus.CONFIRMED,
                    AssignmentStatus.CHECKED_IN,
                    AssignmentStatus.CHECKED_OUT,
                ]),
            )
            .group_by(ShiftAssignment.employee_id, Shift.org_id)
            .having(
                func.sum(
                    ShiftAssignment.regular_hours + ShiftAssignment.overtime_hours
                ) >= BCEA_WARNING_THRESHOLD
            )
            .all()
        )

        if not rows:
            return {"overtime_alerts_sent": 0}

        push_svc = PushService(db)
        alert_count = 0

        for employee_id, org_id, weekly_hours in rows:
            employee = db.query(Employee).filter(
                Employee.employee_id == employee_id
            ).first()
            if not employee:
                continue

            emp_name = f"{employee.first_name} {employee.last_name}"
            hours_f = round(float(weekly_hours), 1)

            if hours_f >= BCEA_WEEKLY_LIMIT:
                level = "CRITICAL"
                title = f"BCEA Breach: {emp_name}"
                body = (
                    f"{emp_name} has worked {hours_f}h this week — "
                    f"exceeding the 54-hour BCEA limit. Review immediately."
                )
            else:
                level = "WARNING"
                title = f"Overtime Warning: {emp_name}"
                body = (
                    f"{emp_name} has worked {hours_f}h this week "
                    f"(BCEA cap: {BCEA_WEEKLY_LIMIT}h). Schedule carefully."
                )

            # Notify all admin / scheduler users in the org
            admin_users = (
                db.query(User)
                .filter(
                    User.org_id == org_id,
                    User.role.in_([
                        UserRole.ADMIN,
                        UserRole.COMPANY_ADMIN,
                        UserRole.SCHEDULER,
                    ]),
                    User.is_active == True,
                )
                .all()
            )

            for admin in admin_users:
                push_svc._notify_user(
                    admin,
                    org_id,
                    title,
                    body,
                    NotificationType.GENERAL,
                    "employee", employee_id,
                    {
                        "type": "overtime_alert",
                        "level": level,
                        "employee_id": employee_id,
                        "weekly_hours": hours_f,
                    },
                )
                alert_count += 1

        if alert_count:
            db.commit()

        logger.info("Overtime alerts sent: %d (guards flagged: %d)", alert_count, len(rows))
        return {"overtime_alerts_sent": alert_count, "guards_flagged": len(rows)}

    except Exception as exc:
        logger.error("send_overtime_alerts failed: %s", exc)
        raise
    finally:
        db.close()
