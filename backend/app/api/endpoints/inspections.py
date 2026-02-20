"""Site inspection checklist endpoints.

Admins manage templates; guards complete inspections; management views completion data.
"""

from datetime import datetime
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.inspection import InspectionTemplate, Inspection, InspectionStatus
from app.models.site import Site
from app.models.employee import Employee
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChecklistItem(BaseModel):
    key: str
    label: str
    required: bool = True


class TemplateCreate(BaseModel):
    site_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    items: List[ChecklistItem]


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    site_id: Optional[int] = None
    is_active: Optional[bool] = None
    items: Optional[List[ChecklistItem]] = None


class InspectionCreate(BaseModel):
    template_id: int
    site_id: int


class InspectionItemResponse(BaseModel):
    checked: bool = False
    note: Optional[str] = None


class InspectionSubmit(BaseModel):
    responses: dict[str, InspectionItemResponse]
    overall_notes: Optional[str] = None


# ---------------------------------------------------------------------------
# TEMPLATES — CRUD
# ---------------------------------------------------------------------------

@router.get("/templates/")
def list_templates(
    site_id: Optional[int] = None,
    active_only: bool = True,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List inspection templates for the org."""
    q = db.query(InspectionTemplate).filter(InspectionTemplate.org_id == org_id)
    if site_id:
        q = q.filter((InspectionTemplate.site_id == site_id) | (InspectionTemplate.site_id.is_(None)))
    if active_only:
        q = q.filter(InspectionTemplate.is_active == True)

    templates = q.order_by(InspectionTemplate.name).all()

    results = []
    for t in templates:
        site = db.query(Site).get(t.site_id) if t.site_id else None
        results.append({
            "template_id": t.template_id,
            "org_id": t.org_id,
            "site_id": t.site_id,
            "site_name": site.site_name if site else "All Sites",
            "name": t.name,
            "description": t.description,
            "is_active": t.is_active,
            "items": t.items,
            "item_count": len(t.items) if t.items else 0,
            "created_at": t.created_at,
        })
    return results


@router.post("/templates/", status_code=status.HTTP_201_CREATED)
def create_template(
    body: TemplateCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new inspection checklist template."""
    template = InspectionTemplate(
        org_id=org_id,
        site_id=body.site_id,
        name=body.name,
        description=body.description,
        items=[item.dict() for item in body.items],
        created_by=current_user.user_id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    site = db.query(Site).get(template.site_id) if template.site_id else None
    return {
        "template_id": template.template_id,
        "org_id": template.org_id,
        "site_id": template.site_id,
        "site_name": site.site_name if site else "All Sites",
        "name": template.name,
        "description": template.description,
        "is_active": template.is_active,
        "items": template.items,
        "item_count": len(template.items) if template.items else 0,
        "created_at": template.created_at,
    }


@router.put("/templates/{template_id}")
def update_template(
    template_id: int,
    body: TemplateUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update an inspection template."""
    template = db.query(InspectionTemplate).filter(
        InspectionTemplate.template_id == template_id,
        InspectionTemplate.org_id == org_id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if body.name is not None:
        template.name = body.name
    if body.description is not None:
        template.description = body.description
    if body.site_id is not None:
        template.site_id = body.site_id
    if body.is_active is not None:
        template.is_active = body.is_active
    if body.items is not None:
        template.items = [item.dict() for item in body.items]

    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)

    site = db.query(Site).get(template.site_id) if template.site_id else None
    return {
        "template_id": template.template_id,
        "org_id": template.org_id,
        "site_id": template.site_id,
        "site_name": site.site_name if site else "All Sites",
        "name": template.name,
        "description": template.description,
        "is_active": template.is_active,
        "items": template.items,
        "item_count": len(template.items) if template.items else 0,
        "created_at": template.created_at,
    }


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete (deactivate) an inspection template."""
    template = db.query(InspectionTemplate).filter(
        InspectionTemplate.template_id == template_id,
        InspectionTemplate.org_id == org_id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.is_active = False
    template.updated_at = datetime.utcnow()
    db.commit()


# ---------------------------------------------------------------------------
# INSPECTIONS — CRUD + submit
# ---------------------------------------------------------------------------

@router.get("/")
def list_inspections(
    site_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List inspections for the org."""
    q = db.query(Inspection).filter(Inspection.org_id == org_id)

    if site_id:
        q = q.filter(Inspection.site_id == site_id)
    if employee_id:
        q = q.filter(Inspection.employee_id == employee_id)
    if status_filter:
        q = q.filter(Inspection.status == status_filter)

    total = q.count()
    inspections = q.order_by(Inspection.started_at.desc()).offset(offset).limit(limit).all()

    results = []
    for insp in inspections:
        template = db.query(InspectionTemplate).get(insp.template_id)
        site = db.query(Site).get(insp.site_id)
        emp = db.query(Employee).get(insp.employee_id)
        results.append({
            "inspection_id": insp.inspection_id,
            "template_id": insp.template_id,
            "template_name": template.name if template else "Unknown",
            "site_id": insp.site_id,
            "site_name": site.site_name if site else "Unknown",
            "employee_id": insp.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            "status": insp.status,
            "responses": insp.responses,
            "overall_notes": insp.overall_notes,
            "score_pct": insp.score_pct,
            "started_at": insp.started_at,
            "completed_at": insp.completed_at,
        })

    return {"items": results, "total": total}


@router.post("/", status_code=status.HTTP_201_CREATED)
def start_inspection(
    body: InspectionCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a new inspection (guard begins checklist)."""
    template = db.query(InspectionTemplate).filter(
        InspectionTemplate.template_id == body.template_id,
        InspectionTemplate.org_id == org_id,
        InspectionTemplate.is_active == True,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found or inactive")

    # Find employee by current user email
    emp = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()
    employee_id = emp.employee_id if emp else None

    if not employee_id:
        # Allow admin to start inspection without being an employee
        employee_id = 0

    insp = Inspection(
        org_id=org_id,
        template_id=body.template_id,
        site_id=body.site_id,
        employee_id=employee_id if employee_id else body.site_id,  # fallback
        status=InspectionStatus.IN_PROGRESS.value,
        responses={},
    )
    db.add(insp)
    db.commit()
    db.refresh(insp)

    site = db.query(Site).get(insp.site_id)
    return {
        "inspection_id": insp.inspection_id,
        "template_id": insp.template_id,
        "template_name": template.name,
        "site_id": insp.site_id,
        "site_name": site.site_name if site else "Unknown",
        "employee_id": insp.employee_id,
        "status": insp.status,
        "responses": insp.responses,
        "started_at": insp.started_at,
    }


@router.post("/{inspection_id}/submit")
def submit_inspection(
    inspection_id: int,
    body: InspectionSubmit,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Submit a completed inspection with all responses."""
    insp = db.query(Inspection).filter(
        Inspection.inspection_id == inspection_id,
        Inspection.org_id == org_id,
    ).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")

    if insp.status == InspectionStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Inspection already completed")

    # Store responses
    insp.responses = {k: v.dict() for k, v in body.responses.items()}
    insp.overall_notes = body.overall_notes

    # Calculate score: % of required items that are checked
    template = db.query(InspectionTemplate).get(insp.template_id)
    if template and template.items:
        required_items = [item for item in template.items if item.get("required", True)]
        if required_items:
            checked = sum(1 for item in required_items if insp.responses.get(item["key"], {}).get("checked", False))
            insp.score_pct = round((checked / len(required_items)) * 100, 1)
        else:
            insp.score_pct = 100.0
    else:
        insp.score_pct = 100.0

    # Check if any items have issues flagged
    has_issues = any(
        not resp.get("checked", False) and resp.get("note")
        for resp in insp.responses.values()
    )
    insp.status = InspectionStatus.FLAGGED.value if has_issues else InspectionStatus.COMPLETED.value
    insp.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(insp)

    site = db.query(Site).get(insp.site_id)
    emp = db.query(Employee).get(insp.employee_id)
    return {
        "inspection_id": insp.inspection_id,
        "template_id": insp.template_id,
        "template_name": template.name if template else "Unknown",
        "site_id": insp.site_id,
        "site_name": site.site_name if site else "Unknown",
        "employee_id": insp.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
        "status": insp.status,
        "responses": insp.responses,
        "overall_notes": insp.overall_notes,
        "score_pct": insp.score_pct,
        "started_at": insp.started_at,
        "completed_at": insp.completed_at,
    }


# ---------------------------------------------------------------------------
# DASHBOARD — inspection completion stats
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def inspection_dashboard(
    days: int = Query(30, le=365),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Inspection completion statistics for the last N days."""
    since = datetime.utcnow().replace(hour=0, minute=0, second=0)
    from datetime import timedelta
    since = since - timedelta(days=days)

    inspections = db.query(Inspection).filter(
        Inspection.org_id == org_id,
        Inspection.started_at >= since,
    ).all()

    total = len(inspections)
    completed = sum(1 for i in inspections if i.status == InspectionStatus.COMPLETED.value)
    flagged = sum(1 for i in inspections if i.status == InspectionStatus.FLAGGED.value)
    in_progress = sum(1 for i in inspections if i.status == InspectionStatus.IN_PROGRESS.value)
    avg_score = round(sum(i.score_pct or 0 for i in inspections if i.score_pct is not None) / max(total, 1), 1)

    # Per-site breakdown
    site_map: dict = {}
    for insp in inspections:
        sid = insp.site_id
        if sid not in site_map:
            site = db.query(Site).get(sid)
            site_map[sid] = {"site_id": sid, "site_name": site.site_name if site else "Unknown", "total": 0, "completed": 0, "flagged": 0, "avg_score": 0, "_scores": []}
        site_map[sid]["total"] += 1
        if insp.status == InspectionStatus.COMPLETED.value:
            site_map[sid]["completed"] += 1
        if insp.status == InspectionStatus.FLAGGED.value:
            site_map[sid]["flagged"] += 1
        if insp.score_pct is not None:
            site_map[sid]["_scores"].append(insp.score_pct)

    sites = []
    for s in site_map.values():
        scores = s.pop("_scores")
        s["avg_score"] = round(sum(scores) / len(scores), 1) if scores else 0
        sites.append(s)

    return {
        "period_days": days,
        "total": total,
        "completed": completed,
        "flagged": flagged,
        "in_progress": in_progress,
        "avg_score": avg_score,
        "sites": sorted(sites, key=lambda x: x["total"], reverse=True),
    }
