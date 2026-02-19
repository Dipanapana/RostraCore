"""Mobile attendance endpoints — GPS-verified check-in / check-out via ShiftAssignment."""

import math
from datetime import datetime, date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import get_current_org_id, get_current_user, require_roles
from app.database import get_db
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
from app.models.site import Site
from app.models.user import User

router = APIRouter()

MANAGEMENT_ROLES = {"admin", "company_admin", "scheduler", "superadmin"}

# Maximum allowed distance from site GPS centre for clock-in/out (metres)
MAX_DISTANCE_METERS = 500


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in metres between two WGS-84 coordinates."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _resolve_employee(db: Session, current_user: User, org_id: int) -> Employee:
    """Resolve the Employee record linked to the logged-in User (by matching email)."""
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employee record found for this user account.",
        )
    return employee


def _verify_assignment(
    db: Session,
    assignment_id: int,
    employee: Employee,
) -> tuple[ShiftAssignment, Shift, Site]:
    """Fetch and authorise a ShiftAssignment, returning (assignment, shift, site)."""
    assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.assignment_id == assignment_id,
    ).first()

    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    if assignment.employee_id != employee.employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this shift.",
        )

    if assignment.status == AssignmentStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignment is cancelled.")

    shift = db.query(Shift).filter(Shift.shift_id == assignment.shift_id).first()
    site = db.query(Site).filter(Site.site_id == shift.site_id).first() if shift else None

    return assignment, shift, site


def _enforce_geofence(site: Site, latitude: float, longitude: float) -> None:
    """Raise 400 if the provided coordinates are outside the site's geofence."""
    if site and site.gps_lat and site.gps_lng:
        distance = _haversine_distance(latitude, longitude, site.gps_lat, site.gps_lng)
        if distance > MAX_DISTANCE_METERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"You are {int(distance)} m from {site.site_name}. "
                    f"Must be within {MAX_DISTANCE_METERS} m to record attendance."
                ),
            )


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class AttendanceRequest(BaseModel):
    shift_assignment_id: int
    latitude: float
    longitude: float
    photo_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/check-in")
def check_in(
    data: AttendanceRequest,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Record a GPS-verified check-in for a shift assignment.

    Validates that the guard is physically within 500 m of the site
    before marking the assignment as checked-in.
    """
    employee = _resolve_employee(db, current_user, org_id)
    assignment, shift, site = _verify_assignment(db, data.shift_assignment_id, employee)

    if assignment.checked_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already checked in for this shift.",
        )

    _enforce_geofence(site, data.latitude, data.longitude)

    assignment.checked_in = True
    assignment.check_in_time = datetime.utcnow()
    db.commit()
    db.refresh(assignment)

    return {
        "message": "Checked in successfully.",
        "assignment_id": assignment.assignment_id,
        "check_in_time": assignment.check_in_time.isoformat(),
        "site_name": site.site_name if site else None,
    }


@router.post("/check-out")
def check_out(
    data: AttendanceRequest,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Record a GPS-verified check-out for a shift assignment.

    Returns duration in minutes since check-in.
    """
    employee = _resolve_employee(db, current_user, org_id)
    assignment, shift, site = _verify_assignment(db, data.shift_assignment_id, employee)

    if not assignment.checked_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check out: not yet checked in.",
        )

    if assignment.checked_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already checked out for this shift.",
        )

    _enforce_geofence(site, data.latitude, data.longitude)

    assignment.checked_out = True
    assignment.check_out_time = datetime.utcnow()
    db.commit()
    db.refresh(assignment)

    duration_minutes = int(
        (assignment.check_out_time - assignment.check_in_time).total_seconds() / 60
    )

    return {
        "message": "Checked out successfully.",
        "assignment_id": assignment.assignment_id,
        "check_out_time": assignment.check_out_time.isoformat(),
        "duration_minutes": duration_minutes,
        "site_name": site.site_name if site else None,
    }


# ---------------------------------------------------------------------------
# Admin: list attendance records
# ---------------------------------------------------------------------------

