"""Client service request / ticket endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.client_request import ClientRequest
from app.models.client import Client
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()

VALID_STATUSES = {"open", "in_progress", "resolved", "cancelled"}
VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_TYPES = {"extra_guards", "shift_change", "incident_report", "contract_change", "general"}


# -- Pydantic schemas -------------------------------------------------------

class ClientRequestCreate(BaseModel):
    client_id: int
    site_id: Optional[int] = None
    requested_by: str
    request_type: str = "general"
    subject: str
    description: Optional[str] = None
    priority: str = "medium"
    assigned_to_user_id: Optional[int] = None


class ClientRequestUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    request_type: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    resolution_notes: Optional[str] = None
    site_id: Optional[int] = None
    requested_by: Optional[str] = None


# -- Helpers -----------------------------------------------------------------

def _build_response(r: ClientRequest, db: Session) -> dict:
    client = db.query(Client).get(r.client_id) if r.client_id else None
    site = db.query(Site).get(r.site_id) if r.site_id else None
    assigned_user = db.query(User).get(r.assigned_to_user_id) if r.assigned_to_user_id else None
    return {
        "request_id": r.request_id,
        "org_id": r.org_id,
        "client_id": r.client_id,
        "client_name": client.client_name if client else None,
        "site_id": r.site_id,
        "site_name": site.site_name if site else None,
        "requested_by": r.requested_by,
        "request_type": r.request_type,
        "subject": r.subject,
        "description": r.description,
        "priority": r.priority,
        "status": r.status,
        "assigned_to_user_id": r.assigned_to_user_id,
        "assigned_to_name": (assigned_user.full_name or assigned_user.email) if assigned_user else None,
        "resolution_notes": r.resolution_notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
    }


# -- Endpoints ---------------------------------------------------------------

@router.get("/")
def list_client_requests(
    client_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    request_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    q = db.query(ClientRequest).filter(ClientRequest.org_id == org_id)
    if client_id:
        q = q.filter(ClientRequest.client_id == client_id)
    if status_filter:
        q = q.filter(ClientRequest.status == status_filter)
    if priority:
        q = q.filter(ClientRequest.priority == priority)
    if request_type:
        q = q.filter(ClientRequest.request_type == request_type)
    if search:
        like = f"%{search}%"
        q = q.filter(
            ClientRequest.subject.ilike(like) | ClientRequest.description.ilike(like)
        )
    total = q.count()
    items = q.order_by(ClientRequest.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": [_build_response(r, db) for r in items], "total": total}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_client_request(
    body: ClientRequestCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.request_type not in VALID_TYPES:
        raise HTTPException(400, detail=f"Invalid request_type: {body.request_type}")
    if body.priority not in VALID_PRIORITIES:
        raise HTTPException(400, detail=f"Invalid priority: {body.priority}")
    # Verify client belongs to this org
    client = db.query(Client).filter(
        Client.client_id == body.client_id, Client.org_id == org_id
    ).first()
    if not client:
        raise HTTPException(404, detail="Client not found")

    r = ClientRequest(
        org_id=org_id,
        client_id=body.client_id,
        site_id=body.site_id,
        requested_by=body.requested_by,
        request_type=body.request_type,
        subject=body.subject,
        description=body.description,
        priority=body.priority,
        assigned_to_user_id=body.assigned_to_user_id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _build_response(r, db)


@router.get("/{request_id}")
def get_client_request(
    request_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    r = db.query(ClientRequest).filter(
        ClientRequest.request_id == request_id,
        ClientRequest.org_id == org_id,
    ).first()
    if not r:
        raise HTTPException(404, detail="Request not found")
    return _build_response(r, db)


@router.put("/{request_id}")
def update_client_request(
    request_id: int,
    body: ClientRequestUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    r = db.query(ClientRequest).filter(
        ClientRequest.request_id == request_id,
        ClientRequest.org_id == org_id,
    ).first()
    if not r:
        raise HTTPException(404, detail="Request not found")

    updates = body.model_dump(exclude_unset=True)
    for field, val in updates.items():
        if field == "status" and val not in VALID_STATUSES:
            raise HTTPException(400, detail=f"Invalid status: {val}")
        if field == "priority" and val not in VALID_PRIORITIES:
            raise HTTPException(400, detail=f"Invalid priority: {val}")
        if field == "request_type" and val not in VALID_TYPES:
            raise HTTPException(400, detail=f"Invalid request_type: {val}")
        setattr(r, field, val)

    if updates.get("status") == "resolved" and not r.resolved_at:
        r.resolved_at = datetime.utcnow()
    r.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return _build_response(r, db)


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client_request(
    request_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    r = db.query(ClientRequest).filter(
        ClientRequest.request_id == request_id,
        ClientRequest.org_id == org_id,
    ).first()
    if not r:
        raise HTTPException(404, detail="Request not found")
    db.delete(r)
    db.commit()
