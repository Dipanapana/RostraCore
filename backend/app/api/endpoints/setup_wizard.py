"""Setup wizard API endpoints for onboarding new organizations."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session
from typing import Optional, List, Any
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models import Organization, User, IndustryTemplate
from app.models.user import UserRole
from app.templates.engine import TemplateEngine
from app.auth.security import get_password_hash, create_access_token

router = APIRouter(prefix="/api/setup-wizard", tags=["Setup Wizard"])


# --- Pydantic Schemas ---

class HierarchyNode(BaseModel):
    """Single node in org hierarchy."""
    name: str
    type: str  # organization, division, location, department
    code: Optional[str] = None
    children: Optional[List['HierarchyNode']] = None


class DraftStepData(BaseModel):
    """Data for a single wizard step."""
    step: int
    data: dict


class WizardCompleteData(BaseModel):
    """Complete wizard submission data."""
    # Step 1: Industry
    industry_template_id: str

    # Step 2: Company
    company_name: str
    org_code: str
    billing_email: Optional[EmailStr] = None

    # Step 3: Hierarchy (optional)
    hierarchy_nodes: Optional[List[dict]] = None
    skip_hierarchy: bool = False

    # Step 4: Admin user
    admin_email: EmailStr
    admin_full_name: str
    admin_password: str

    @field_validator('org_code')
    @classmethod
    def validate_org_code(cls, v):
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('org_code must be alphanumeric (hyphens and underscores allowed)')
        return v.upper()


# --- Endpoints ---

@router.get("/templates")
async def list_industry_templates(db: Session = Depends(get_db)):
    """
    List all available industry templates for wizard Step 1.

    Returns template_id, display_name, description, icon for UI display.
    """
    templates = db.query(IndustryTemplate).filter(
        IndustryTemplate.is_active == True
    ).order_by(IndustryTemplate.display_order).all()

    return [
        {
            "template_id": t.template_id,
            "display_name": t.display_name,
            "description": t.description,
            "icon": t.icon,
            "preview": TemplateEngine.get_roles(t.template_id)[:3]  # Show first 3 roles as preview
        }
        for t in templates
    ]


@router.post("/draft")
async def save_draft(step_data: DraftStepData, org_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Save wizard progress (called after each step).

    Creates draft organization on first call, updates on subsequent calls.
    Draft state survives browser refresh.

    Args:
        step_data: Current step number and data
        org_id: Existing draft organization ID (None for new wizard)

    Returns:
        org_id: Draft organization ID for subsequent calls
        last_step: Current step number
    """
    if org_id:
        # Update existing draft
        org = db.query(Organization).filter_by(org_id=org_id).first()
        if not org:
            raise HTTPException(404, "Draft organization not found")
        if org.approval_status != "draft":
            raise HTTPException(400, "Organization is not in draft state")
        wizard_data = org.setup_wizard_data or {}
    else:
        # Create new draft organization
        draft_code = f"DRAFT-{uuid.uuid4().hex[:8].upper()}"
        org = Organization(
            company_name="Draft Organization",
            org_code=draft_code,
            industry_template_id="security",  # Default, will be updated
            subscription_status="trial",
            approval_status="draft",  # Mark as draft
            is_active=False,  # Not active until wizard completes
            setup_wizard_data={},
        )
        db.add(org)
        db.flush()
        wizard_data = {}

    # Store step data
    wizard_data[f'step_{step_data.step}'] = step_data.data
    wizard_data['last_step'] = step_data.step
    wizard_data['last_updated'] = datetime.utcnow().isoformat()
    org.setup_wizard_data = wizard_data

    db.commit()

    return {"org_id": org.org_id, "last_step": step_data.step}


@router.get("/resume/{org_id}")
async def resume_wizard(org_id: int, db: Session = Depends(get_db)):
    """
    Resume incomplete wizard from draft state.

    Returns all saved step data and last completed step.
    """
    org = db.query(Organization).filter_by(org_id=org_id).first()
    if not org:
        raise HTTPException(404, "Draft organization not found")
    if org.approval_status != "draft":
        raise HTTPException(400, "Organization setup already completed")

    return {
        "org_id": org.org_id,
        "last_step": org.setup_wizard_data.get('last_step', 1) if org.setup_wizard_data else 1,
        "data": org.setup_wizard_data or {}
    }


@router.post("/complete")
async def complete_wizard(data: WizardCompleteData, org_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Complete setup wizard - atomic transaction creates/updates org + admin user.

    Args:
        data: Complete wizard data from all steps
        org_id: Draft organization ID (if resuming)

    Returns:
        org_id: Created/updated organization ID
        admin_user_id: Created admin user ID
        access_token: JWT for immediate login
    """
    # Validate industry template exists
    template = db.query(IndustryTemplate).filter_by(template_id=data.industry_template_id).first()
    if not template:
        raise HTTPException(400, f"Invalid industry template: {data.industry_template_id}")

    # Check org_code uniqueness (exclude current draft if resuming)
    existing = db.query(Organization).filter(
        Organization.org_code == data.org_code,
        Organization.org_id != org_id if org_id else True
    ).first()
    if existing:
        raise HTTPException(400, f"Organization code '{data.org_code}' already exists")

    # Check admin email uniqueness
    existing_user = db.query(User).filter_by(email=data.admin_email).first()
    if existing_user:
        raise HTTPException(400, f"Email '{data.admin_email}' already registered")

    try:
        # Get or create organization
        if org_id:
            org = db.query(Organization).filter_by(org_id=org_id).first()
            if not org:
                raise HTTPException(404, "Draft organization not found")
        else:
            org = Organization()
            db.add(org)

        # Update organization with wizard data
        org.company_name = data.company_name
        org.org_code = data.org_code
        org.industry_template_id = data.industry_template_id
        org.billing_email = data.billing_email
        org.subscription_status = 'trial'
        org.trial_start_date = datetime.utcnow()
        org.trial_end_date = datetime.utcnow() + timedelta(days=14)
        org.approval_status = 'approved'
        org.is_active = True
        org.template_overrides = {}  # Start with industry defaults
        org.setup_wizard_data = None  # Clear draft data

        db.flush()

        # Create admin user
        admin = User(
            username=data.admin_email.split('@')[0],
            email=data.admin_email,
            full_name=data.admin_full_name,
            hashed_password=get_password_hash(data.admin_password),
            role=UserRole.COMPANY_ADMIN,
            org_id=org.org_id,
            is_owner=True,
            is_active=True,
            is_email_verified=False,
        )
        db.add(admin)
        db.flush()

        # TODO: Store hierarchy nodes if provided (Phase 0 Plan 03)
        # For now, hierarchy_nodes is captured but not persisted

        db.commit()

        # Generate access token for immediate login
        access_token = create_access_token(
            data={"sub": admin.email, "user_id": admin.user_id, "org_id": org.org_id}
        )

        return {
            "status": "success",
            "org_id": org.org_id,
            "admin_user_id": admin.user_id,
            "access_token": access_token,
            "industry_template": {
                "template_id": template.template_id,
                "display_name": template.display_name
            },
            "message": f"Welcome to RostraCore! Your {template.display_name} organization is ready. 14-day free trial started."
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Setup failed: {str(e)}")


@router.get("/validate/org-code/{org_code}")
async def validate_org_code(org_code: str, db: Session = Depends(get_db)):
    """Check if organization code is available."""
    existing = db.query(Organization).filter_by(org_code=org_code.upper()).first()
    return {"available": existing is None, "org_code": org_code.upper()}
