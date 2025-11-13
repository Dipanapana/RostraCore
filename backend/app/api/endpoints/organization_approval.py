"""Organization approval workflow endpoints (MVP Security - Option B)."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.auth.security import get_current_user
from app.config import settings


router = APIRouter()


# ============================================================================
# SCHEMAS
# ============================================================================

class OrganizationApprovalResponse(BaseModel):
    """Extended organization response with approval status."""
    org_id: int
    org_code: str
    company_name: str
    psira_company_registration: Optional[str]
    approval_status: str
    approved_by: Optional[int]
    approved_at: Optional[str]
    rejection_reason: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class ApprovalAction(BaseModel):
    """Schema for approving/rejecting organization."""
    rejection_reason: Optional[str] = None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/pending-approval", response_model=List[OrganizationApprovalResponse])
async def list_pending_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all organizations pending approval.

    **Requires**: SUPERADMIN role only
    """
    # Only superadmin can access this endpoint
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmin can view pending organizations"
        )

    if not settings.ENABLE_ORGANIZATION_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization approval workflow is disabled"
        )

    # Get all pending organizations
    pending_orgs = db.query(Organization).filter(
        Organization.approval_status == "pending_approval"
    ).all()

    return [
        OrganizationApprovalResponse(
            org_id=org.org_id,
            org_code=org.org_code,
            company_name=org.company_name,
            psira_company_registration=org.psira_company_registration,
            approval_status=org.approval_status,
            approved_by=org.approved_by,
            approved_at=org.approved_at.isoformat() if org.approved_at else None,
            rejection_reason=org.rejection_reason,
            created_at=org.created_at.isoformat() if org.created_at else None
        )
        for org in pending_orgs
    ]


@router.post("/{org_id}/approve", response_model=OrganizationApprovalResponse)
async def approve_organization(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve a pending organization.

    **Requires**: SUPERADMIN role only

    This will:
    1. Set approval_status to 'approved'
    2. Set approved_by to current superadmin user_id
    3. Set approved_at timestamp
    4. Send approval notification email to organization owner
    """
    # Only superadmin can approve
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmin can approve organizations"
        )

    if not settings.ENABLE_ORGANIZATION_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization approval workflow is disabled"
        )

    # Get organization
    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with ID {org_id} not found"
        )

    if org.approval_status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Organization is already {org.approval_status}"
        )

    # Approve the organization
    org.approval_status = "approved"
    org.approved_by = current_user.user_id
    org.approved_at = datetime.utcnow()
    org.rejection_reason = None

    db.commit()
    db.refresh(org)

    # Send approval notification email
    try:
        from app.services.email_service import EmailService

        # Find organization owner (first admin user for this org)
        owner = db.query(User).filter(
            User.tenant_id == org_id,
            User.role.in_([UserRole.ADMIN, UserRole.COMPANY_ADMIN])
        ).first()

        if owner:
            result = EmailService.send_organization_approved_email(
                to=owner.email,
                company_name=org.company_name,
                user_name=owner.full_name or owner.username
            )

            if result["status"] != "success":
                # Log but don't fail the approval
                print(f"Warning: Failed to send approval email to {owner.email}")
    except Exception as e:
        # Log but don't fail the approval
        print(f"Error sending approval email: {str(e)}")

    return OrganizationApprovalResponse(
        org_id=org.org_id,
        org_code=org.org_code,
        company_name=org.company_name,
        psira_company_registration=org.psira_company_registration,
        approval_status=org.approval_status,
        approved_by=org.approved_by,
        approved_at=org.approved_at.isoformat() if org.approved_at else None,
        rejection_reason=org.rejection_reason,
        created_at=org.created_at.isoformat() if org.created_at else None
    )


@router.post("/{org_id}/reject", response_model=OrganizationApprovalResponse)
async def reject_organization(
    org_id: int,
    action: ApprovalAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject a pending organization.

    **Requires**: SUPERADMIN role only

    This will:
    1. Set approval_status to 'rejected'
    2. Set rejection_reason
    3. Send rejection notification email to organization owner
    """
    # Only superadmin can reject
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmin can reject organizations"
        )

    if not settings.ENABLE_ORGANIZATION_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization approval workflow is disabled"
        )

    if not action.rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required"
        )

    # Get organization
    org = db.query(Organization).filter(Organization.org_id == org_id).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with ID {org_id} not found"
        )

    if org.approval_status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Organization is already {org.approval_status}"
        )

    # Reject the organization
    org.approval_status = "rejected"
    org.rejection_reason = action.rejection_reason
    org.approved_by = current_user.user_id  # Track who rejected
    org.approved_at = datetime.utcnow()  # Track when rejected

    db.commit()
    db.refresh(org)

    # Send rejection notification email
    try:
        from app.services.email_service import EmailService

        # Find organization owner (first admin user for this org)
        owner = db.query(User).filter(
            User.tenant_id == org_id,
            User.role.in_([UserRole.ADMIN, UserRole.COMPANY_ADMIN])
        ).first()

        if owner:
            result = EmailService.send_organization_rejected_email(
                to=owner.email,
                company_name=org.company_name,
                user_name=owner.full_name or owner.username,
                rejection_reason=action.rejection_reason
            )

            if result["status"] != "success":
                # Log but don't fail the rejection
                print(f"Warning: Failed to send rejection email to {owner.email}")
    except Exception as e:
        # Log but don't fail the rejection
        print(f"Error sending rejection email: {str(e)}")

    return OrganizationApprovalResponse(
        org_id=org.org_id,
        org_code=org.org_code,
        company_name=org.company_name,
        psira_company_registration=org.psira_company_registration,
        approval_status=org.approval_status,
        approved_by=org.approved_by,
        approved_at=org.approved_at.isoformat() if org.approved_at else None,
        rejection_reason=org.rejection_reason,
        created_at=org.created_at.isoformat() if org.created_at else None
    )
