"""SuperAdmin Invitation model for secure superadmin onboarding."""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class SuperadminInvitation(Base):
    """
    Stores secure invitation tokens for adding new superadmins.

    Workflow:
    1. Existing superadmin creates invitation with email
    2. System generates secure token and stores it here
    3. Email sent to invitee with link containing token
    4. Invitee clicks link, sets password, becomes superadmin
    5. Invitation marked as accepted
    """
    __tablename__ = "superadmin_invitations"

    invitation_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(255), nullable=False, unique=True, index=True)

    # Who invited this person
    invited_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Status tracking
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    accepted_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    # Revocation
    revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    def __repr__(self):
        return f"<SuperadminInvitation(id={self.invitation_id}, email='{self.email}', accepted={self.accepted_at is not None})>"
