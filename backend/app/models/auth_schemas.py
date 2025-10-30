"""Pydantic schemas for authentication."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
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
    role: UserRole = UserRole.SCHEDULER


class UserUpdate(BaseModel):
    """User update schema."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
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
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserWithToken(BaseModel):
    """User with token response."""
    user: UserResponse
    token: Token
