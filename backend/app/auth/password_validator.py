"""Password validation utilities."""

import re
from typing import Tuple
from app.config import settings


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password meets security requirements.

    Requirements:
    - Minimum length (configurable via settings.PASSWORD_MIN_LENGTH)
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one digit (0-9)
    - At least one special character

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    min_length = settings.PASSWORD_MIN_LENGTH

    if len(password) < min_length:
        return False, f"Password must be at least {min_length} characters long"

    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"

    if not re.search(r'[!@#$%^&*()\-_=+\[\]{}|;:\'",.<>/?\\`~]', password):
        return False, "Password must contain at least one special character (e.g. !@#$%^&*)"

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
        "requires_number": True,
        "requires_special_character": True,
        "description": (
            f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters "
            "and contain uppercase, lowercase, a number, and a special character"
        )
    }
