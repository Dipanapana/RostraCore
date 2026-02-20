"""Client reports portal endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.client_report import ClientReport
from app.models.client import Client
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()

REPORT_TYPES = ["monthly_summary", "incident_report", "sla_review", "coverage_report"]


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ReportCreate(BaseModel):
    client_id: int
    site_id: Optional[int] = None
    title: str
    report_type: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    summary: Optional[str] = None
    content_json: Optional[str] = None


class ReportUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content_json: Optional[str] = None
    status: Optional[str] = None


def _build_response(r: ClientReport, db: Session) -> dict:
    client = db.query(Client).get(r.client_id) if r.client_id else None
    site = db.query(Site).get(r.site_id) if r.site_id else None
    return {
        "report_id": r.report_id,
        "client_id": r.client_id,
        "client_name": client.client_name if client else None,
        "site_id": r.site_id,
        "site_name": site.site_name if site else None,
        "title": r.title,
        "report_type": r.report_type,
        "period_start": r.period_start.isoformat() if r.period_start else None,
        "period_end": r.period_end.isoformat() if r.period_end else None,
        "summary": r.summary,
        "content_json": r.content_json,
        "status": r.status,
        "published_at": r.published_at.isoformat() if r.published_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_client_reports(
    client_id: Optional[int] = None,
    report_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    q = db.query(ClientReport).filter(ClientReport.org_id == org_id)
    if client_id:
        q = q.filter(ClientReport.client_id == client_id)
    if report_type:
        q = q.filter(ClientReport.report_type == report_type)
    if status:
        q = q.filter(ClientReport.status == status)
    q = q.order_by(ClientReport.created_at.desc())
    rows = q.all()
    return {"items": [_build_response(r, db) for r in rows], "total": len(rows)}


@router.post("/", status_code=201)
def create_client_report(
    body: ReportCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
):
    if body.report_type not in REPORT_TYPES:
        raise HTTPException(400, f"report_type must be one of: {', '.join(REPORT_TYPES)}")

    rec = ClientReport(
        org_id=org_id,
        client_id=body.client_id,
        site_id=body.site_id,
        title=body.title,
        report_type=body.report_type,
        period_start=body.period_start,
        period_end=body.period_end,
        summary=body.summary,
        content_json=body.content_json,
        created_by_user_id=current_user.user_id,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.put("/{report_id}/")
def update_client_report(
    report_id: int,
    body: ReportUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(ClientReport).filter(
        ClientReport.report_id == report_id, ClientReport.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Client report not found")

    for field, val in body.dict(exclude_unset=True).items():
        setattr(rec, field, val)

    if body.status == "published" and not rec.published_at:
        rec.published_at = datetime.utcnow()

    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.delete("/{report_id}/")
def delete_client_report(
    report_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(ClientReport).filter(
        ClientReport.report_id == report_id, ClientReport.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Client report not found")
    db.delete(rec)
    db.commit()
    return {"detail": "deleted"}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard")
def client_reports_dashboard(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    reports = db.query(ClientReport).filter(ClientReport.org_id == org_id).all()

    total = len(reports)
    draft = sum(1 for r in reports if r.status == "draft")
    published = sum(1 for r in reports if r.status == "published")
    archived = sum(1 for r in reports if r.status == "archived")

    # By type
    type_counts: dict = {}
    for r in reports:
        type_counts[r.report_type] = type_counts.get(r.report_type, 0) + 1

    # By client
    client_counts: dict = {}
    for r in reports:
        client_counts[r.client_id] = client_counts.get(r.client_id, 0) + 1
    by_client = []
    for cid, cnt in sorted(client_counts.items(), key=lambda x: -x[1])[:10]:
        client = db.query(Client).get(cid)
        by_client.append({
            "client_id": cid,
            "client_name": client.client_name if client else "Unknown",
            "report_count": cnt,
        })

    return {
        "total": total,
        "draft": draft,
        "published": published,
        "archived": archived,
        "by_type": [[k, v] for k, v in type_counts.items()],
        "by_client": by_client,
    }
