"""Authentication endpoints."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.organization import Organization, SubscriptionTier, SubscriptionStatus
from app.models.auth_schemas import (
    Token,
    UserLogin,
    UserCreate,
    UserUpdate,
    UserChangePassword,
    UserResponse,
    UserWithToken,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.auth.security import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
    is_admin,
    create_refresh_token,
    validate_refresh_token,
    revoke_refresh_token,
    revoke_all_user_tokens,
)
from app.auth.password_validator import validate_password_strength, get_password_requirements
from app.services.verification_service import VerificationService
from app.config import settings
import secrets

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/password-requirements")
def get_password_requirements_endpoint():
    """
    Get password requirements for validation.

    Returns:
        Dictionary of password requirements
    """
    return get_password_requirements()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user and optionally create an organization.

    If company_name is provided, creates a new organization with a 14-day trial
    and sets the user as the owner with full access to all clients.

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        Created user

    Raises:
        HTTPException: If username or email already exists or password is weak
    """
    # Validate password strength
    is_valid, error_message = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )

    # Check if username exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    org_id = None
    is_owner = False

    # If company_name provided, create organization first
    if user_data.company_name:
        # Generate unique org code from company name
        base_code = user_data.company_name.upper().replace(" ", "")[:6]
        org_code = base_code + secrets.token_hex(3).upper()

        # Set default limits for starter tier (trial)
        trial_start = datetime.utcnow()
        trial_end = trial_start + timedelta(days=14)

        new_org = Organization(
            org_code=org_code,
            company_name=user_data.company_name,
            subscription_tier=SubscriptionTier.STARTER,
            subscription_status=SubscriptionStatus.TRIAL,
            approval_status="approved",  # Immediate access - no superadmin approval needed
            is_active=True,
            max_employees=30,
            max_sites=5,
            max_shifts_per_month=500,
            billing_email=user_data.email,
            trial_start_date=trial_start,
            trial_end_date=trial_end,
            client_management_mode='all',  # Default to all clients visible
        )

        db.add(new_org)
        db.flush()  # Get the org_id without committing
        org_id = new_org.org_id
        is_owner = True  # User who creates org becomes owner

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role if user_data.role else UserRole.ADMIN,  # Default to admin if creating org
        org_id=org_id,
        is_owner=is_owner,
        managed_client_ids=None,  # Owners get full access (NULL = all)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login")
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login with username/email and password.
    Sets httpOnly cookies for secure token storage.

    Args:
        response: FastAPI Response object
        form_data: OAuth2 form with username and password
        db: Database session

    Returns:
        Success message with user info

    Raises:
        HTTPException: If credentials are invalid
    """
    user = authenticate_user(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check email verification (Option B Security - MVP)
    if settings.ENABLE_EMAIL_VERIFICATION and not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox for the verification link.",
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Create access token (30 minutes)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.user_id), "username": user.username, "role": user.role.value},
        expires_delta=access_token_expires
    )

    # Create refresh token (7 days)
    refresh_token = create_refresh_token(
        user_id=user.user_id,
        db=db
    )

    # Determine if secure cookies should be used (production = HTTPS)
    use_secure_cookies = settings.ENVIRONMENT in ("production", "staging")

    # Set access token httpOnly cookie (XSS protection)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # JavaScript cannot access
        secure=use_secure_cookies,  # True in production (HTTPS required)
        samesite="lax",  # CSRF protection
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        path="/"
    )

    # Set refresh token httpOnly cookie (7 days)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=use_secure_cookies,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 7 days in seconds
        path="/"
    )

    return {
        "message": "Logged in successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value
        }
    }


@router.post("/login-json")
def login_json(
    response: Response,
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login with JSON body (alternative to form data).
    Sets httpOnly cookies for secure token storage.

    Args:
        response: FastAPI Response object
        credentials: Login credentials
        db: Database session

    Returns:
        Success message with user info
    """
    user = authenticate_user(db, credentials.username, credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check email verification (Option B Security - MVP)
    if settings.ENABLE_EMAIL_VERIFICATION and not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox for the verification link.",
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Create access token (30 minutes)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.user_id), "username": user.username, "role": user.role.value},
        expires_delta=access_token_expires
    )

    # Create refresh token (7 days)
    refresh_token = create_refresh_token(
        user_id=user.user_id,
        db=db
    )

    # Determine if secure cookies should be used (production = HTTPS)
    use_secure_cookies = settings.ENVIRONMENT in ("production", "staging")

    # Set access token httpOnly cookie (XSS protection)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # JavaScript cannot access
        secure=use_secure_cookies,  # True in production (HTTPS required)
        samesite="lax",  # CSRF protection
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        path="/"
    )

    # Set refresh token httpOnly cookie (7 days)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=use_secure_cookies,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 7 days in seconds
        path="/"
    )

    return {
        "message": "Logged in successfully",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value
        }
    }


