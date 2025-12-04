"""Password validation utilities."""

import re
from typing import Tuple
from app.config import settings


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password meets security requirements.

    Requirements:
    - Minimum 12 characters (configurable via settings.PASSWORD_MIN_LENGTH)
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    min_length = settings.PASSWORD_MIN_LENGTH

    # Check minimum length
    if len(password) < min_length:
        return False, f"Password must be at least {min_length} characters long"

    # Check for uppercase letter
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"

    # Check for lowercase letter
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"

    # Check for digit
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"

    # Check for special character
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password):
        return False, "Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)"

    return True, "Password meets all requirements"


def get_password_requirements() -> dict:
    """
    Get password requirements as a dictionary.

    Returns:
        Dictionary of password requirements
    """
    return {
        "min_length": settings.PASSWORD_MIN_LENGTH,
        "requires_uppercase": True,
        "requires_lowercase": True,
        "requires_digit": True,
        "requires_special": True,
        "allowed_special_chars": "!@#$%^&*()_+-=[]{}|;:,.<>?",
        "description": f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters and contain uppercase, lowercase, digit, and special character"
    }
