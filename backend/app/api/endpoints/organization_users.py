"""Organization user management endpoints - Add admins and manage access."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.auth.security import get_current_user, get_password_hash
from app.config import settings
from app.services.email_service import EmailService
import secrets


router = APIRouter()


# ============================================================================
# SCHEMAS
# ============================================================================

class InviteUserRequest(BaseModel):
    """Schema for inviting a new user to the organization."""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=200)
    role: UserRole = Field(default=UserRole.SCHEDULER)
    send_email: bool = True


class UserResponse(BaseModel):
    """Schema for user response."""
    user_id: int
    username: str
    email: str
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    is_email_verified: bool
    created_at: str

    class Config:
        from_attributes = True


class InviteResponse(BaseModel):
    """Schema for invite response."""
    user_id: int
    username: str
    email: str
    temporary_password: Optional[str]  # Only shown once
    message: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/users", response_model=List[UserResponse])
async def list_organization_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all users in the current user's organization.

    **Requires**: ADMIN or COMPANY_ADMIN role
    """
    # Check if user has permission (admin or company_admin)
    if current_user.role not in [UserRole.ADMIN, UserRole.COMPANY_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view organization users"
        )

    # Check if user has an organization
    if not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with an organization"
        )

    # Get all users in the organization
    users = db.query(User).filter(
        User.org_id == current_user.org_id
    ).all()

    return [
        UserResponse(
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            is_email_verified=user.is_email_verified,
            created_at=user.created_at.isoformat() if user.created_at else None
        )
        for user in users
    ]


@router.post("/users/invite", response_model=InviteResponse)
async def invite_user_to_organization(
    invite_request: InviteUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invite a new user to the organization.

    This will:
    1. Create a new user account with a temporary password
    2. Associate the user with the organization
    3. Send an email with login credentials (if send_email=True)

    **Requires**: ADMIN or COMPANY_ADMIN role
    """
    # Check if user has permission
    if current_user.role not in [UserRole.ADMIN, UserRole.COMPANY_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can invite users to the organization"
        )

    # Check if user has an organization
    if not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with an organization"
        )

    # Check if organization is approved
    org = db.query(Organization).filter(
        Organization.org_id == current_user.org_id
    ).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    if settings.ENABLE_ORGANIZATION_APPROVAL and org.approval_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Organization must be approved before adding users. Current status: {org.approval_status}"
        )

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == invite_request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )

    # Generate username from email (before @)
    base_username = invite_request.email.split("@")[0]
    username = base_username

    # Check if username exists, append number if needed
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1

    # Generate temporary password
    temporary_password = secrets.token_urlsafe(12)  # Generates a secure random password
    hashed_password = get_password_hash(temporary_password)

    # Create new user
    new_user = User(
        username=username,
        email=invite_request.email,
        hashed_password=hashed_password,
        full_name=invite_request.full_name,
        role=invite_request.role,
        org_id=current_user.org_id,
        is_active=True,
        is_email_verified=False  # Will need to verify email
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send invitation email
    email_sent = False
    if invite_request.send_email:
        try:
            result = EmailService.send_user_invitation_email(
                to=new_user.email,
                user_name=new_user.full_name or new_user.username,
                company_name=org.company_name,
                username=new_user.username,
                temporary_password=temporary_password,
                login_url=f"{settings.FRONTEND_URL}/login"
            )

            if result["status"] == "success":
                email_sent = True
        except Exception as e:
            # Log but don't fail the user creation
            print(f"Error sending invitation email: {str(e)}")

    # Prepare response
    response_message = f"User invited successfully. "
    if email_sent:
        response_message += "Login credentials sent to their email."
    else:
        response_message += "Please share the credentials with the user manually."

    return InviteResponse(
        user_id=new_user.user_id,
        username=new_user.username,
        email=new_user.email,
        temporary_password=temporary_password if not email_sent or settings.ENVIRONMENT == "development" else None,
        message=response_message
    )


@router.delete("/users/{user_id}")
async def remove_user_from_organization(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a user from the organization.

    **Requires**: ADMIN or COMPANY_ADMIN role

    **Cannot**:
    - Remove yourself
    - Remove the last admin
    """
    # Check if user has permission
    if current_user.role not in [UserRole.ADMIN, UserRole.COMPANY_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can remove users from the organization"
        )

    # Check if user has an organization
    if not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with an organization"
        )

    # Get the user to remove
    user_to_remove = db.query(User).filter(User.user_id == user_id).first()

    if not user_to_remove:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if user is in the same organization
    if user_to_remove.org_id != current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only remove users from your own organization"
        )

    # Prevent removing yourself
    if user_to_remove.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself from the organization"
        )

    # Check if this is the last admin
    admin_count = db.query(User).filter(
        User.org_id == current_user.org_id,
        User.role.in_([UserRole.ADMIN, UserRole.COMPANY_ADMIN]),
        User.is_active == True
    ).count()

    if user_to_remove.role in [UserRole.ADMIN, UserRole.COMPANY_ADMIN] and admin_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the last admin from the organization"
        )

    # Deactivate the user (soft delete - preserve data integrity)
    user_to_remove.is_active = False
    db.commit()

    return {
        "status": "success",
        "message": f"User {user_to_remove.username} removed from organization"
    }


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    new_role: UserRole,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a user's role within the organization.

    **Requires**: ADMIN or COMPANY_ADMIN role

    **Cannot**:
    - Change your own role
    - Remove the last admin role
    """
    # Check if user has permission
    if current_user.role not in [UserRole.ADMIN, UserRole.COMPANY_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can change user roles"
        )

    # Check if user has an organization
    if not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with an organization"
        )

    # Get the user to update
    user_to_update = db.query(User).filter(User.user_id == user_id).first()

    if not user_to_update:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if user is in the same organization
    if user_to_update.org_id != current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update users in your own organization"
        )

    # Prevent changing your own role
    if user_to_update.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )

    # Check if this would remove the last admin
    if user_to_update.role in [UserRole.ADMIN, UserRole.COMPANY_ADMIN]:
        admin_count = db.query(User).filter(
            User.org_id == current_user.org_id,
            User.role.in_([UserRole.ADMIN, UserRole.COMPANY_ADMIN]),
            User.is_active == True
        ).count()

        if admin_count <= 1 and new_role not in [UserRole.ADMIN, UserRole.COMPANY_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove admin role from the last admin in the organization"
            )

    # Update the role
    old_role = user_to_update.role
    user_to_update.role = new_role
    db.commit()

    return {
        "status": "success",
        "message": f"User role updated from {old_role.value} to {new_role.value}",
        "user_id": user_to_update.user_id,
        "username": user_to_update.username,
        "old_role": old_role.value,
        "new_role": new_role.value
    }