@router.post("/logout")
def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """
    Logout user by clearing cookies and revoking refresh token.

    Args:
        response: FastAPI Response object
        refresh_token: Refresh token from cookie
        db: Database session

    Returns:
        Success message
    """
    # Revoke refresh token if present
    if refresh_token:
        revoke_refresh_token(refresh_token, db)

    # Determine if secure cookies should be used (production = HTTPS)
    use_secure_cookies = settings.ENVIRONMENT in ("production", "staging")

    # Clear access token cookie
    response.set_cookie(
        key="access_token",
        value="",
        httponly=True,
        secure=use_secure_cookies,
        samesite="lax",
        max_age=0,
        path="/"
    )

    # Clear refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value="",
        httponly=True,
        secure=use_secure_cookies,
        samesite="lax",
        max_age=0,
        path="/"
    )

    return {"message": "Logged out successfully"}


@router.post("/refresh")
def refresh_access_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.

    This endpoint allows users to get a new access token without re-authenticating,
    as long as their refresh token is valid (7 days).

    Args:
        response: FastAPI Response object
        refresh_token: Refresh token from cookie
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If refresh token is invalid or expired
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided",
        )

    # Validate refresh token and get user
    user = validate_refresh_token(refresh_token, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Create new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.user_id), "username": user.username, "role": user.role.value},
        expires_delta=access_token_expires
    )

    # Determine if secure cookies should be used (production = HTTPS)
    use_secure_cookies = settings.ENVIRONMENT in ("production", "staging")

    # Set new access token cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=use_secure_cookies,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    return {"message": "Access token refreshed successfully"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information.

    Args:
        current_user: Current authenticated user

    Returns:
        User information
    """
    return current_user


@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user information.

    Args:
        user_update: User update data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated user
    """
    if user_update.email:
        # Check if email is already taken by another user
        existing = db.query(User).filter(
            User.email == user_update.email,
            User.user_id != current_user.user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        current_user.email = user_update.email

    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name

    # Role and is_active changes are NOT allowed via /me (self-update).
    # Use the admin /users/{id} endpoints to manage other users' roles.
    # This prevents privilege escalation (e.g., admin upgrading to superadmin).

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    password_data: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password.

    Args:
        password_data: Password change data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password strength
    is_valid, error_message = validate_password_strength(password_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )

    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password changed successfully"}


@router.get("/users", response_model=list[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """
    List all users (admin only).

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        current_user: Current authenticated admin user
        db: Database session

    Returns:
        List of users
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """
    Get user by ID (admin only).

    Args:
        user_id: User ID
        current_user: Current authenticated admin user
        db: Database session

    Returns:
        User information
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(is_admin),
    db: Session = Depends(get_db)
):
    """
    Delete user (admin only).

    Args:
        user_id: User ID
        current_user: Current authenticated admin user
        db: Database session
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deleting yourself
    if user.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    db.delete(user)
    db.commit()

    return None


# ============================================================================
# EMAIL & PHONE VERIFICATION ENDPOINTS
# ============================================================================

@router.post("/send-verification-email", status_code=status.HTTP_200_OK)
def send_verification_email(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send email verification link to current user

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message
    """
    if current_user.is_email_verified:
        return {
            "status": "success",
            "message": "Email already verified"
        }

    result = VerificationService.send_verification_email(current_user, db)
    return result


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verify email using token from email link

    Args:
        token: Email verification token
        db: Database session

    Returns:
        Success message
    """
    result = VerificationService.verify_email_token(token, db)

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@router.post("/send-phone-verification", status_code=status.HTTP_200_OK)
def send_phone_verification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send SMS verification code to current user

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message
    """
    if current_user.is_phone_verified:
        return {
            "status": "success",
            "message": "Phone already verified"
        }

    result = VerificationService.send_phone_verification(current_user, db)

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@router.post("/verify-phone", status_code=status.HTTP_200_OK)
def verify_phone(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify phone using SMS code

    Args:
        code: 6-digit verification code
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message
    """
    result = VerificationService.verify_phone_code(current_user.user_id, code, db)

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


# ============================================================================
# PASSWORD RESET ENDPOINTS
# ============================================================================

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset email

    Args:
        request: ForgotPasswordRequest with email address
        db: Database session

    Returns:
        Success message (always returns success for security)
    """
    result = VerificationService.send_password_reset(request.email, db)
    return result


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using token from email

    Args:
        request: ResetPasswordRequest with token and new password
        db: Database session

    Returns:
        Success message
    """
    # Validate password strength
    is_valid, error_message = validate_password_strength(request.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )

    result = VerificationService.reset_password(request.token, request.new_password, db)

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result
