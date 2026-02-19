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


@router.get("/analytics")
def attendance_analytics(
    period_days: int = Query(30, ge=7, le=365, description="Lookback period in days"),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Attendance analytics — check-in rates, punctuality, no-show trends,
    and per-site/per-employee breakdowns for the given lookback period.
    """
    from datetime import timedelta
    from app.models.client import Client

    if current_user.role not in MANAGEMENT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Management access required.")

    now = datetime.utcnow()
    cutoff = now - timedelta(days=period_days)

    # All non-cancelled assignments in the window whose shift has ended
    rows = (
        db.query(ShiftAssignment, Shift, Site, Employee)
        .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
        .join(Employee, ShiftAssignment.employee_id == Employee.employee_id)
        .outerjoin(Site, Shift.site_id == Site.site_id)
        .filter(
            Employee.org_id == org_id,
            Shift.start_time >= cutoff,
            Shift.end_time <= now,
            ShiftAssignment.status != AssignmentStatus.CANCELLED.value,
        )
        .all()
    )

    total = len(rows)
    checked_in_count = 0
    checked_out_count = 0
    no_show_count = 0
    late_count = 0
    total_lateness_min = 0.0
    early_departure_count = 0

    # Per-site aggregation
    site_stats: dict = {}
    # Per-employee aggregation
    emp_stats: dict = {}
    # Daily trend
    daily_stats: dict = {}

    for assignment, shift, site, employee in rows:
        day_key = shift.start_time.strftime("%Y-%m-%d")
        site_key = site.site_name if site else "Unknown"
        emp_key = employee.employee_id
        emp_name = f"{employee.first_name} {employee.last_name}"

        # Initialize
        if day_key not in daily_stats:
            daily_stats[day_key] = {"total": 0, "checked_in": 0, "no_show": 0, "late": 0}
        if site_key not in site_stats:
            site_stats[site_key] = {"site_id": site.site_id if site else None, "total": 0, "checked_in": 0, "no_show": 0, "late": 0}
        if emp_key not in emp_stats:
            emp_stats[emp_key] = {"employee_id": emp_key, "name": emp_name, "total": 0, "checked_in": 0, "no_show": 0, "late": 0}

        daily_stats[day_key]["total"] += 1
        site_stats[site_key]["total"] += 1
        emp_stats[emp_key]["total"] += 1

        if assignment.checked_in:
            checked_in_count += 1
            daily_stats[day_key]["checked_in"] += 1
            site_stats[site_key]["checked_in"] += 1
            emp_stats[emp_key]["checked_in"] += 1

            # Lateness check (>15 min after shift start)
            if assignment.check_in_time and shift.start_time:
                delta_min = (assignment.check_in_time - shift.start_time).total_seconds() / 60
                if delta_min > 15:
                    late_count += 1
                    total_lateness_min += delta_min
                    daily_stats[day_key]["late"] += 1
                    site_stats[site_key]["late"] += 1
                    emp_stats[emp_key]["late"] += 1

            if assignment.checked_out:
                checked_out_count += 1
                # Early departure (checked out >15 min before shift end)
                if assignment.check_out_time and shift.end_time:
                    early_min = (shift.end_time - assignment.check_out_time).total_seconds() / 60
                    if early_min > 15:
                        early_departure_count += 1
        else:
            no_show_count += 1
            daily_stats[day_key]["no_show"] += 1
            site_stats[site_key]["no_show"] += 1
            emp_stats[emp_key]["no_show"] += 1

    check_in_rate = round((checked_in_count / total * 100), 1) if total > 0 else 0.0
    punctuality_rate = round(((checked_in_count - late_count) / checked_in_count * 100), 1) if checked_in_count > 0 else 0.0
    no_show_rate = round((no_show_count / total * 100), 1) if total > 0 else 0.0
    avg_lateness = round(total_lateness_min / late_count, 1) if late_count > 0 else 0.0

    # Top 5 worst no-show employees
    emp_list = sorted(emp_stats.values(), key=lambda e: e["no_show"], reverse=True)
    top_no_shows = emp_list[:5] if emp_list else []

    # Sites sorted by no-show rate
    site_list = []
    for name, s in site_stats.items():
        ns_rate = round((s["no_show"] / s["total"] * 100), 1) if s["total"] > 0 else 0.0
        site_list.append({**s, "site_name": name, "no_show_rate": ns_rate, "check_in_rate": round((s["checked_in"] / s["total"] * 100), 1) if s["total"] > 0 else 0.0})
    site_list.sort(key=lambda s: s["no_show_rate"], reverse=True)

    # Daily trend sorted by date
    daily_trend = []
    for day, d in sorted(daily_stats.items()):
        daily_trend.append({
            "date": day,
            "total": d["total"],
            "checked_in": d["checked_in"],
            "no_show": d["no_show"],
            "late": d["late"],
            "check_in_rate": round((d["checked_in"] / d["total"] * 100), 1) if d["total"] > 0 else 0.0,
        })

    return {
        "period_days": period_days,
        "total_assignments": total,
        "overview": {
            "check_in_rate": check_in_rate,
            "punctuality_rate": punctuality_rate,
            "no_show_rate": no_show_rate,
            "avg_lateness_min": avg_lateness,
            "checked_in": checked_in_count,
            "checked_out": checked_out_count,
            "no_shows": no_show_count,
            "late_arrivals": late_count,
            "early_departures": early_departure_count,
        },
        "daily_trend": daily_trend,
        "by_site": site_list[:20],
        "top_no_show_employees": top_no_shows,
    }
