"""SMS service for sending transactional SMS via Twilio."""
import logging
from typing import Optional, Dict
from app.config import settings

logger = logging.getLogger(__name__)


class SMSService:
    """
    Handles SMS sending via Twilio.

    Priority:
    1. Twilio (if credentials configured)
    2. Development mode (log only, return code in response)
    """

    @staticmethod
    def send_sms(
        to: str,
        message: str,
        from_number: Optional[str] = None,
    ) -> Dict:
        """
        Send SMS via Twilio or log in dev mode.

        Args:
            to: Recipient phone number (E.164 format, e.g., +27821234567)
            message: SMS body text
            from_number: Sender number (defaults to config)

        Returns:
            Dict with status and message
        """
        from_number = from_number or settings.TWILIO_PHONE_NUMBER

        # Normalize South African numbers
        to = SMSService._normalize_sa_number(to)

        # Try Twilio first
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            return SMSService._send_via_twilio(
                to=to,
                message=message,
                from_number=from_number,
            )

        # Development mode - just log
        logger.warning(f"[DEV MODE] SMS to {to}: {message}")
        return {
            "status": "success",
            "message": "SMS logged (development mode)",
            "dev_mode": True,
        }

    @staticmethod
    def _normalize_sa_number(phone: str) -> str:
        """
        Normalize South African phone number to E.164 format.

        Handles: 0821234567 -> +27821234567
                 27821234567 -> +27821234567
                 +27821234567 -> +27821234567
        """
        if not phone:
            return phone

        # Strip whitespace and dashes
        phone = phone.strip().replace(" ", "").replace("-", "")

        # South African number starting with 0
        if phone.startswith("0") and len(phone) == 10:
            return "+27" + phone[1:]

        # Already has country code without +
        if phone.startswith("27") and len(phone) == 11:
            return "+" + phone

        # Already in E.164 format
        if phone.startswith("+"):
            return phone

        return phone

    @staticmethod
    def _send_via_twilio(
        to: str,
        message: str,
        from_number: str,
    ) -> Dict:
        """Send SMS via Twilio API."""
        try:
            from twilio.rest import Client

            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

            msg = client.messages.create(
                body=message,
                from_=from_number,
                to=to,
            )

            logger.info(f"SMS sent via Twilio to {to}, SID: {msg.sid}")

            return {
                "status": "success",
                "message": f"SMS sent to {to}",
                "provider": "twilio",
                "message_sid": msg.sid,
            }

        except ImportError:
            logger.error("Twilio library not installed. Install with: pip install twilio")
            return {
                "status": "error",
                "message": "Twilio library not installed",
            }
        except Exception as e:
            logger.error(f"Failed to send SMS via Twilio: {e}")
            return {
                "status": "error",
                "message": f"Failed to send SMS: {str(e)}",
                "provider": "twilio",
            }

    @staticmethod
    def send_verification_code(to: str, code: str) -> Dict:
        """
        Send phone verification code via SMS.

        Args:
            to: Phone number
            code: 6-digit verification code

        Returns:
            Dict with status and message
        """
        message = f"Your RostraCore verification code is: {code}. This code expires in 10 minutes."
        return SMSService.send_sms(to=to, message=message)