@router.get("/")
def list_attendance(
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD inclusive start"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD inclusive end"),
    employee_id: Optional[int] = Query(None),
    site_id: Optional[int] = Query(None),
    attendance_status: Optional[str] = Query(None, description="present|in_progress|no_show|scheduled"),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint — list all shift assignments with attendance detail for the org.
    Returns enriched records including check-in/out times, actual hours, and
    a derived status: present | in_progress | no_show | scheduled.
    """
    if current_user.role not in MANAGEMENT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Management access required.")

    # Build base query joining ShiftAssignment → Shift → Site, Employee
    query = (
        db.query(ShiftAssignment, Shift, Site, Employee)
        .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
        .join(Employee, ShiftAssignment.employee_id == Employee.employee_id)
        .outerjoin(Site, Shift.site_id == Site.site_id)
        .filter(Employee.org_id == org_id)
        .filter(ShiftAssignment.status != AssignmentStatus.CANCELLED.value)
    )

    # Date filters applied to shift start_time
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Shift.start_time >= sd)
        except ValueError:
            pass
    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d")
            # Include the full end day
            from datetime import timedelta
            ed = ed.replace(hour=23, minute=59, second=59)
            query = query.filter(Shift.start_time <= ed)
        except ValueError:
            pass

    if employee_id:
        query = query.filter(ShiftAssignment.employee_id == employee_id)
    if site_id:
        query = query.filter(Shift.site_id == site_id)

    # Order by shift start desc
    query = query.order_by(Shift.start_time.desc())

    rows = query.offset(skip).limit(limit).all()

    now = datetime.utcnow()
    records = []
    for assignment, shift, site, employee in rows:
        # Derive attendance status
        if assignment.checked_in and assignment.checked_out:
            astat = "present"
        elif assignment.checked_in and not assignment.checked_out:
            astat = "in_progress"
        elif not assignment.checked_in and shift.end_time and shift.end_time < now:
            astat = "no_show"
        else:
            astat = "scheduled"

        # Filter by requested status
        if attendance_status and astat != attendance_status:
            continue

        # Late check-in: more than 15 minutes after shift start
        is_late = False
        if assignment.check_in_time and shift.start_time:
            delta_minutes = (assignment.check_in_time - shift.start_time).total_seconds() / 60
            is_late = delta_minutes > 15

        # Actual hours worked
        actual_hours: Optional[float] = None
        if assignment.check_in_time and assignment.check_out_time:
            actual_hours = round(
                (assignment.check_out_time - assignment.check_in_time).total_seconds() / 3600, 2
            )

        scheduled_hours = shift.duration_hours if hasattr(shift, 'duration_hours') else None
        if scheduled_hours is None and shift.start_time and shift.end_time:
            scheduled_hours = round(
                (shift.end_time - shift.start_time).total_seconds() / 3600, 2
            )

        records.append({
            "assignment_id": assignment.assignment_id,
            "employee_id": employee.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "site_id": site.site_id if site else None,
            "site_name": site.site_name if site else "—",
            "shift_id": shift.shift_id,
            "shift_start": shift.start_time.isoformat() if shift.start_time else None,
            "shift_end": shift.end_time.isoformat() if shift.end_time else None,
            "scheduled_hours": scheduled_hours,
            "checked_in": assignment.checked_in,
            "check_in_time": assignment.check_in_time.isoformat() if assignment.check_in_time else None,
            "checked_out": assignment.checked_out,
            "check_out_time": assignment.check_out_time.isoformat() if assignment.check_out_time else None,
            "actual_hours": actual_hours,
            "attendance_status": astat,
            "is_late": is_late,
        })

    # Summary counts (before status filter for full picture)
    total = len(records)
    present_count = sum(1 for r in records if r["attendance_status"] == "present")
    in_progress_count = sum(1 for r in records if r["attendance_status"] == "in_progress")
    no_show_count = sum(1 for r in records if r["attendance_status"] == "no_show")
    late_count = sum(1 for r in records if r["is_late"])

    return {
        "records": records,
        "summary": {
            "total": total,
            "present": present_count,
            "in_progress": in_progress_count,
            "no_show": no_show_count,
            "late": late_count,
        },
    }
