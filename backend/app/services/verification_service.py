"""Email and phone verification service"""
import secrets
import random
import string
from datetime import datetime, timedelta
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.models.user import User
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class VerificationService:
    """Handle email and phone verification"""

    @staticmethod
    def generate_email_token() -> str:
        """Generate a secure random token for email verification"""
        return secrets.token_urlsafe(32)

    @staticmethod
    def generate_phone_code() -> str:
        """Generate a 6-digit code for phone verification"""
        return ''.join(random.choices(string.digits, k=6))

    @staticmethod
    def send_verification_email(user: User, db: Session) -> Dict:
        """
        Send email verification link to user

        Args:
            user: User to verify
            db: Database session

        Returns:
            Dict with status and message
        """
        # Generate verification token
        token = VerificationService.generate_email_token()

        # Save token to user
        user.email_verification_token = token
        user.email_verification_sent_at = datetime.utcnow()
        db.commit()

        # Build verification URL
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

        # TODO: Send actual email using SMTP or email service
        # For now, log the URL (in production, use SendGrid, AWS SES, etc.)
        logger.info(f"Email verification URL for {user.email}: {verification_url}")

        # In development, we'll just return the URL
        if settings.ENVIRONMENT == "development":
            return {
                "status": "success",
                "message": "Verification email sent",
                "verification_url": verification_url,  # Only in dev!
                "token": token  # Only in dev!
            }

        # In production, send actual email
        try:
            # Example using a hypothetical email service
            # email_service.send(
            #     to=user.email,
            #     subject="Verify your RostraCore email",
            #     body=f"Click here to verify: {verification_url}"
            # )
            pass
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            return {
                "status": "error",
                "message": "Failed to send verification email"
            }

        return {
            "status": "success",
            "message": f"Verification email sent to {user.email}"
        }

    @staticmethod
    def verify_email_token(token: str, db: Session) -> Dict:
        """
        Verify email token and activate user email

        Args:
            token: Verification token
            db: Database session

        Returns:
            Dict with status and message
        """
        # Find user with this token
        user = db.query(User).filter(User.email_verification_token == token).first()

        if not user:
            return {
                "status": "error",
                "message": "Invalid verification token"
            }

        # Check if token is expired (24 hours)
        if user.email_verification_sent_at:
            expiry_time = user.email_verification_sent_at + timedelta(hours=24)
            if datetime.utcnow() > expiry_time:
                return {
                    "status": "error",
                    "message": "Verification token has expired. Please request a new one."
                }

        # Mark email as verified
        user.is_email_verified = True
        user.email_verification_token = None
        user.email_verification_sent_at = None
        db.commit()

        return {
            "status": "success",
            "message": "Email verified successfully",
            "user_id": user.user_id
        }

    @staticmethod
    def send_phone_verification(user: User, db: Session) -> Dict:
        """
        Send SMS verification code to user

        Args:
            user: User to verify
            db: Database session

        Returns:
            Dict with status and message
        """
        if not user.phone:
            return {
                "status": "error",
                "message": "No phone number on file"
            }

        # Generate verification code
        code = VerificationService.generate_phone_code()

        # Save code to user
        user.phone_verification_code = code
        user.phone_verification_sent_at = datetime.utcnow()
        db.commit()

        # TODO: Send actual SMS using Twilio, AWS SNS, etc.
        # For now, log the code (in production, use SMS service)
        logger.info(f"Phone verification code for {user.phone}: {code}")

        # In development, return the code
        if settings.ENVIRONMENT == "development":
            return {
                "status": "success",
                "message": "Verification code sent",
                "code": code,  # Only in dev!
                "phone": user.phone
            }

        # In production, send actual SMS
        try:
            # Example using a hypothetical SMS service
            # sms_service.send(
            #     to=user.phone,
            #     message=f"Your RostraCore verification code is: {code}"
            # )
            pass
        except Exception as e:
            logger.error(f"Failed to send verification SMS: {e}")
            return {
                "status": "error",
                "message": "Failed to send verification SMS"
            }

        return {
            "status": "success",
            "message": f"Verification code sent to {user.phone}"
        }

    @staticmethod
    def verify_phone_code(user_id: int, code: str, db: Session) -> Dict:
        """
        Verify phone code and activate user phone

        Args:
            user_id: User ID
            code: Verification code
            db: Database session

        Returns:
            Dict with status and message
        """
        # Find user
        user = db.query(User).filter(User.user_id == user_id).first()

        if not user:
            return {
                "status": "error",
                "message": "User not found"
            }

        if not user.phone_verification_code:
            return {
                "status": "error",
                "message": "No verification code found. Please request a new one."
            }

        # Check if code matches
        if user.phone_verification_code != code:
            return {
                "status": "error",
                "message": "Invalid verification code"
            }

        # Check if code is expired (10 minutes)
        if user.phone_verification_sent_at:
            expiry_time = user.phone_verification_sent_at + timedelta(minutes=10)
            if datetime.utcnow() > expiry_time:
                return {
                    "status": "error",
                    "message": "Verification code has expired. Please request a new one."
                }

        # Mark phone as verified
        user.is_phone_verified = True
        user.phone_verification_code = None
        user.phone_verification_sent_at = None
        db.commit()

        return {
            "status": "success",
            "message": "Phone verified successfully"
        }

    @staticmethod
    def send_password_reset(email: str, db: Session) -> Dict:
        """
        Send password reset email

        Args:
            email: User email
            db: Database session

        Returns:
            Dict with status and message
        """
        # Find user by email
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Don't reveal if email exists
            return {
                "status": "success",
                "message": "If an account exists with this email, a password reset link has been sent."
            }

        # Generate reset token
        token = VerificationService.generate_email_token()

        # Save token to user
        user.password_reset_token = token
        user.password_reset_sent_at = datetime.utcnow()
        db.commit()

        # Build reset URL
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

        # TODO: Send actual email
        logger.info(f"Password reset URL for {user.email}: {reset_url}")

        # In development, return the URL
        if settings.ENVIRONMENT == "development":
            return {
                "status": "success",
                "message": "Password reset email sent",
                "reset_url": reset_url,  # Only in dev!
                "token": token  # Only in dev!
            }

        # In production, send actual email
        try:
            # Send email with reset link
            pass
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")

        return {
            "status": "success",
            "message": "If an account exists with this email, a password reset link has been sent."
        }

    @staticmethod
    def reset_password(token: str, new_password: str, db: Session) -> Dict:
        """
        Reset password using token

        Args:
            token: Password reset token
            new_password: New password (will be hashed)
            db: Database session

        Returns:
            Dict with status and message
        """
        # Find user with this token
        user = db.query(User).filter(User.password_reset_token == token).first()

        if not user:
            return {
                "status": "error",
                "message": "Invalid or expired reset token"
            }

        # Check if token is expired (1 hour)
        if user.password_reset_sent_at:
            expiry_time = user.password_reset_sent_at + timedelta(hours=1)
            if datetime.utcnow() > expiry_time:
                return {
                    "status": "error",
                    "message": "Reset token has expired. Please request a new one."
                }

        # Hash new password
        from app.auth.security import get_password_hash
        user.hashed_password = get_password_hash(new_password)

        # Clear reset token
        user.password_reset_token = None
        user.password_reset_sent_at = None

        db.commit()

        return {
            "status": "success",
            "message": "Password reset successfully"
        }
