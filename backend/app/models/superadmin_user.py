"""Superadmin user model - Platform administrators."""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import JSON
from app.database import Base
from typing import List


class SuperadminUser(Base):
    """
    Superadmin users - Platform-level administrators.

    Separate authentication from organization users.
    Has full control over:
    - Subscription plans
    - Organization management
    - Marketplace pricing
    - Platform analytics
    """
    __tablename__ = "superadmin_users"

    superadmin_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)

    # Permissions (JSON array)
    # Example: ["manage_plans", "manage_orgs", "view_analytics", "manage_pricing"]
    permissions = Column(JSON, nullable=False, server_default="[]")

    # Account status
    is_active = Column(Boolean, default=True)
    is_super = Column(Boolean, default=True)  # Full access superadmin

    # Activity tracking
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    def has_permission(self, permission: str) -> bool:
        """Check if superadmin has a specific permission."""
        if self.is_super:
            return True  # Super admins have all permissions

        if not self.permissions:
            return False

        return permission in self.permissions

    def has_any_permission(self, permissions: List[str]) -> bool:
        """Check if superadmin has any of the specified permissions."""
        if self.is_super:
            return True

        return any(self.has_permission(perm) for perm in permissions)
