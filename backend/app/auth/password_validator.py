"""Password validation utilities."""

from typing import Tuple
from app.config import settings


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password meets security requirements.

    Requirements:
    - Minimum 8 characters (configurable via settings.PASSWORD_MIN_LENGTH)

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    min_length = settings.PASSWORD_MIN_LENGTH

    # Check minimum length
    if len(password) < min_length:
        return False, f"Password must be at least {min_length} characters long"

    return True, "Password meets all requirements"


def get_password_requirements() -> dict:
    """
    Get password requirements as a dictionary.

    Returns:
        Dictionary of password requirements
    """
    return {
        "min_length": settings.PASSWORD_MIN_LENGTH,
        "description": f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters"
    }
