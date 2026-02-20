"""Fleet / vehicle management endpoints."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.site import Site
from app.models.employee import Employee
from app.auth.security import get_current_org_id

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class VehicleCreate(BaseModel):
    registration: str
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    colour: Optional[str] = None
    vin: Optional[str] = None
    fleet_number: Optional[str] = None
    assigned_site_id: Optional[int] = None
    assigned_employee_id: Optional[int] = None
    current_mileage: Optional[int] = None
    fuel_type: Optional[str] = None
    license_expiry: Optional[datetime] = None
    service_due_date: Optional[datetime] = None
    service_due_mileage: Optional[int] = None
    notes: Optional[str] = None


class VehicleUpdate(BaseModel):
    registration: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    colour: Optional[str] = None
    vin: Optional[str] = None
    fleet_number: Optional[str] = None
    status: Optional[str] = None
    assigned_site_id: Optional[int] = None
    assigned_employee_id: Optional[int] = None
    current_mileage: Optional[int] = None
    fuel_type: Optional[str] = None
    license_expiry: Optional[datetime] = None
    service_due_date: Optional[datetime] = None
    service_due_mileage: Optional[int] = None
    notes: Optional[str] = None


def _build_response(v: Vehicle, db: Session) -> dict:
    site = db.query(Site).get(v.assigned_site_id) if v.assigned_site_id else None
    emp = db.query(Employee).get(v.assigned_employee_id) if v.assigned_employee_id else None
    return {
        "vehicle_id": v.vehicle_id,
        "registration": v.registration,
        "make": v.make,
        "model": v.model,
        "year": v.year,
        "colour": v.colour,
        "vin": v.vin,
        "fleet_number": v.fleet_number,
        "status": v.status,
        "assigned_site_id": v.assigned_site_id,
        "assigned_site_name": site.site_name if site else None,
        "assigned_employee_id": v.assigned_employee_id,
        "assigned_employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
        "current_mileage": v.current_mileage,
        "fuel_type": v.fuel_type,
        "license_expiry": v.license_expiry,
        "service_due_date": v.service_due_date,
        "service_due_mileage": v.service_due_mileage,
        "notes": v.notes,
        "created_at": v.created_at,
        "updated_at": v.updated_at,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_vehicles(
    status_filter: Optional[str] = Query(None, alias="status"),
    assigned_site_id: Optional[int] = None,
    search: Optional[str] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List vehicles."""
    q = db.query(Vehicle).filter(Vehicle.org_id == org_id)
    if status_filter:
        q = q.filter(Vehicle.status == status_filter)
    if assigned_site_id:
        q = q.filter(Vehicle.assigned_site_id == assigned_site_id)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Vehicle.registration.ilike(like)) |
            (Vehicle.make.ilike(like)) |
            (Vehicle.model.ilike(like)) |
            (Vehicle.fleet_number.ilike(like))
        )

    items = q.order_by(Vehicle.registration).all()
    return {"items": [_build_response(v, db) for v in items], "total": len(items)}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_vehicle(
    body: VehicleCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Register a new vehicle."""
    v = Vehicle(org_id=org_id, **body.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    return _build_response(v, db)


@router.put("/{vehicle_id}/")
def update_vehicle(
    vehicle_id: int,
    body: VehicleUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update a vehicle."""
    v = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id, Vehicle.org_id == org_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(v, field, val)
    v.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(v)
    return _build_response(v, db)


@router.delete("/{vehicle_id}/", status_code=status.HTTP_204_NO_CONTENT)
def decommission_vehicle(
    vehicle_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Decommission a vehicle."""
    v = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id, Vehicle.org_id == org_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    v.status = "decommissioned"
    v.updated_at = datetime.utcnow()
    db.commit()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def fleet_dashboard(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Fleet overview dashboard."""
    vehicles = db.query(Vehicle).filter(Vehicle.org_id == org_id).all()

    now = datetime.utcnow()
    total = len(vehicles)
    active = sum(1 for v in vehicles if v.status == "active")
    in_service = sum(1 for v in vehicles if v.status == "in_service")
    decommissioned = sum(1 for v in vehicles if v.status == "decommissioned")

    # License expiring within 30 days
    license_expiring = sum(
        1 for v in vehicles
        if v.status == "active" and v.license_expiry
        and v.license_expiry > now and (v.license_expiry - now).days <= 30
    )
    license_expired = sum(
        1 for v in vehicles
        if v.status == "active" and v.license_expiry and v.license_expiry <= now
    )

    # Service due within 30 days
    service_due = sum(
        1 for v in vehicles
        if v.status == "active" and v.service_due_date
        and v.service_due_date > now and (v.service_due_date - now).days <= 30
    )
    service_overdue = sum(
        1 for v in vehicles
        if v.status == "active" and v.service_due_date and v.service_due_date <= now
    )

    # By fuel type
    fuel_counts: dict = {}
    for v in vehicles:
        if v.status == "active" and v.fuel_type:
            fuel_counts[v.fuel_type] = fuel_counts.get(v.fuel_type, 0) + 1

    # By site
    site_counts: dict = {}
    for v in vehicles:
        if v.status == "active" and v.assigned_site_id:
            if v.assigned_site_id not in site_counts:
                site = db.query(Site).get(v.assigned_site_id)
                site_counts[v.assigned_site_id] = {
                    "site_id": v.assigned_site_id,
                    "site_name": site.site_name if site else "Unknown",
                    "count": 0,
                }
            site_counts[v.assigned_site_id]["count"] += 1

    return {
        "total": total,
        "active": active,
        "in_service": in_service,
        "decommissioned": decommissioned,
        "license_expiring": license_expiring,
        "license_expired": license_expired,
        "service_due": service_due,
        "service_overdue": service_overdue,
        "by_fuel": sorted(fuel_counts.items(), key=lambda x: x[1], reverse=True),
        "by_site": sorted(site_counts.values(), key=lambda x: x["count"], reverse=True),
    }
