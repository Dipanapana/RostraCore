"""Asset / Equipment management endpoints.

Track physical equipment (radios, firearms, keys, vests, etc.) assigned to guards.
Uses the existing 'assets' table schema.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.asset import Asset, AssetHistory, AssetStatus, AssetCategory
from app.models.employee import Employee
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AssetCreate(BaseModel):
    asset_number: str
    name: str
    category: str = "other"
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    purchase_cost: Optional[float] = None
    condition: str = "good"
    assigned_to_employee_id: Optional[int] = None
    notes: Optional[str] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    condition: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class AssetAssign(BaseModel):
    employee_id: int
    notes: Optional[str] = None


def _asset_response(a: Asset, db: Session) -> dict:
    emp = db.query(Employee).get(a.assigned_to_employee_id) if a.assigned_to_employee_id else None
    return {
        "asset_id": a.asset_id,
        "org_id": a.org_id,
        "asset_number": a.asset_number,
        "name": a.name,
        "category": a.category,
        "serial_number": a.serial_number,
        "manufacturer": a.manufacturer,
        "model": a.model,
        "status": a.status,
        "condition": a.condition,
        "assigned_to_employee_id": a.assigned_to_employee_id,
        "assigned_employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
        "purchase_cost": float(a.purchase_cost) if a.purchase_cost else 0,
        "current_book_value": float(a.current_book_value) if a.current_book_value else 0,
        "acquired_date": a.acquired_date.isoformat() if a.acquired_date else None,
        "notes": a.notes,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------

@router.get("/")
def list_assets(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    employee_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List assets for the organisation."""
    q = db.query(Asset).filter(Asset.org_id == org_id)

    if category:
        q = q.filter(Asset.category == category)
    if status_filter:
        q = q.filter(Asset.status == status_filter)
    if employee_id:
        q = q.filter(Asset.assigned_to_employee_id == employee_id)
    if search:
        q = q.filter(
            (Asset.name.ilike(f"%{search}%"))
            | (Asset.asset_number.ilike(f"%{search}%"))
            | (Asset.serial_number.ilike(f"%{search}%"))
        )

    total = q.count()
    assets = q.order_by(Asset.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "items": [_asset_response(a, db) for a in assets],
        "total": total,
    }


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_asset(
    body: AssetCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a new asset."""
    existing = db.query(Asset).filter(Asset.org_id == org_id, Asset.asset_number == body.asset_number).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Asset number '{body.asset_number}' already exists")

    asset_status = AssetStatus.AVAILABLE.value
    if body.assigned_to_employee_id:
        asset_status = AssetStatus.ISSUED.value

    asset = Asset(
        org_id=org_id,
        asset_number=body.asset_number,
        name=body.name,
        category=body.category,
        serial_number=body.serial_number or "",
        manufacturer=body.manufacturer,
        model=body.model,
        purchase_cost=body.purchase_cost or 0,
        current_book_value=body.purchase_cost or 0,
        condition=body.condition,
        status=asset_status,
        assigned_to_employee_id=body.assigned_to_employee_id,
        notes=body.notes,
        audit_trail=[],
    )
    db.add(asset)
    db.flush()

    db.add(AssetHistory(
        asset_id=asset.asset_id,
        action="created",
        performed_by=current_user.user_id,
        notes=f"Registered: {body.name}",
    ))

    if body.assigned_to_employee_id:
        db.add(AssetHistory(
            asset_id=asset.asset_id,
            action="issued",
            employee_id=body.assigned_to_employee_id,
            performed_by=current_user.user_id,
        ))

    db.commit()
    db.refresh(asset)
    return _asset_response(asset, db)


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------

@router.put("/{asset_id}")
def update_asset(
    asset_id: int,
    body: AssetUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update asset details."""
    asset = db.query(Asset).filter(Asset.asset_id == asset_id, Asset.org_id == org_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    for field in ["name", "category", "serial_number", "manufacturer", "model", "condition", "notes", "status"]:
        val = getattr(body, field, None)
        if val is not None:
            setattr(asset, field, val)

    asset.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(asset)
    return _asset_response(asset, db)


# ---------------------------------------------------------------------------
# ISSUE / RETURN
# ---------------------------------------------------------------------------

@router.post("/{asset_id}/issue")
def issue_asset(
    asset_id: int,
    body: AssetAssign,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Issue an asset to an employee."""
    asset = db.query(Asset).filter(Asset.asset_id == asset_id, Asset.org_id == org_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.status == AssetStatus.ISSUED.value and asset.assigned_to_employee_id:
        raise HTTPException(status_code=400, detail=f"Asset already issued to employee #{asset.assigned_to_employee_id}")

    asset.assigned_to_employee_id = body.employee_id
    asset.status = AssetStatus.ISSUED.value
    asset.current_location_type = "employee"
    asset.current_location_id = body.employee_id
    asset.updated_at = datetime.utcnow()

    db.add(AssetHistory(
        asset_id=asset.asset_id,
        action="issued",
        employee_id=body.employee_id,
        performed_by=current_user.user_id,
        notes=body.notes,
    ))

    db.commit()
    db.refresh(asset)
    return _asset_response(asset, db)


@router.post("/{asset_id}/return")
def return_asset(
    asset_id: int,
    notes: Optional[str] = None,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return an asset from an employee."""
    asset = db.query(Asset).filter(Asset.asset_id == asset_id, Asset.org_id == org_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    prev_employee = asset.assigned_to_employee_id
    asset.assigned_to_employee_id = None
    asset.current_location_type = "warehouse"
    asset.current_location_id = None
    asset.status = AssetStatus.AVAILABLE.value
    asset.updated_at = datetime.utcnow()

    db.add(AssetHistory(
        asset_id=asset.asset_id,
        action="returned",
        employee_id=prev_employee,
        performed_by=current_user.user_id,
        notes=notes,
    ))

    db.commit()
    db.refresh(asset)
    return _asset_response(asset, db)


# ---------------------------------------------------------------------------
# HISTORY
# ---------------------------------------------------------------------------

@router.get("/{asset_id}/history")
def get_asset_history(
    asset_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get the audit trail for an asset."""
    asset = db.query(Asset).filter(Asset.asset_id == asset_id, Asset.org_id == org_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    records = db.query(AssetHistory).filter(AssetHistory.asset_id == asset_id).order_by(AssetHistory.created_at.desc()).all()

    results = []
    for h in records:
        emp_name = None
        if h.employee_id:
            emp = db.query(Employee).get(h.employee_id)
            emp_name = f"{emp.first_name} {emp.last_name}" if emp else None
        perf_name = None
        if h.performed_by:
            user = db.query(User).get(h.performed_by)
            perf_name = f"{user.first_name} {user.last_name}" if user else None
        results.append({
            "history_id": h.history_id,
            "action": h.action,
            "employee_id": h.employee_id,
            "employee_name": emp_name,
            "performed_by_name": perf_name,
            "notes": h.notes,
            "created_at": h.created_at,
        })

    return results


# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------

@router.get("/summary/")
def asset_summary(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Summary of asset counts by status and category."""
    assets = db.query(Asset).filter(Asset.org_id == org_id).all()

    by_status: dict = {}
    by_category: dict = {}
    total_value = 0.0

    for a in assets:
        by_status[a.status] = by_status.get(a.status, 0) + 1
        by_category[a.category] = by_category.get(a.category, 0) + 1
        if a.purchase_cost:
            total_value += float(a.purchase_cost)

    return {
        "total": len(assets),
        "by_status": by_status,
        "by_category": by_category,
        "total_value": round(total_value, 2),
        "issued": by_status.get("issued", 0),
        "available": by_status.get("available", 0),
        "maintenance": by_status.get("maintenance", 0),
        "lost_or_damaged": by_status.get("lost", 0) + by_status.get("damaged", 0),
    }
