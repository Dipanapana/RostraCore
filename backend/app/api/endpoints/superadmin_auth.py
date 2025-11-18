"""Superadmin authentication endpoints - Platform admin login."""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.database import get_db
from app.models.user import User, UserRole
from app.auth.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.config import settings
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# OAuth2 scheme for superadmin
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/superadmin/auth/login")


# Schemas
class SuperadminRegister(BaseModel):
    """Superadmin registration data."""
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=12)
    full_name: str = Field(..., min_length=1, max_length=200)


class SuperadminToken(BaseModel):
    """Superadmin authentication token response."""
    access_token: str
    token_type: str
    user_id: int
    username: str
    email: str
    role: str


class SuperadminProfile(BaseModel):
    """Superadmin profile response."""
    user_id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


@router.post("/login", response_model=SuperadminToken)
async def superadmin_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Superadmin login endpoint.

    Only users with 'superadmin' role can login here.
    """
    # Find user by username
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user:
        logger.warning(f"SuperAdmin login failed: user '{form_data.username}' not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify role is superadmin
    if user.role != UserRole.SUPERADMIN:
        logger.warning(f"SuperAdmin login failed: user '{form_data.username}' is not a superadmin (role: {user.role})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Superadmin role required."
        )

    # Verify password
    if not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"SuperAdmin login failed: incorrect password for '{form_data.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if account is active
    if not user.is_active:
        logger.warning(f"SuperAdmin login failed: user '{form_data.username}' is inactive")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact system administrator."
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Generate JWT token
    access_token = create_access_token(data={"sub": user.username})

    logger.info(f"SuperAdmin login successful: {user.username} (ID: {user.user_id})")

    return SuperadminToken(
        access_token=access_token,
        token_type="bearer",
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        role=user.role.value
    )


@router.post("/register", response_model=SuperadminToken, status_code=status.HTTP_201_CREATED)
async def register_superadmin(
    user_data: SuperadminRegister,
    secret_token: str = Header(..., alias="X-SuperAdmin-Token"),
    db: Session = Depends(get_db)
):
    """
    Special registration endpoint for creating superadmin users.

    Requires secret token in X-SuperAdmin-Token header.
    Token must match SUPERADMIN_SECRET_TOKEN from .env file.

    This is the only way to create superadmin accounts.
    """
    # Verify secret token
    expected_token = getattr(settings, 'SUPERADMIN_SECRET_TOKEN', None)

    if not expected_token:
        logger.error("SUPERADMIN_SECRET_TOKEN not configured in settings")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SuperAdmin registration is not configured. Set SUPERADMIN_SECRET_TOKEN in .env"
        )

    if secret_token != expected_token:
        logger.warning(f"SuperAdmin registration failed: invalid secret token")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid secret token"
        )

    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create superadmin user
    new_superadmin = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=UserRole.SUPERADMIN,
        is_active=True,
        is_email_verified=True,  # Auto-verify superadmin
        org_id=None  # Superadmins don't belong to organizations
    )

    db.add(new_superadmin)
    db.commit()
    db.refresh(new_superadmin)

    # Generate JWT token
    access_token = create_access_token(data={"sub": new_superadmin.username})

    logger.info(f"SuperAdmin created: {new_superadmin.username} (ID: {new_superadmin.user_id})")

    return SuperadminToken(
        access_token=access_token,
        token_type="bearer",
        user_id=new_superadmin.user_id,
        username=new_superadmin.username,
        email=new_superadmin.email,
        role=new_superadmin.role.value
    )


@router.get("/profile", response_model=SuperadminProfile)
async def get_superadmin_profile(
    current_superadmin: User = Depends(lambda db=Depends(get_db): get_current_superadmin(db=db))
):
    """
    Get current superadmin profile.

    Requires valid JWT token with superadmin role.
    """
    return SuperadminProfile(
        user_id=current_superadmin.user_id,
        username=current_superadmin.username,
        email=current_superadmin.email,
        full_name=current_superadmin.full_name,
        role=current_superadmin.role.value,
        is_active=current_superadmin.is_active,
        created_at=current_superadmin.created_at,
        last_login=current_superadmin.last_login
    )


def get_current_superadmin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated superadmin.

    Verifies:
    1. User is authenticated (via get_current_user)
    2. User role is SUPERADMIN
    3. User is active

    Returns:
        User object with superadmin role

    Raises:
        HTTPException: If user is not a superadmin
    """
    if current_user.role != UserRole.SUPERADMIN:
        logger.warning(f"Access denied: User {current_user.username} (role: {current_user.role}) tried to access superadmin endpoint")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Superadmin role required."
        )

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    return current_user
