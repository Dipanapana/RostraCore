"""Pydantic schemas for authentication."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token data schema."""
    user_id: Optional[int] = None


class UserLogin(BaseModel):
    """User login request schema."""
    username: str = Field(..., description="Username or email")
    password: str = Field(..., min_length=6, description="Password")


class UserCreate(BaseModel):
    """User creation schema."""
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.SCHEDULER
    company_name: Optional[str] = None  # For creating organization during registration


class UserUpdate(BaseModel):
    """User update schema."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserChangePassword(BaseModel):
    """User password change schema."""
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    """User response schema."""
    user_id: int
    username: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    is_active: Optional[bool] = True
    is_owner: Optional[bool] = False
    is_superadmin: Optional[bool] = False
    org_id: Optional[int] = None
    is_email_verified: Optional[bool] = False
    is_phone_verified: Optional[bool] = False
    managed_client_ids: Optional[List[int]] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserWithToken(BaseModel):
    """User with token response."""
    user: UserResponse
    token: Token


class ForgotPasswordRequest(BaseModel):
    """Forgot password request schema."""
    email: EmailStr = Field(..., description="Email address to send reset link to")


class ResetPasswordRequest(BaseModel):
    """Reset password request schema."""
    token: str = Field(..., description="Password reset token from email")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")


class VerifyEmailRequest(BaseModel):
    """Email verification request schema."""
    token: str = Field(..., description="Email verification token from link")


class ResendVerificationRequest(BaseModel):
    """Resend verification email request schema."""
    email: EmailStr = Field(..., description="Email address to resend verification to")
