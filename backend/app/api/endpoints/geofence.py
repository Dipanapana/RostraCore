"""Geofencing endpoints.

Verify guard GPS locations against site boundaries; track and manage violations.
"""

import math
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.geofence import GeofenceViolation, ViolationType
from app.models.site import Site
from app.models.employee import Employee
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class GeofenceCheck(BaseModel):
    site_id: int
    employee_id: int
    lat: float
    lng: float
    shift_id: Optional[int] = None


class SiteGeofenceUpdate(BaseModel):
    geofence_enabled: Optional[bool] = None
    geofence_radius: Optional[float] = None  # meters


class ViolationResolve(BaseModel):
    resolution: str = "acknowledged"  # acknowledged, dismissed
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters between two GPS coordinates using Haversine formula."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# ---------------------------------------------------------------------------
# SITE GEOFENCE CONFIG
# ---------------------------------------------------------------------------

@router.get("/sites/")
def list_site_geofences(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all sites with their geofence settings."""
    sites = db.query(Site).filter(Site.org_id == org_id).order_by(Site.site_name).all()

    return [
        {
            "site_id": s.site_id,
            "site_name": s.site_name or s.client_name,
            "client_name": s.client_name,
            "gps_lat": s.gps_lat,
            "gps_lng": s.gps_lng,
            "geofence_enabled": s.geofence_enabled or False,
            "geofence_radius": s.geofence_radius or 200,
            "has_coordinates": s.gps_lat is not None and s.gps_lng is not None,
        }
        for s in sites
    ]


@router.put("/sites/{site_id}/")
def update_site_geofence(
    site_id: int,
    body: SiteGeofenceUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update geofence settings for a site."""
    site = db.query(Site).filter(Site.site_id == site_id, Site.org_id == org_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if body.geofence_enabled is not None:
        site.geofence_enabled = body.geofence_enabled
    if body.geofence_radius is not None:
        if body.geofence_radius < 50:
            raise HTTPException(status_code=400, detail="Minimum geofence radius is 50 meters")
        site.geofence_radius = body.geofence_radius

    db.commit()
    db.refresh(site)

    return {
        "site_id": site.site_id,
        "site_name": site.site_name or site.client_name,
        "geofence_enabled": site.geofence_enabled or False,
        "geofence_radius": site.geofence_radius or 200,
        "gps_lat": site.gps_lat,
        "gps_lng": site.gps_lng,
    }


# ---------------------------------------------------------------------------
# GEOFENCE CHECK — called by mobile app
# ---------------------------------------------------------------------------

@router.post("/check/")
def check_geofence(
    body: GeofenceCheck,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Check if a guard's location is within the site geofence.

    Returns within=True/False and creates a violation record if outside.
    """
    site = db.query(Site).filter(Site.site_id == body.site_id, Site.org_id == org_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    # If geofence not enabled or no GPS on site, always pass
    if not site.geofence_enabled or not site.gps_lat or not site.gps_lng:
        return {"within": True, "distance": 0, "radius": site.geofence_radius or 200, "violation_created": False}

    distance = haversine_distance(site.gps_lat, site.gps_lng, body.lat, body.lng)
    radius = site.geofence_radius or 200
    within = distance <= radius

    violation_created = False
    if not within:
        # Create violation record
        violation = GeofenceViolation(
            org_id=org_id,
            site_id=body.site_id,
            employee_id=body.employee_id,
            violation_type=ViolationType.EXIT.value,
            lat=body.lat,
            lng=body.lng,
            distance_from_site=round(distance, 1),
            shift_id=body.shift_id,
        )
        db.add(violation)
        db.commit()
        violation_created = True

    return {
        "within": within,
        "distance": round(distance, 1),
        "radius": radius,
        "violation_created": violation_created,
    }


# ---------------------------------------------------------------------------
# VIOLATIONS — list & manage
# ---------------------------------------------------------------------------

@router.get("/violations/")
def list_violations(
    site_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    resolved_filter: Optional[str] = Query(None, alias="resolved"),
    days: int = Query(30, le=365),
    limit: int = Query(50, le=200),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List geofence violations for the org."""
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(GeofenceViolation).filter(
        GeofenceViolation.org_id == org_id,
        GeofenceViolation.created_at >= since,
    )

    if site_id:
        q = q.filter(GeofenceViolation.site_id == site_id)
    if employee_id:
        q = q.filter(GeofenceViolation.employee_id == employee_id)
    if resolved_filter:
        q = q.filter(GeofenceViolation.resolved == resolved_filter)

    total = q.count()
    violations = q.order_by(GeofenceViolation.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for v in violations:
        site = db.query(Site).get(v.site_id)
        emp = db.query(Employee).get(v.employee_id) if v.employee_id else None
        results.append({
            "violation_id": v.violation_id,
            "site_id": v.site_id,
            "site_name": site.site_name if site else "Unknown",
            "employee_id": v.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            "violation_type": v.violation_type,
            "lat": v.lat,
            "lng": v.lng,
            "distance_from_site": v.distance_from_site,
            "resolved": v.resolved,
            "notes": v.notes,
            "created_at": v.created_at,
            "resolved_at": v.resolved_at,
        })

    return {"items": results, "total": total}


@router.post("/violations/{violation_id}/resolve/")
def resolve_violation(
    violation_id: int,
    body: ViolationResolve,
    org_id: int = Depends(get_current_org_id),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resolve (acknowledge or dismiss) a geofence violation."""
    v = db.query(GeofenceViolation).filter(
        GeofenceViolation.violation_id == violation_id,
        GeofenceViolation.org_id == org_id,
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")

    if v.resolved != "unresolved":
        raise HTTPException(status_code=400, detail="Violation already resolved")

    v.resolved = body.resolution
    v.notes = body.notes
    v.resolved_at = datetime.utcnow()
    v.resolved_by = current_user.user_id
    db.commit()
    db.refresh(v)

    site = db.query(Site).get(v.site_id)
    emp = db.query(Employee).get(v.employee_id) if v.employee_id else None
    return {
        "violation_id": v.violation_id,
        "site_id": v.site_id,
        "site_name": site.site_name if site else "Unknown",
        "employee_id": v.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
        "violation_type": v.violation_type,
        "distance_from_site": v.distance_from_site,
        "resolved": v.resolved,
        "notes": v.notes,
        "created_at": v.created_at,
        "resolved_at": v.resolved_at,
    }


# ---------------------------------------------------------------------------
# DASHBOARD — geofence stats
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def geofence_dashboard(
    days: int = Query(30, le=365),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Geofence violation statistics for the last N days."""
    since = datetime.utcnow() - timedelta(days=days)

    violations = db.query(GeofenceViolation).filter(
        GeofenceViolation.org_id == org_id,
        GeofenceViolation.created_at >= since,
    ).all()

    total = len(violations)
    unresolved = sum(1 for v in violations if v.resolved == "unresolved")
    acknowledged = sum(1 for v in violations if v.resolved == "acknowledged")
    dismissed = sum(1 for v in violations if v.resolved == "dismissed")

    # Enabled sites count
    enabled_sites = db.query(Site).filter(
        Site.org_id == org_id,
        Site.geofence_enabled == True,
    ).count()
    total_sites = db.query(Site).filter(Site.org_id == org_id).count()

    # Per-site breakdown
    site_map: dict = {}
    for v in violations:
        sid = v.site_id
        if sid not in site_map:
            site = db.query(Site).get(sid)
            site_map[sid] = {
                "site_id": sid,
                "site_name": site.site_name if site else "Unknown",
                "total": 0,
                "unresolved": 0,
            }
        site_map[sid]["total"] += 1
        if v.resolved == "unresolved":
            site_map[sid]["unresolved"] += 1

    # Top offenders
    emp_map: dict = {}
    for v in violations:
        eid = v.employee_id
        if eid and eid not in emp_map:
            emp = db.query(Employee).get(eid)
            emp_map[eid] = {
                "employee_id": eid,
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
                "count": 0,
            }
        if eid:
            emp_map[eid]["count"] += 1

    return {
        "period_days": days,
        "total_violations": total,
        "unresolved": unresolved,
        "acknowledged": acknowledged,
        "dismissed": dismissed,
        "enabled_sites": enabled_sites,
        "total_sites": total_sites,
        "sites": sorted(site_map.values(), key=lambda x: x["total"], reverse=True),
        "top_offenders": sorted(emp_map.values(), key=lambda x: x["count"], reverse=True)[:10],
    }
