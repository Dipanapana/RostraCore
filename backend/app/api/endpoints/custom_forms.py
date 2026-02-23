"""Custom digital form endpoints — template management and submissions."""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.custom_form import FormTemplate, FormSubmission, FormStatus
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    form_type: str = "checklist"
    fields: list = []
    requires_signature: bool = False
    status: str = "draft"


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[list] = None
    requires_signature: Optional[bool] = None
    status: Optional[str] = None


class SubmissionCreate(BaseModel):
    template_id: int
    site_id: Optional[int] = None
    shift_id: Optional[int] = None
    data: dict = {}
    photos: Optional[List[str]] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None


def _template_response(t: FormTemplate, db: Session) -> dict:
    submission_count = db.query(FormSubmission).filter(FormSubmission.template_id == t.template_id).count()
    return {
        "template_id": t.template_id,
        "org_id": t.org_id,
        "name": t.name,
        "description": t.description,
        "form_type": t.form_type,
        "fields": t.fields or [],
        "status": t.status.value if hasattr(t.status, 'value') else t.status,
        "requires_signature": t.requires_signature,
        "submission_count": submission_count,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _submission_response(s: FormSubmission) -> dict:
    return {
        "submission_id": s.submission_id,
        "template_id": s.template_id,
        "template_name": s.template.name if s.template else None,
        "site_id": s.site_id,
        "site_name": s.site.site_name if s.site else None,
        "submitted_by": s.submitted_by.email if s.submitted_by else None,
        "data": s.data or {},
        "photos": s.photos or [],
        "gps_latitude": s.gps_latitude,
        "gps_longitude": s.gps_longitude,
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
    }


# ---------------------------------------------------------------------------
# Template Endpoints
# ---------------------------------------------------------------------------

@router.post("/templates", status_code=status.HTTP_201_CREATED)
def create_template(
    data: TemplateCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Create a new form template."""
    template = FormTemplate(
        org_id=org_id,
        name=data.name,
        description=data.description,
        form_type=data.form_type,
        fields=data.fields,
        requires_signature=data.requires_signature,
        status=data.status if data.status in [s.value for s in FormStatus] else FormStatus.DRAFT,
        created_by_user_id=current_user.user_id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _template_response(template, db)


@router.get("/templates")
def list_templates(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all form templates."""
    query = db.query(FormTemplate).filter(FormTemplate.org_id == org_id)
    if status_filter:
        query = query.filter(FormTemplate.status == status_filter)
    templates = query.order_by(FormTemplate.created_at.desc()).all()
    return [_template_response(t, db) for t in templates]


@router.get("/templates/{template_id}")
def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get a specific form template."""
    t = db.query(FormTemplate).filter(FormTemplate.template_id == template_id, FormTemplate.org_id == org_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found.")
    return _template_response(t, db)


@router.put("/templates/{template_id}")
def update_template(
    template_id: int,
    data: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update a form template."""
    t = db.query(FormTemplate).filter(FormTemplate.template_id == template_id, FormTemplate.org_id == org_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(t, field, value)

    db.commit()
    db.refresh(t)
    return _template_response(t, db)


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete a form template."""
    t = db.query(FormTemplate).filter(FormTemplate.template_id == template_id, FormTemplate.org_id == org_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found.")
    db.delete(t)
    db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Submission Endpoints
# ---------------------------------------------------------------------------

@router.post("/submit", status_code=status.HTTP_201_CREATED)
def submit_form(
    data: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Submit a completed form."""
    template = db.query(FormTemplate).filter(
        FormTemplate.template_id == data.template_id,
        FormTemplate.org_id == org_id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")

    submission = FormSubmission(
        template_id=data.template_id,
        org_id=org_id,
        submitted_by_user_id=current_user.user_id,
        site_id=data.site_id,
        shift_id=data.shift_id,
        data=data.data,
        photos=data.photos,
        gps_latitude=data.gps_latitude,
        gps_longitude=data.gps_longitude,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return _submission_response(submission)


@router.get("/submissions")
def list_submissions(
    template_id: Optional[int] = None,
    site_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List form submissions."""
    query = db.query(FormSubmission).filter(FormSubmission.org_id == org_id)
    if template_id:
        query = query.filter(FormSubmission.template_id == template_id)
    if site_id:
        query = query.filter(FormSubmission.site_id == site_id)

    submissions = query.order_by(FormSubmission.submitted_at.desc()).offset(skip).limit(limit).all()
    return [_submission_response(s) for s in submissions]
