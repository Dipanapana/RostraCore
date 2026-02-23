"""POPIA compliance endpoints -- consent management and data subject requests."""

from datetime import datetime, timedelta, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.popia import POPIAConsent, DataSubjectRequest, ConsentType, RequestType, RequestStatus
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ConsentCreate(BaseModel):
    employee_id: int
    consent_type: str
    purpose: str
    lawful_basis: str
    data_categories: Optional[str] = None


class RequestCreate(BaseModel):
    requestor_name: str
    requestor_email: str
    request_type: str
    description: str


class RequestUpdate(BaseModel):
    status: Optional[str] = None
    response_notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Consent Endpoints
# ---------------------------------------------------------------------------

@router.post("/consent", status_code=status.HTTP_201_CREATED)
def record_consent(
    data: ConsentCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Record a POPIA consent grant."""
    consent = POPIAConsent(
        org_id=org_id,
        employee_id=data.employee_id,
        consent_type=data.consent_type,
        purpose=data.purpose,
        lawful_basis=data.lawful_basis,
        data_categories=data.data_categories,
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)

    return {
        "consent_id": consent.consent_id,
        "employee_id": consent.employee_id,
        "consent_type": consent.consent_type.value if hasattr(consent.consent_type, 'value') else consent.consent_type,
        "granted_at": consent.granted_at.isoformat() if consent.granted_at else None,
        "is_active": consent.is_active,
    }


@router.get("/consent")
def list_consents(
    employee_id: Optional[int] = None,
    consent_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List POPIA consents for the organization."""
    query = db.query(POPIAConsent).filter(POPIAConsent.org_id == org_id)
    if employee_id:
        query = query.filter(POPIAConsent.employee_id == employee_id)
    if consent_type:
        query = query.filter(POPIAConsent.consent_type == consent_type)

    consents = query.order_by(POPIAConsent.granted_at.desc()).all()

    return [
        {
            "consent_id": c.consent_id,
            "employee_id": c.employee_id,
            "employee_name": f"{c.employee.first_name} {c.employee.last_name}" if c.employee else None,
            "consent_type": c.consent_type.value if hasattr(c.consent_type, 'value') else c.consent_type,
            "purpose": c.purpose,
            "lawful_basis": c.lawful_basis,
            "data_categories": c.data_categories,
            "granted_at": c.granted_at.isoformat() if c.granted_at else None,
            "withdrawn_at": c.withdrawn_at.isoformat() if c.withdrawn_at else None,
            "is_active": c.is_active,
        }
        for c in consents
    ]


@router.post("/consent/{consent_id}/withdraw")
def withdraw_consent(
    consent_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Withdraw a previously granted consent."""
    consent = db.query(POPIAConsent).filter(
        POPIAConsent.consent_id == consent_id,
        POPIAConsent.org_id == org_id,
    ).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found.")

    consent.withdrawn_at = datetime.utcnow()
    consent.is_active = 0
    db.commit()

    return {"status": "withdrawn", "consent_id": consent_id}


# ---------------------------------------------------------------------------
# Data Subject Request Endpoints
# ---------------------------------------------------------------------------

@router.post("/requests", status_code=status.HTTP_201_CREATED)
def create_request(
    data: RequestCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Create a data subject request (access, rectification, erasure, etc.)."""
    valid_types = [t.value for t in RequestType]
    if data.request_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid request type. Must be one of: {valid_types}")

    req = DataSubjectRequest(
        org_id=org_id,
        requestor_name=data.requestor_name,
        requestor_email=data.requestor_email,
        request_type=data.request_type,
        description=data.description,
        due_date=date.today() + timedelta(days=30),  # POPIA requires response within 30 days
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return {
        "request_id": req.request_id,
        "requestor_name": req.requestor_name,
        "request_type": req.request_type.value if hasattr(req.request_type, 'value') else req.request_type,
        "status": req.status.value if hasattr(req.status, 'value') else req.status,
        "due_date": req.due_date.isoformat() if req.due_date else None,
    }


@router.get("/requests")
def list_requests(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all data subject requests."""
    query = db.query(DataSubjectRequest).filter(DataSubjectRequest.org_id == org_id)
    if status_filter:
        query = query.filter(DataSubjectRequest.status == status_filter)

    requests = query.order_by(DataSubjectRequest.created_at.desc()).all()

    return [
        {
            "request_id": r.request_id,
            "requestor_name": r.requestor_name,
            "requestor_email": r.requestor_email,
            "request_type": r.request_type.value if hasattr(r.request_type, 'value') else r.request_type,
            "description": r.description,
            "status": r.status.value if hasattr(r.status, 'value') else r.status,
            "due_date": r.due_date.isoformat() if r.due_date else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "response_notes": r.response_notes,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in requests
    ]


@router.put("/requests/{request_id}")
def update_request(
    request_id: int,
    data: RequestUpdate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update a data subject request status and notes."""
    req = db.query(DataSubjectRequest).filter(
        DataSubjectRequest.request_id == request_id,
        DataSubjectRequest.org_id == org_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    if data.status:
        valid_statuses = [s.value for s in RequestStatus]
        if data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        req.status = data.status
        if data.status in ("completed", "denied"):
            req.completed_at = datetime.utcnow()
            req.handled_by_user_id = current_user.user_id

    if data.response_notes:
        req.response_notes = data.response_notes

    db.commit()
    db.refresh(req)

    return {"status": "updated", "request_id": request_id}


@router.get("/dashboard")
def popia_dashboard(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """POPIA compliance dashboard -- summary stats."""
    total_consents = db.query(func.count(POPIAConsent.consent_id)).filter(POPIAConsent.org_id == org_id).scalar() or 0
    active_consents = db.query(func.count(POPIAConsent.consent_id)).filter(POPIAConsent.org_id == org_id, POPIAConsent.is_active == 1).scalar() or 0
    withdrawn_consents = total_consents - active_consents

    total_requests = db.query(func.count(DataSubjectRequest.request_id)).filter(DataSubjectRequest.org_id == org_id).scalar() or 0
    pending_requests = db.query(func.count(DataSubjectRequest.request_id)).filter(
        DataSubjectRequest.org_id == org_id,
        DataSubjectRequest.status.in_([RequestStatus.RECEIVED, RequestStatus.PROCESSING]),
    ).scalar() or 0
    overdue_requests = db.query(func.count(DataSubjectRequest.request_id)).filter(
        DataSubjectRequest.org_id == org_id,
        DataSubjectRequest.status.in_([RequestStatus.RECEIVED, RequestStatus.PROCESSING]),
        DataSubjectRequest.due_date < date.today(),
    ).scalar() or 0

    return {
        "total_consents": total_consents,
        "active_consents": active_consents,
        "withdrawn_consents": withdrawn_consents,
        "total_requests": total_requests,
        "pending_requests": pending_requests,
        "overdue_requests": overdue_requests,
    }
