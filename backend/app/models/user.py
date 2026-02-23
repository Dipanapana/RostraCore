"""User model for authentication."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
from typing import Optional, List


class UserRole(str, enum.Enum):
    """User role enum."""
    ADMIN = "admin"
    COMPANY_ADMIN = "company_admin"
    SCHEDULER = "scheduler"
    GUARD = "guard"
    FINANCE = "finance"
    SUPERADMIN = "superadmin"
    CLIENT_VIEWER = "client_viewer"


class User(Base):
    """User model for authentication and authorization."""

    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    phone = Column(String(20), nullable=True)  # Phone number for SMS verification
    role = Column(SQLEnum(UserRole), default=UserRole.SCHEDULER, nullable=False)

    # Organization link
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=True)

    # Client portal link
    client_id = Column(Integer, ForeignKey("clients.client_id"), nullable=True)

    # Owner and client access control
    is_owner = Column(Boolean, default=False, nullable=False)  # Can manage users and see all clients
    managed_client_ids = Column(ARRAY(Integer), nullable=True)  # Specific clients this user can access

    # Account status
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    is_phone_verified = Column(Boolean, default=False)

    # Verification tokens
    email_verification_token = Column(String(255), nullable=True)
    email_verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    phone_verification_code = Column(String(10), nullable=True)
    phone_verification_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Password reset
    password_reset_token = Column(String(255), nullable=True)
    password_reset_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Account lockout (Option B Security - MVP)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    account_locked_until = Column(DateTime(timezone=True), nullable=True)
    last_failed_login = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))

    # Relationships
    organization = relationship("Organization", back_populates="users")

    @property
    def is_superadmin(self) -> bool:
        """Check if user has superadmin role."""
        return self.role == UserRole.SUPERADMIN

    def get_accessible_client_ids(self) -> Optional[List[int]]:
        """
        Get list of client IDs this user can access.

        Returns:
            - None: Full access (owner, or legacy users not yet restricted)
            - [1,2,3]: User sees only these specific clients
        """
        if self.is_owner:
            # Owners get full access - return None to indicate no filtering
            return None

        # Non-owners: check managed_client_ids
        # NULL means unrestricted (backwards compatible - legacy users)
        # Empty list [] means explicitly restricted to nothing
        if self.managed_client_ids is None:
            return None  # Unrestricted - hasn't been assigned specific clients yet

        return self.managed_client_ids  # Return the explicit list (could be [] for no access)

    def __repr__(self):
        return f"<User {self.user_id}: {self.username} ({self.role.value})>"
