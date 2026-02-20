"""Document management endpoints.

Register, list, and manage employee documents (contracts, IDs, certificates, etc.).
Maps to existing documents table.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Document, DocumentCategory
from app.models.employee import Employee
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DocumentCreate(BaseModel):
    filename: str
    document_type: str = "other"
    employee_id: Optional[int] = None
    file_size: int = 0
    mime_type: str = "application/octet-stream"
    s3_key: str = ""
    tags: Optional[List[str]] = None
    expires_at: Optional[datetime] = None


class DocumentUpdate(BaseModel):
    filename: Optional[str] = None
    document_type: Optional[str] = None
    tags: Optional[List[str]] = None
    expires_at: Optional[datetime] = None
    employee_id: Optional[int] = None


def _build_response(d: Document, db: Session) -> dict:
    emp = db.query(Employee).get(d.employee_id) if d.employee_id else None
    return {
        "document_id": d.document_id,
        "employee_id": d.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
        "filename": d.filename,
        "file_size": d.file_size,
        "mime_type": d.mime_type,
        "s3_key": d.s3_key,
        "document_type": d.document_type,
        "tags": d.tags or [],
        "expires_at": d.expires_at,
        "version_number": d.version_number,
        "is_latest_version": d.is_latest_version,
        "uploaded_by_user_id": d.uploaded_by_user_id,
        "uploaded_at": d.uploaded_at,
        "updated_at": d.updated_at,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_documents(
    employee_id: Optional[int] = None,
    document_type: Optional[str] = None,
    search: Optional[str] = None,
    include_deleted: bool = False,
    limit: int = Query(100, le=500),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List documents for the org."""
    q = db.query(Document).filter(Document.org_id == org_id)

    if not include_deleted:
        q = q.filter(Document.deleted_at.is_(None))
    if employee_id:
        q = q.filter(Document.employee_id == employee_id)
    if document_type:
        q = q.filter(Document.document_type == document_type)
    if search:
        like = f"%{search}%"
        q = q.filter(Document.filename.ilike(like))

    total = q.count()
    docs = q.order_by(Document.uploaded_at.desc()).offset(offset).limit(limit).all()

    return {
        "items": [_build_response(d, db) for d in docs],
        "total": total,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_document(
    body: DocumentCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a new document record."""
    d = Document(
        org_id=org_id,
        employee_id=body.employee_id,
        filename=body.filename,
        file_size=body.file_size,
        mime_type=body.mime_type,
        s3_key=body.s3_key,
        document_type=body.document_type,
        tags=body.tags,
        expires_at=body.expires_at,
        uploaded_by_user_id=current_user.user_id,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _build_response(d, db)


@router.put("/{document_id}/")
def update_document(
    document_id: int,
    body: DocumentUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update document metadata."""
    d = db.query(Document).filter(
        Document.document_id == document_id,
        Document.org_id == org_id,
        Document.deleted_at.is_(None),
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")

    if body.filename is not None:
        d.filename = body.filename
    if body.document_type is not None:
        d.document_type = body.document_type
    if body.tags is not None:
        d.tags = body.tags
    if body.expires_at is not None:
        d.expires_at = body.expires_at
    if body.employee_id is not None:
        d.employee_id = body.employee_id

    d.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(d)
    return _build_response(d, db)


@router.delete("/{document_id}/", status_code=status.HTTP_204_NO_CONTENT)
def soft_delete_document(
    document_id: int,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete a document."""
    d = db.query(Document).filter(
        Document.document_id == document_id,
        Document.org_id == org_id,
        Document.deleted_at.is_(None),
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")

    d.deleted_at = datetime.utcnow()
    d.deleted_by_user_id = current_user.user_id
    db.commit()


# ---------------------------------------------------------------------------
# Summary / Dashboard
# ---------------------------------------------------------------------------

@router.get("/summary/")
def document_summary(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Document management summary stats."""
    docs = db.query(Document).filter(
        Document.org_id == org_id,
        Document.deleted_at.is_(None),
    ).all()

    total = len(docs)
    now = datetime.utcnow()

    # Expiring soon (within 30 days)
    expiring_soon = sum(
        1 for d in docs
        if d.expires_at and d.expires_at > now and (d.expires_at - now).days <= 30
    )
    expired = sum(1 for d in docs if d.expires_at and d.expires_at <= now)

    # By type
    type_counts: dict = {}
    for d in docs:
        t = d.document_type or "other"
        type_counts[t] = type_counts.get(t, 0) + 1

    # Employee docs vs general
    employee_docs = sum(1 for d in docs if d.employee_id)
    general_docs = total - employee_docs

    # Total file size
    total_size = sum(d.file_size or 0 for d in docs)

    return {
        "total": total,
        "employee_docs": employee_docs,
        "general_docs": general_docs,
        "expiring_soon": expiring_soon,
        "expired": expired,
        "total_size_bytes": total_size,
        "by_type": sorted(type_counts.items(), key=lambda x: x[1], reverse=True),
    }
