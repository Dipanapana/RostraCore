"""Email service for sending transactional emails via SendGrid or SMTP"""
import logging
from typing import Optional, Dict, List
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Handles email sending via SendGrid or SMTP fallback.

    Priority:
    1. SendGrid (if API key configured)
    2. SMTP (if host configured)
    3. Development mode (log only)
    """

    @staticmethod
    def send_email(
        to: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None
    ) -> Dict:
        """
        Send email via SendGrid or SMTP.

        Args:
            to: Recipient email address
            subject: Email subject
            html_content: HTML body content
            text_content: Plain text body (optional)
            from_email: Sender email (defaults to config)
            from_name: Sender name (defaults to config)

        Returns:
            Dict with status and message
        """
        from_email = from_email or settings.FROM_EMAIL
        from_name = from_name or settings.FROM_NAME

        # Try SendGrid first
        if settings.SENDGRID_API_KEY:
            return EmailService._send_via_sendgrid(
                to=to,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                from_email=from_email,
                from_name=from_name
            )

        # Fall back to SMTP
        elif settings.SMTP_HOST:
            return EmailService._send_via_smtp(
                to=to,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                from_email=from_email,
                from_name=from_name
            )

        # Development mode - just log
        else:
            logger.warning(f"[DEV MODE] Email to {to}: {subject}")
            logger.info(f"HTML Content:\n{html_content}")
            return {
                "status": "success",
                "message": "Email logged (development mode)",
                "dev_mode": True
            }

    @staticmethod
    def _send_via_sendgrid(
        to: str,
        subject: str,
        html_content: str,
        text_content: Optional[str],
        from_email: str,
        from_name: str
    ) -> Dict:
        """Send email via SendGrid API"""
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Email, To, Content

            # Create email message
            message = Mail(
                from_email=Email(from_email, from_name),
                to_emails=To(to),
                subject=subject,
                html_content=Content("text/html", html_content)
            )

            # Add plain text if provided
            if text_content:
                message.add_content(Content("text/plain", text_content))

            # Send via SendGrid
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            response = sg.send(message)

            logger.info(f"Email sent via SendGrid to {to}, status: {response.status_code}")

            return {
                "status": "success",
                "message": f"Email sent to {to}",
                "provider": "sendgrid",
                "status_code": response.status_code
            }

        except ImportError:
            logger.error("SendGrid library not installed. Install with: pip install sendgrid")
            return {
                "status": "error",
                "message": "SendGrid library not installed"
            }
        except Exception as e:
            logger.error(f"Failed to send email via SendGrid: {e}")
            return {
                "status": "error",
                "message": f"Failed to send email: {str(e)}",
                "provider": "sendgrid"
            }

    @staticmethod
    def _send_via_smtp(
        to: str,
        subject: str,
        html_content: str,
        text_content: Optional[str],
        from_email: str,
        from_name: str
    ) -> Dict:
        """Send email via SMTP"""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = to

            # Add plain text and HTML parts
            if text_content:
                msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))

            # Connect to SMTP server
            if settings.SMTP_TLS:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)

            # Login if credentials provided
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            # Send email
            server.sendmail(from_email, [to], msg.as_string())
            server.quit()

            logger.info(f"Email sent via SMTP to {to}")

            return {
                "status": "success",
                "message": f"Email sent to {to}",
                "provider": "smtp"
            }

        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}")
            return {
                "status": "error",
                "message": f"Failed to send email: {str(e)}",
                "provider": "smtp"
            }

    @staticmethod
    def send_verification_email(to: str, verification_url: str, user_name: str) -> Dict:
        """
        Send email verification link to user.

        Args:
            to: User email address
            verification_url: Full verification URL with token
            user_name: User's name

        Returns:
            Dict with status and message
        """
        subject = "Verify your RostraCore email address"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #0A2463 0%, #071952 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>RostraCore</h1>
                    <p>Security Workforce Management</p>
                </div>
                <div class="content">
                    <h2>Welcome to RostraCore, {user_name}!</h2>
                    <p>Thank you for registering. Please verify your email address to complete your registration.</p>
                    <p>Click the button below to verify your email:</p>
                    <div style="text-align: center;">
                        <a href="{verification_url}" class="button">Verify Email Address</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #3B82F6;">{verification_url}</p>
                    <p><strong>This link will expire in 24 hours.</strong></p>
                    <p>If you didn't create an account with RostraCore, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© 2025 RostraCore (Pty) Ltd. All rights reserved.</p>
                    <p>Professional workforce management for South African security companies</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Welcome to RostraCore, {user_name}!

        Thank you for registering. Please verify your email address to complete your registration.

        Click here to verify: {verification_url}

        This link will expire in 24 hours.

        If you didn't create an account with RostraCore, please ignore this email.

        © 2025 RostraCore (Pty) Ltd.
        """

        return EmailService.send_email(
            to=to,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )

    @staticmethod
    def send_organization_approval_notification(
        to: str,
        company_name: str,
        org_code: str
    ) -> Dict:
        """
        Notify superadmin of new organization pending approval.

        Args:
            to: Superadmin email address
            company_name: Organization name
            org_code: Organization code

        Returns:
            Dict with status and message
        """
        subject = f"New Organization Registration: {company_name}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>New Organization Pending Approval</h2>
                <p>A new security company has registered on RostraCore and requires approval:</p>
                <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Company Name:</strong> {company_name}</p>
                    <p><strong>Organization Code:</strong> {org_code}</p>
                </div>
                <p>Please review and approve/reject this organization in the superadmin dashboard.</p>
                <p><a href="{settings.FRONTEND_URL}/superadmin" style="display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px;">Review in Dashboard</a></p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        New Organization Pending Approval

        Company Name: {company_name}
        Organization Code: {org_code}

        Please review and approve/reject this organization in the superadmin dashboard.
        """

        return EmailService.send_email(
            to=to,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )

    @staticmethod
    def send_organization_approved_email(
        to: str,
        company_name: str,
        user_name: str
    ) -> Dict:
        """
        Notify user that their organization has been approved.

        Args:
            to: User email address
            company_name: Organization name
            user_name: User's name

        Returns:
            Dict with status and message
        """
        subject = "Your RostraCore Organization Has Been Approved!"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px;">
                    <h1>🎉 Approved!</h1>
                </div>
                <div style="padding: 30px;">
                    <h2>Welcome to RostraCore, {user_name}!</h2>
                    <p>Great news! Your organization <strong>{company_name}</strong> has been approved and is now active on RostraCore.</p>
                    <p>You can now log in and start managing your security workforce:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}/login" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Login to Dashboard</a>
                    </div>
                    <h3>Next Steps:</h3>
                    <ol>
                        <li>Add your security guards (Employee Management)</li>
                        <li>Set up your client sites (Site Management)</li>
                        <li>Define your shifts (Shift Management)</li>
                        <li>Generate your first roster!</li>
                    </ol>
                    <p>Need help getting started? Contact us at <a href="mailto:hello@rostracore.co.za">hello@rostracore.co.za</a></p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Welcome to RostraCore, {user_name}!

        Great news! Your organization {company_name} has been approved and is now active on RostraCore.

        You can now log in and start managing your security workforce.

        Login at: {settings.FRONTEND_URL}/login

        Next Steps:
        1. Add your security guards (Employee Management)
        2. Set up your client sites (Site Management)
        3. Define your shifts (Shift Management)
        4. Generate your first roster!

        Need help? Contact us at hello@rostracore.co.za
        """

        return EmailService.send_email(
            to=to,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )

    @staticmethod
    def send_organization_rejected_email(
        to: str,
        company_name: str,
        user_name: str,
        reason: Optional[str] = None
    ) -> Dict:
        """
        Notify user that their organization registration was rejected.

        Args:
            to: User email address
            company_name: Organization name
            user_name: User's name
            reason: Rejection reason (optional)

        Returns:
            Dict with status and message
        """
        subject = "RostraCore Organization Registration Update"

        reason_text = f"<p><strong>Reason:</strong> {reason}</p>" if reason else ""
        reason_plain = f"\n\nReason: {reason}" if reason else ""

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Organization Registration Update</h2>
                <p>Hello {user_name},</p>
                <p>Thank you for your interest in RostraCore. Unfortunately, we're unable to approve the registration for <strong>{company_name}</strong> at this time.</p>
                {reason_text}
                <p>If you believe this is an error or would like to provide additional information, please contact us at <a href="mailto:hello@rostracore.co.za">hello@rostracore.co.za</a>.</p>
                <p>We appreciate your understanding.</p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                    <p>© 2025 RostraCore (Pty) Ltd.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Organization Registration Update

        Hello {user_name},

        Thank you for your interest in RostraCore. Unfortunately, we're unable to approve the registration for {company_name} at this time.{reason_plain}

        If you believe this is an error or would like to provide additional information, please contact us at hello@rostracore.co.za.

        © 2025 RostraCore (Pty) Ltd.
        """

        return EmailService.send_email(
            to=to,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )

    @staticmethod
    def send_user_invitation_email(
        to: str,
        user_name: str,
        company_name: str,
        username: str,
        temporary_password: str,
        login_url: str
    ) -> Dict:
        """
        Send invitation email to a new user added to an organization.

        Args:
            to: User email address
            user_name: User's full name
            company_name: Organization name
            username: Assigned username
            temporary_password: Temporary password
            login_url: Login page URL

        Returns:
            Dict with status and message
        """
        subject = f"You've been invited to {company_name} on RostraCore"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; padding: 30px; text-align: center; border-radius: 8px;">
                    <h1>📬 You're Invited!</h1>
                </div>
                <div style="padding: 30px;">
                    <h2>Welcome to RostraCore, {user_name}!</h2>
                    <p>You've been added to <strong>{company_name}</strong> on RostraCore - the intelligent roster and budget management platform for security companies.</p>

                    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Your Login Credentials:</h3>
                        <p style="margin: 10px 0;"><strong>Username:</strong> {username}</p>
                        <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background: white; padding: 5px 10px; border-radius: 4px; font-size: 14px;">{temporary_password}</code></p>
                    </div>

                    <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                        <p style="margin: 0;"><strong>⚠️ Important:</strong> Please change your password after your first login for security.</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{login_url}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Login Now</a>
                    </div>

                    <h3>What you can do on RostraCore:</h3>
                    <ul>
                        <li>Manage security guard schedules</li>
                        <li>Track attendance and shifts</li>
                        <li>Generate optimized rosters automatically</li>
                        <li>Monitor costs and payroll</li>
                    </ul>

                    <p>Need help? Contact your organization administrator or reach out to us at <a href="mailto:hello@rostracore.co.za">hello@rostracore.co.za</a></p>
                </div>
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #E5E7EB;">
                    <p>This invitation was sent by {company_name}</p>
                    <p>© 2025 RostraCore (Pty) Ltd.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Welcome to RostraCore, {user_name}!

        You've been added to {company_name} on RostraCore - the intelligent roster and budget management platform for security companies.

        Your Login Credentials:
        Username: {username}
        Temporary Password: {temporary_password}

        ⚠️ Important: Please change your password after your first login for security.

        Login URL: {login_url}

        What you can do on RostraCore:
        - Manage security guard schedules
        - Track attendance and shifts
        - Generate optimized rosters automatically
        - Monitor costs and payroll

        Need help? Contact your organization administrator or reach out to us at hello@rostracore.co.za

        This invitation was sent by {company_name}
        © 2025 RostraCore (Pty) Ltd.
        """

        return EmailService.send_email(
            to=to,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
