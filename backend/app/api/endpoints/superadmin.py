"""Superadmin endpoints for managing all organizations.

These endpoints are only accessible to users with role=SUPERADMIN.
They allow viewing and managing all organizations, subscriptions, and system stats.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract, and_, or_, distinct
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from pydantic import BaseModel, EmailStr, Field
from app.database import get_db
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.models.employee import Employee
from app.models.client import Client
from app.models.site import Site
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment
from app.models.availability import Availability
from app.models.certification import Certification
from app.models.superadmin_invitation import SuperadminInvitation
from app.auth.security import get_current_user, get_password_hash
from app.services.payfast_service import payfast_service
from app.services.email_service import EmailService
from app.config import settings
import logging
import secrets
from collections import defaultdict

router = APIRouter()
logger = logging.getLogger(__name__)


def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require superadmin role."""
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required"
        )
    return current_user


# ==================== Response Schemas ====================

class OrganizationSummary(BaseModel):
    """Summary of an organization for superadmin view."""
    org_id: int
    org_code: str
    company_name: str
    subscription_status: str
    subscription_tier: str
    is_active: bool

    # Counts
    employee_count: int
    active_employee_count: int
    client_count: int
    site_count: int
    user_count: int

    # Trial info
    trial_end_date: Optional[datetime] = None
    trial_days_remaining: Optional[int] = None

    # Billing
    monthly_rate_per_guard: float
    estimated_monthly_cost: float
    payfast_active: bool

    # Timestamps
    created_at: datetime

    class Config:
        from_attributes = True


class SystemStats(BaseModel):
    """System-wide statistics."""
    total_organizations: int
    active_organizations: int
    trial_organizations: int
    paying_organizations: int
    suspended_organizations: int

    total_users: int
    total_employees: int
    total_clients: int
    total_sites: int
    total_shifts: int

    # Revenue
    total_monthly_revenue: float
    average_guards_per_org: float


