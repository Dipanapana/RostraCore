"""Security utilities for authentication and authorization."""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token.

    Args:
        data: Data to encode in token
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Decode JWT access token.

    Args:
        token: JWT token to decode

    Returns:
        Decoded token data

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Authenticate a user with account lockout protection (Option B Security - MVP).

    This function implements account lockout after MAX_LOGIN_ATTEMPTS failed attempts.
    Accounts are locked for ACCOUNT_LOCKOUT_DURATION_MINUTES.

    Args:
        db: Database session
        username: Username or email
        password: Plain text password

    Returns:
        User object if authenticated, None otherwise

    Raises:
        HTTPException: If account is locked
    """
    # Try username first
    user = db.query(User).filter(User.username == username).first()

    # If not found, try email
    if not user:
        user = db.query(User).filter(User.email == username).first()

    # User not found - return None (don't reveal if username exists)
    if not user:
        return None

    # Check if account is locked
    if user.account_locked_until:
        if datetime.utcnow() < user.account_locked_until:
            # Account is still locked
            time_remaining = (user.account_locked_until - datetime.utcnow()).total_seconds() / 60
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account locked due to too many failed login attempts. Try again in {int(time_remaining)} minutes."
            )
        else:
            # Lockout period expired - reset counters
            user.failed_login_attempts = 0
            user.account_locked_until = None
            user.last_failed_login = None
            db.commit()

    # Verify password
    if not verify_password(password, user.hashed_password):
        # Failed login attempt
        user.failed_login_attempts += 1
        user.last_failed_login = datetime.utcnow()

        # Check if should lock account
        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.account_locked_until = datetime.utcnow() + timedelta(
                minutes=settings.ACCOUNT_LOCKOUT_DURATION_MINUTES
            )
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account locked due to {settings.MAX_LOGIN_ATTEMPTS} failed login attempts. Try again in {settings.ACCOUNT_LOCKOUT_DURATION_MINUTES} minutes."
            )

        db.commit()

        # Return None to indicate auth failure (let calling code handle the response)
        return None

    # Successful login - reset failed attempts counter
    user.failed_login_attempts = 0
    user.account_locked_until = None
    user.last_failed_login = None
    db.commit()

    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from token.

    Args:
        token: JWT token from request
        db: Database session

    Returns:
        Current user

    Raises:
        HTTPException: If user not found or inactive
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    user_id_str: str = payload.get("sub")

    if user_id_str is None:
        raise credentials_exception

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    user = db.query(User).filter(User.user_id == user_id).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    return current_user


def require_role(required_role: UserRole):
    """
    Dependency to require a specific role.

    Args:
        required_role: Required user role

    Returns:
        Dependency function
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role.value}"
            )
        return current_user

    return role_checker


def require_roles(allowed_roles: list[UserRole]):
    """
    Dependency to require one of multiple roles.

    Args:
        allowed_roles: List of allowed user roles

    Returns:
        Dependency function
    """
    def roles_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_user

    return roles_checker


def is_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role."""
    return require_role(UserRole.ADMIN)(current_user)


def get_current_org_id(current_user: User = Depends(get_current_user)) -> int:
    """
    Get the org_id of the current authenticated user.

    This is used for multi-tenancy data isolation - ensures users can only access
    data from their own organization.

    Args:
        current_user: Current authenticated user

    Returns:
        Organization ID

    Raises:
        HTTPException: If user has no organization assigned
    """
    if current_user.org_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no organization assigned. Please contact administrator."
        )
    return current_user.org_id
