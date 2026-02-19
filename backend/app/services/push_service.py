"""Push notification service — in-app Notification records + Expo push dispatch."""

import logging
from typing import List, Optional

try:
    import requests as _http
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False

from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.notification import Notification, NotificationType, PushToken
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/exponent-push-notification-gateway"


class PushService:
    """Creates in-app Notification rows and dispatches Expo push messages."""

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _tokens_for_user(self, user_id: int) -> List[str]:
        rows = self.db.query(PushToken.token).filter(PushToken.user_id == user_id).all()
        return [r.token for r in rows]

    def _user_for_employee(self, employee_id: int) -> Optional[User]:
        emp = self.db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not emp or not emp.email:
            return None
        return self.db.query(User).filter(User.email == emp.email).first()

    def _admin_users(self, org_id: int) -> List[User]:
        return (
            self.db.query(User)
            .filter(
                User.org_id == org_id,
                User.is_active == True,
                User.role.in_([UserRole.ADMIN, UserRole.COMPANY_ADMIN, UserRole.SCHEDULER]),
            )
            .all()
        )

    def _save_notification(
        self,
        user_id: int,
        org_id: int,
        title: str,
        message: str,
        notification_type: NotificationType,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
    ) -> None:
        self.db.add(
            Notification(
                user_id=user_id,
                org_id=org_id,
                title=title,
                message=message,
                notification_type=notification_type,
                reference_type=reference_type,
                reference_id=reference_id,
            )
        )

    def _send_expo(self, tokens: List[str], title: str, body: str, data: dict) -> None:
        """Fire-and-forget Expo push. Never raises."""
        if not tokens or not _REQUESTS_AVAILABLE:
            return

        messages = [
            {"to": t, "sound": "default", "title": title, "body": body, "data": data}
            for t in tokens
            if t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken[")
        ]
        if not messages:
            return

        try:
            _http.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                timeout=5,
            )
        except Exception as exc:
            logger.warning("Expo push dispatch failed: %s", exc)

    def _notify_user(
        self,
        user: User,
        org_id: int,
        title: str,
        body: str,
        notification_type: NotificationType,
        ref_type: Optional[str],
        ref_id: Optional[int],
        push_data: dict,
    ) -> None:
        self._save_notification(user.user_id, org_id, title, body, notification_type, ref_type, ref_id)
        self._send_expo(self._tokens_for_user(user.user_id), title, body, push_data)

    # ------------------------------------------------------------------
    # Public notification methods
    # ------------------------------------------------------------------

    def notify_shift_assigned(self, employee_id: int, shift, org_id: int) -> None:
        """Notify a guard that they have been assigned to a shift."""
        user = self._user_for_employee(employee_id)
        if not user:
            return
        shift_date = shift.start_time.strftime("%a %d %b %Y")
        title = "New Shift Assigned"
        body = f"You have been assigned a shift on {shift_date}."
        self._notify_user(
            user, org_id, title, body,
            NotificationType.SHIFT_CHANGE,
            "shift", shift.shift_id,
            {"type": "shift_assignment", "shift_id": shift.shift_id},
        )
        self.db.commit()

    def notify_shift_cancelled(self, employee_id: int, shift, org_id: int) -> None:
        """Notify a guard that their shift assignment has been cancelled."""
        user = self._user_for_employee(employee_id)
        if not user:
            return
        shift_date = shift.start_time.strftime("%a %d %b %Y")
        title = "Shift Cancelled"
        body = f"Your shift on {shift_date} has been cancelled."
        self._notify_user(
            user, org_id, title, body,
            NotificationType.SHIFT_CANCELLED,
            "shift", shift.shift_id,
            {"type": "shift_cancelled", "shift_id": shift.shift_id},
        )
        self.db.commit()

    def notify_shift_confirmed(self, employee_id: int, shift, org_id: int) -> None:
        """Notify a guard that their shift assignment has been confirmed."""
        user = self._user_for_employee(employee_id)
        if not user:
            return
        shift_date = shift.start_time.strftime("%a %d %b %Y")
        title = "Shift Confirmed"
        body = f"Your shift on {shift_date} has been confirmed."
        self._notify_user(
            user, org_id, title, body,
            NotificationType.SHIFT_CHANGE,
            "shift", shift.shift_id,
            {"type": "shift_confirmed", "shift_id": shift.shift_id},
        )
        self.db.commit()

    def notify_leave_approved(self, employee_id: int, leave_request, org_id: int) -> None:
        """Notify a guard that their leave request has been approved."""
        user = self._user_for_employee(employee_id)
        if not user:
            return
        leave_type = leave_request.leave_type.replace("_", " ").title()
        title = "Leave Approved"
        body = f"Your {leave_type} leave request has been approved."
        self._notify_user(
            user, org_id, title, body,
            NotificationType.LEAVE_UPDATE,
            "leave", leave_request.request_id,
            {"type": "leave_approved", "leave_id": leave_request.request_id},
        )
        self.db.commit()

    def notify_leave_rejected(self, employee_id: int, leave_request, org_id: int) -> None:
        """Notify a guard that their leave request has been rejected."""
        user = self._user_for_employee(employee_id)
        if not user:
            return
        leave_type = leave_request.leave_type.replace("_", " ").title()
        title = "Leave Request Declined"
        suffix = f": {leave_request.rejection_reason}" if leave_request.rejection_reason else "."
        body = f"Your {leave_type} leave request was not approved{suffix}"
        self._notify_user(
            user, org_id, title, body,
            NotificationType.LEAVE_UPDATE,
            "leave", leave_request.request_id,
            {"type": "leave_rejected", "leave_id": leave_request.request_id},
        )
        self.db.commit()

    def notify_incident_reported(self, incident, org_id: int) -> None:
        """Notify all admin/scheduler users that a new incident has been reported."""
        admins = self._admin_users(org_id)
        if not admins:
            return
        severity = incident.severity.value.upper() if hasattr(incident.severity, "value") else str(incident.severity).upper()
        title = f"[{severity}] Incident Reported"
        body = f"{incident.incident_type.replace('_', ' ').title()} reported."
        for admin in admins:
            self._notify_user(
                admin, org_id, title, body,
                NotificationType.INCIDENT,
                "incident", incident.incident_id,
                {"type": "incident", "incident_id": incident.incident_id},
            )
        self.db.commit()