class OrganizationDetail(BaseModel):
    """Detailed organization info for superadmin."""
    org_id: int
    org_code: str
    company_name: str
    psira_company_registration: Optional[str] = None

    subscription_status: str
    subscription_tier: str
    is_active: bool

    # Approval
    approval_status: str
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    # Trial
    trial_start_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None
    trial_days_remaining: Optional[int] = None

    # Billing
    billing_email: Optional[str] = None
    active_guard_count: int
    monthly_rate_per_guard: float
    current_month_cost: float

    # PayFast
    payfast_subscription_token: Optional[str] = None
    payfast_subscription_status: Optional[str] = None
    subscription_started_at: Optional[datetime] = None
    subscription_next_billing_date: Optional[datetime] = None
    payment_failures: int

    # Limits
    max_employees: Optional[int] = None
    max_sites: Optional[int] = None

    # Counts
    employee_count: int
    client_count: int
    site_count: int
    user_count: int

    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Endpoints ====================

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Get system-wide statistics."""

    # Organization counts
    total_orgs = db.query(func.count(Organization.org_id)).scalar() or 0
    active_orgs = db.query(func.count(Organization.org_id)).filter(
        Organization.is_active == True
    ).scalar() or 0
    trial_orgs = db.query(func.count(Organization.org_id)).filter(
        Organization.subscription_status == "trial"
    ).scalar() or 0
    paying_orgs = db.query(func.count(Organization.org_id)).filter(
        Organization.subscription_status == "active"
    ).scalar() or 0
    suspended_orgs = db.query(func.count(Organization.org_id)).filter(
        Organization.subscription_status == "suspended"
    ).scalar() or 0

    # Entity counts
    total_users = db.query(func.count(User.user_id)).scalar() or 0
    total_employees = db.query(func.count(Employee.employee_id)).scalar() or 0
    total_clients = db.query(func.count(Client.client_id)).scalar() or 0
    total_sites = db.query(func.count(Site.site_id)).scalar() or 0
    total_shifts = db.query(func.count(Shift.shift_id)).scalar() or 0

    # Revenue calculation (only from paying orgs)
    total_revenue = db.query(func.sum(Organization.current_month_cost)).filter(
        Organization.subscription_status == "active"
    ).scalar() or 0

    avg_guards = total_employees / total_orgs if total_orgs > 0 else 0

    return SystemStats(
        total_organizations=total_orgs,
        active_organizations=active_orgs,
        trial_organizations=trial_orgs,
        paying_organizations=paying_orgs,
        suspended_organizations=suspended_orgs,
        total_users=total_users,
        total_employees=total_employees,
        total_clients=total_clients,
        total_sites=total_sites,
        total_shifts=total_shifts,
        total_monthly_revenue=float(total_revenue),
        average_guards_per_org=round(avg_guards, 1)
    )


@router.get("/organizations", response_model=List[OrganizationSummary])
async def list_organizations(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """List all organizations with summary stats."""

    query = db.query(Organization)

    if status:
        query = query.filter(Organization.subscription_status == status)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Organization.company_name.ilike(search_term)) |
            (Organization.org_code.ilike(search_term))
        )

    organizations = query.order_by(Organization.created_at.desc()).all()

    result = []
    for org in organizations:
        # Get counts
        employee_count = db.query(func.count(Employee.employee_id)).filter(
            Employee.org_id == org.org_id
        ).scalar() or 0

        active_employee_count = db.query(func.count(Employee.employee_id)).filter(
            Employee.org_id == org.org_id,
            Employee.status == 'ACTIVE'
        ).scalar() or 0

        client_count = db.query(func.count(Client.client_id)).filter(
            Client.org_id == org.org_id
        ).scalar() or 0

        site_count = db.query(func.count(Site.site_id)).filter(
            Site.org_id == org.org_id
        ).scalar() or 0

        user_count = db.query(func.count(User.user_id)).filter(
            User.org_id == org.org_id
        ).scalar() or 0

        # Trial days remaining
        trial_days = None
        if org.subscription_status == "trial" and org.trial_end_date:
            trial_days = payfast_service.days_until_trial_expires(org.trial_end_date)

        monthly_rate = float(org.monthly_rate_per_guard or settings.MVP_MONTHLY_RATE_PER_GUARD)
        estimated_cost = active_employee_count * monthly_rate

        result.append(OrganizationSummary(
            org_id=org.org_id,
            org_code=org.org_code,
            company_name=org.company_name,
            subscription_status=org.subscription_status,
            subscription_tier=org.subscription_tier,
            is_active=org.is_active,
            employee_count=employee_count,
            active_employee_count=active_employee_count,
            client_count=client_count,
            site_count=site_count,
            user_count=user_count,
            trial_end_date=org.trial_end_date,
            trial_days_remaining=trial_days if trial_days and trial_days > 0 else None,
            monthly_rate_per_guard=monthly_rate,
            estimated_monthly_cost=estimated_cost,
            payfast_active=bool(org.payfast_subscription_token),
            created_at=org.created_at
        ))

    return result


@router.get("/organizations/{org_id}", response_model=OrganizationDetail)
async def get_organization(
    org_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Get detailed organization info."""

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get counts
    employee_count = db.query(func.count(Employee.employee_id)).filter(
        Employee.org_id == org.org_id
    ).scalar() or 0

    client_count = db.query(func.count(Client.client_id)).filter(
        Client.org_id == org.org_id
    ).scalar() or 0

    site_count = db.query(func.count(Site.site_id)).filter(
        Site.org_id == org.org_id
    ).scalar() or 0

    user_count = db.query(func.count(User.user_id)).filter(
        User.org_id == org.org_id
    ).scalar() or 0

    # Trial days
    trial_days = None
    if org.subscription_status == "trial" and org.trial_end_date:
        trial_days = payfast_service.days_until_trial_expires(org.trial_end_date)

    return OrganizationDetail(
        org_id=org.org_id,
        org_code=org.org_code,
        company_name=org.company_name,
        psira_company_registration=org.psira_company_registration,
        subscription_status=org.subscription_status,
        subscription_tier=org.subscription_tier,
        is_active=org.is_active,
        approval_status=org.approval_status,
        approved_by=org.approved_by,
        approved_at=org.approved_at,
        rejection_reason=org.rejection_reason,
        trial_start_date=org.trial_start_date,
        trial_end_date=org.trial_end_date,
        trial_days_remaining=trial_days,
        billing_email=org.billing_email,
        active_guard_count=org.active_guard_count or 0,
        monthly_rate_per_guard=float(org.monthly_rate_per_guard or settings.MVP_MONTHLY_RATE_PER_GUARD),
        current_month_cost=float(org.current_month_cost or 0),
        payfast_subscription_token=org.payfast_subscription_token,
        payfast_subscription_status=org.payfast_subscription_status,
        subscription_started_at=org.subscription_started_at,
        subscription_next_billing_date=org.subscription_next_billing_date,
        payment_failures=org.payment_failures or 0,
        max_employees=org.max_employees,
        max_sites=org.max_sites,
        employee_count=employee_count,
        client_count=client_count,
        site_count=site_count,
        user_count=user_count,
        created_at=org.created_at
    )


