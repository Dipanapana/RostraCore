"""Shift handover notes — end-of-shift notes for incoming guards."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.shift_handover import ShiftHandover
from app.models.employee import Employee
from app.models.site import Site
from app.auth.security import get_current_org_id

router = APIRouter()

PRIORITIES = ["low", "normal", "high", "urgent"]


class HandoverCreate(BaseModel):
    site_id: int
    shift_id: Optional[int] = None
    outgoing_employee_id: Optional[int] = None
    incoming_employee_id: Optional[int] = None
    summary: str
    incidents_note: Optional[str] = None
    ongoing_issues: Optional[str] = None
    instructions: Optional[str] = None
    equipment_status: Optional[str] = None
    keys_handed: bool = True
    priority: str = "normal"


class HandoverAcknowledge(BaseModel):
    acknowledged: bool = True


def _build_response(h: ShiftHandover, db: Session) -> dict:
    site = db.query(Site).get(h.site_id) if h.site_id else None
    outgoing = db.query(Employee).get(h.outgoing_employee_id) if h.outgoing_employee_id else None
    incoming = db.query(Employee).get(h.incoming_employee_id) if h.incoming_employee_id else None

    return {
        "handover_id": h.handover_id,
        "site_id": h.site_id,
        "site_name": site.site_name if site else None,
        "shift_id": h.shift_id,
        "outgoing_employee_id": h.outgoing_employee_id,
        "outgoing_employee_name": f"{outgoing.first_name} {outgoing.last_name}".strip() if outgoing else None,
        "incoming_employee_id": h.incoming_employee_id,
        "incoming_employee_name": f"{incoming.first_name} {incoming.last_name}".strip() if incoming else None,
        "summary": h.summary,
        "incidents_note": h.incidents_note,
        "ongoing_issues": h.ongoing_issues,
        "instructions": h.instructions,
        "equipment_status": h.equipment_status,
        "keys_handed": h.keys_handed,
        "priority": h.priority,
        "acknowledged": h.acknowledged,
        "acknowledged_at": h.acknowledged_at.isoformat() if h.acknowledged_at else None,
        "created_at": h.created_at.isoformat() if h.created_at else None,
    }


@router.get("/")
def list_handovers(
    site_id: Optional[int] = None,
    acknowledged: Optional[bool] = None,
    priority: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    q = db.query(ShiftHandover).filter(ShiftHandover.org_id == org_id)
    if site_id:
        q = q.filter(ShiftHandover.site_id == site_id)
    if acknowledged is not None:
        q = q.filter(ShiftHandover.acknowledged == acknowledged)
    if priority:
        q = q.filter(ShiftHandover.priority == priority)
    q = q.order_by(ShiftHandover.created_at.desc())
    rows = q.limit(limit).all()
    return {"items": [_build_response(r, db) for r in rows], "total": len(rows)}


@router.post("/", status_code=201)
def create_handover(
    body: HandoverCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    if body.priority not in PRIORITIES:
        raise HTTPException(400, f"priority must be one of: {', '.join(PRIORITIES)}")
    site = db.query(Site).filter(Site.site_id == body.site_id, Site.org_id == org_id).first()
    if not site:
        raise HTTPException(404, "Site not found")

    rec = ShiftHandover(
        org_id=org_id,
        site_id=body.site_id,
        shift_id=body.shift_id,
        outgoing_employee_id=body.outgoing_employee_id,
        incoming_employee_id=body.incoming_employee_id,
        summary=body.summary,
        incidents_note=body.incidents_note,
        ongoing_issues=body.ongoing_issues,
        instructions=body.instructions,
        equipment_status=body.equipment_status,
        keys_handed=body.keys_handed,
        priority=body.priority,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.put("/{handover_id}/acknowledge")
def acknowledge_handover(
    handover_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(ShiftHandover).filter(
        ShiftHandover.handover_id == handover_id, ShiftHandover.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Handover not found")
    rec.acknowledged = True
    rec.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.delete("/{handover_id}/")
def delete_handover(
    handover_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(ShiftHandover).filter(
        ShiftHandover.handover_id == handover_id, ShiftHandover.org_id == org_id
    ).first()
    if not rec:
        raise HTTPException(404, "Handover not found")
    db.delete(rec)
    db.commit()
    return {"detail": "deleted"}


@router.get("/dashboard")
def handover_dashboard(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    records = db.query(ShiftHandover).filter(ShiftHandover.org_id == org_id).all()
    total = len(records)
    unacknowledged = sum(1 for r in records if not r.acknowledged)
    high_priority = sum(1 for r in records if r.priority in ("high", "urgent") and not r.acknowledged)

    by_priority: dict = {}
    for r in records:
        by_priority[r.priority] = by_priority.get(r.priority, 0) + 1

    by_site: dict = {}
    for r in records:
        site = db.query(Site).get(r.site_id)
        name = site.site_name if site else f"Site {r.site_id}"
        if name not in by_site:
            by_site[name] = {"total": 0, "unacknowledged": 0}
        by_site[name]["total"] += 1
        if not r.acknowledged:
            by_site[name]["unacknowledged"] += 1

    return {
        "total_handovers": total,
        "unacknowledged": unacknowledged,
        "high_priority_pending": high_priority,
        "by_priority": by_priority,
        "by_site": by_site,
    }
