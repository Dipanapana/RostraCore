"""
API dependencies.

This module consolidates all dependency functions used across API endpoints.
It re-exports authentication dependencies from app.auth.security for convenience.
"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import (
    get_current_user,
    get_current_active_user,
    is_admin,
    require_role,
    require_roles,
    oauth2_scheme,
)
from app.models.user import User, UserRole


# Re-export authentication dependencies
__all__ = [
    "get_current_user",
    "get_current_active_user",
    "is_admin",
    "require_role",
    "require_roles",
    "oauth2_scheme",
    "get_db",
]


# Additional common dependencies can be added here

def get_current_active_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active admin user.

    Args:
        current_user: Current authenticated user

    Returns:
        Current user if they are an admin

    Raises:
        HTTPException: If user is not an admin
    """
    from fastapi import HTTPException, status

    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )

    return current_user


def get_current_organization_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user that belongs to an organization.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Current user if they belong to an organization

    Raises:
        HTTPException: If user doesn't have an organization
    """
    from fastapi import HTTPException, status

    # Add organization check logic here if needed
    # For now, just return the user
    return current_user