@router.post("/organizations/{org_id}/approve")
async def approve_organization(
    org_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Approve a pending organization."""

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.approval_status = "approved"
    org.approved_by = current_user.user_id
    org.approved_at = datetime.utcnow()
    org.is_active = True

    db.commit()

    logger.info(f"Organization {org_id} approved by superadmin {current_user.user_id}")

    return {"status": "success", "message": f"{org.company_name} has been approved"}


@router.post("/organizations/{org_id}/suspend")
async def suspend_organization(
    org_id: int,
    reason: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Suspend an organization."""

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.subscription_status = "suspended"
    org.rejection_reason = reason

    db.commit()

    logger.info(f"Organization {org_id} suspended by superadmin {current_user.user_id}: {reason}")

    return {"status": "success", "message": f"{org.company_name} has been suspended"}


@router.post("/organizations/{org_id}/activate")
async def activate_organization(
    org_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Reactivate a suspended organization."""

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.subscription_status = "active"
    org.is_active = True
    org.rejection_reason = None

    db.commit()

    logger.info(f"Organization {org_id} activated by superadmin {current_user.user_id}")

    return {"status": "success", "message": f"{org.company_name} has been activated"}


@router.post("/organizations/{org_id}/extend-trial")
async def extend_org_trial(
    org_id: int,
    days: int = 30,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Extend trial period for an organization."""

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Extend from current end date or now
    base_date = org.trial_end_date or datetime.utcnow()
    org.trial_end_date = base_date + timedelta(days=days)
    org.subscription_status = "trial"

    db.commit()

    logger.info(f"Trial extended for org {org_id} by {days} days (by superadmin {current_user.user_id})")

    return {
        "status": "success",
        "message": f"Trial extended by {days} days for {org.company_name}",
        "new_trial_end_date": org.trial_end_date
    }


@router.put("/organizations/{org_id}/tier")
async def update_organization_tier(
    org_id: int,
    tier: str,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """Update organization subscription tier."""

    valid_tiers = ["starter", "professional", "business", "enterprise"]
    if tier not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Must be one of: {valid_tiers}")

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    old_tier = org.subscription_tier
    org.subscription_tier = tier

    # Update limits based on tier
    tier_limits = Organization.get_tier_limits(tier)
    org.max_employees = tier_limits.get("max_employees")
    org.max_sites = tier_limits.get("max_sites")
    org.max_shifts_per_month = tier_limits.get("max_shifts_per_month")
    org.features_enabled = tier_limits.get("features")

    db.commit()

    logger.info(f"Organization {org_id} tier changed from {old_tier} to {tier} by superadmin {current_user.user_id}")

    return {
        "status": "success",
        "message": f"{org.company_name} upgraded to {tier}",
        "new_limits": tier_limits
    }


# ==================== SuperAdmin Invitation Schemas ====================

class InviteSuperadminRequest(BaseModel):
    """Request to invite a new superadmin."""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=200)


class InvitationResponse(BaseModel):
    """Response for a superadmin invitation."""
    invitation_id: int
    email: str
    invited_by_username: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_expired: bool
    is_accepted: bool
    is_revoked: bool

    class Config:
        from_attributes = True


class AcceptInvitationRequest(BaseModel):
    """Request to accept a superadmin invitation."""
    token: str
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


# ==================== SuperAdmin Invitation Endpoints ====================

@router.post("/invite-superadmin")
async def invite_superadmin(
    request: InviteSuperadminRequest,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    Invite a new superadmin.

    Creates an invitation token and optionally sends an email with the invitation link.
    The invitation expires after 7 days.

    **Requires**: Existing superadmin role
    """
    # Check if email already exists as a user
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )

    # Check for existing pending invitation
    existing_invitation = db.query(SuperadminInvitation).filter(
        SuperadminInvitation.email == request.email,
        SuperadminInvitation.accepted_at.is_(None),
        SuperadminInvitation.revoked == False,
        SuperadminInvitation.expires_at > datetime.utcnow()
    ).first()

    if existing_invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active invitation for this email already exists"
        )

    # Generate secure token
    token = secrets.token_urlsafe(32)

    # Create invitation (expires in 7 days)
    invitation = SuperadminInvitation(
        email=request.email,
        token=token,
        invited_by=current_user.user_id,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    # Build invitation URL
    invitation_url = f"{settings.FRONTEND_URL}/superadmin/accept-invite?token={token}"

    # Try to send email
    email_sent = False
    try:
        # Use custom email for superadmin invitation
        result = EmailService.send_email(
            to=request.email,
            subject="You've been invited as a RostraCore SuperAdmin",
            html_body=f"""
            <h2>SuperAdmin Invitation</h2>
            <p>Hello {request.full_name},</p>
            <p>You have been invited to become a SuperAdmin on RostraCore by {current_user.full_name or current_user.username}.</p>
            <p>Click the link below to accept the invitation and set your password:</p>
            <p><a href="{invitation_url}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Accept Invitation</a></p>
            <p>Or copy this link: {invitation_url}</p>
            <p><strong>This invitation expires in 7 days.</strong></p>
            <p>If you did not expect this invitation, please ignore this email.</p>
            <hr>
            <p style="color: #6b7280; font-size: 12px;">RostraCore - Security Workforce Management</p>
            """
        )
        if result.get("status") == "success":
            email_sent = True
    except Exception as e:
        logger.warning(f"Failed to send superadmin invitation email: {e}")

    logger.info(f"Superadmin invitation created for {request.email} by user {current_user.user_id}")

    return {
        "status": "success",
        "message": f"Invitation sent to {request.email}",
        "invitation_id": invitation.invitation_id,
        "email_sent": email_sent,
        "invitation_url": invitation_url if not email_sent else None,  # Only show URL if email failed
        "expires_at": invitation.expires_at
    }


@router.get("/invitations", response_model=List[InvitationResponse])
async def list_superadmin_invitations(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    List all superadmin invitations.

    Returns pending, accepted, and revoked invitations.
    """
    invitations = db.query(SuperadminInvitation).order_by(
        SuperadminInvitation.created_at.desc()
    ).all()

    result = []
    for inv in invitations:
        # Get inviter username
        inviter = db.query(User).filter(User.user_id == inv.invited_by).first()

        result.append(InvitationResponse(
            invitation_id=inv.invitation_id,
            email=inv.email,
            invited_by_username=inviter.username if inviter else None,
            created_at=inv.created_at,
            expires_at=inv.expires_at,
            is_expired=inv.expires_at < datetime.utcnow(),
            is_accepted=inv.accepted_at is not None,
            is_revoked=inv.revoked
        ))

    return result


@router.delete("/invitations/{invitation_id}")
async def revoke_superadmin_invitation(
    invitation_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    Revoke a pending superadmin invitation.
    """
    invitation = db.query(SuperadminInvitation).filter(
        SuperadminInvitation.invitation_id == invitation_id
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.accepted_at:
        raise HTTPException(status_code=400, detail="Cannot revoke an accepted invitation")

    if invitation.revoked:
        raise HTTPException(status_code=400, detail="Invitation already revoked")

    invitation.revoked = True
    invitation.revoked_at = datetime.utcnow()
    invitation.revoked_by = current_user.user_id

    db.commit()

    logger.info(f"Superadmin invitation {invitation_id} revoked by user {current_user.user_id}")

    return {"status": "success", "message": "Invitation revoked"}


@router.post("/accept-invitation")
async def accept_superadmin_invitation(
    request: AcceptInvitationRequest,
    db: Session = Depends(get_db)
):
    """
    Accept a superadmin invitation and create the user account.

    This is a PUBLIC endpoint (no auth required) - the token serves as authentication.
    """
    # Find the invitation
    invitation = db.query(SuperadminInvitation).filter(
        SuperadminInvitation.token == request.token
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid invitation token")

    if invitation.revoked:
        raise HTTPException(status_code=400, detail="This invitation has been revoked")

    if invitation.accepted_at:
        raise HTTPException(status_code=400, detail="This invitation has already been accepted")

    if invitation.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This invitation has expired")

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == invitation.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    # Generate username from email
    base_username = invitation.email.split("@")[0]
    username = base_username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1

    # Create the superadmin user (no org_id)
    new_user = User(
        username=username,
        email=invitation.email,
        hashed_password=get_password_hash(request.password),
        full_name=request.full_name,
        role=UserRole.SUPERADMIN,
        org_id=None,  # Superadmins don't belong to any org
        is_active=True,
        is_email_verified=True,  # Verified via invitation link
        is_owner=False
    )
    db.add(new_user)
    db.flush()  # Get user ID

    # Mark invitation as accepted
    invitation.accepted_at = datetime.utcnow()
    invitation.accepted_user_id = new_user.user_id

    db.commit()
    db.refresh(new_user)

    logger.info(f"Superadmin invitation accepted: {invitation.email} -> user {new_user.user_id}")

    return {
        "status": "success",
        "message": "Account created successfully. You can now log in.",
        "username": new_user.username,
        "email": new_user.email
    }


@router.get("/invitations/validate/{token}")
async def validate_invitation_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Validate an invitation token (public endpoint).

    Used by the frontend to check if a token is valid before showing the accept form.
    """
    invitation = db.query(SuperadminInvitation).filter(
        SuperadminInvitation.token == token
    ).first()

    if not invitation:
        return {"valid": False, "reason": "Invalid token"}

    if invitation.revoked:
        return {"valid": False, "reason": "Invitation has been revoked"}

    if invitation.accepted_at:
        return {"valid": False, "reason": "Invitation has already been accepted"}

    if invitation.expires_at < datetime.utcnow():
        return {"valid": False, "reason": "Invitation has expired"}

    return {
        "valid": True,
        "email": invitation.email,
        "expires_at": invitation.expires_at
    }
