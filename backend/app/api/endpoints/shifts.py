"""Shifts API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date, timedelta
from app.database import get_db
from app.models.schemas import (
    ShiftCreate, ShiftUpdate, ShiftResponse,
    ShiftAssignmentCreate, ShiftAssignmentResponse,
    BulkShiftGenerateRequest, BulkShiftGenerateResponse
)
from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
from app.models.shift import Shift
from app.models.site import Site
from app.models.employee import Employee
from app.models.user import User
from app.services.shift_service import ShiftService
from app.services.client_filter_service import ClientFilterService
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Mobile: Guard's own upcoming shifts
# NOTE: This static route must come before /{shift_id} to avoid conflicts.
# ---------------------------------------------------------------------------

@router.get("/my-shifts")
def get_my_shifts(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Return the authenticated guard's upcoming shift assignments.

    Matches the current user to an Employee record by email.
    Used by the mobile app's schedule and home screens.
    """
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()

    if not employee:
        return []

    # Date range defaults to today → next 14 days
    now = datetime.utcnow()
    start = datetime.fromisoformat(start_date) if start_date else now.replace(hour=0, minute=0, second=0)
    end = datetime.fromisoformat(end_date) if end_date else now + timedelta(days=14)

    assignments = (
        db.query(ShiftAssignment)
        .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
        .join(Site, Shift.site_id == Site.site_id)
        .options(
            joinedload(ShiftAssignment.shift).joinedload(Shift.site)
        )
        .filter(
            ShiftAssignment.employee_id == employee.employee_id,
            ShiftAssignment.status != AssignmentStatus.CANCELLED,
            Shift.start_time >= start,
            Shift.start_time <= end,
            Shift.org_id == org_id,
        )
        .order_by(Shift.start_time)
        .all()
    )

    result = []
    for a in assignments:
        shift = a.shift
        site = shift.site if shift else None
        result.append({
            "assignment_id": a.assignment_id,
            "shift_id": a.shift_id,
            "status": a.status,
            "checked_in": a.checked_in,
            "check_in_time": a.check_in_time.isoformat() if a.check_in_time else None,
            "checked_out": a.checked_out,
            "check_out_time": a.check_out_time.isoformat() if a.check_out_time else None,
            "attendance_status": a.attendance_status,
            "shift": {
                "shift_id": shift.shift_id,
                "start_time": shift.start_time.isoformat(),
                "end_time": shift.end_time.isoformat(),
                "status": shift.status,
                "notes": shift.notes,
            } if shift else None,
            "site": {
                "site_id": site.site_id,
                "site_name": site.site_name,
                "address": site.address,
                "gps_lat": site.gps_lat,
                "gps_lng": site.gps_lng,
            } if site else None,
        })

    return result


@router.get("/", response_model=List[ShiftResponse])
async def get_shifts(
    skip: int = 0,
    limit: int = 100,
    site_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get all shifts with optional filters.

    Filtering:
    - Organization: Only shifts in user's organization
    - Client Access: If user has managed_client_ids, only shifts at their clients' sites
    """
    # Get accessible clients for client-level filtering
    accessible_clients = ClientFilterService.get_accessible_clients_for_user(db, current_user)

    shifts = ShiftService.get_all(
        db,
        skip=skip,
        limit=limit,
        site_id=site_id,
        employee_id=employee_id,
        status=status_filter,
        start_date=start_date,
        end_date=end_date,
        org_id=org_id,
        accessible_client_ids=accessible_clients  # Pass to service for filtering
    )
    return shifts


def _check_shift_client_access(db: Session, shift, org_id: int, current_user: User):
    """Helper to check client-level access for a shift via its site."""
    from app.models.site import Site
    site = db.query(Site).filter(Site.site_id == shift.site_id).first()
    if site and not ClientFilterService.is_client_accessible(db, org_id, site.client_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this shift's client"
        )


@router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get shift by ID (filtered by organization and client access)."""
    shift = ShiftService.get_by_id(db, shift_id, org_id=org_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )
    _check_shift_client_access(db, shift, org_id, current_user)
    return shift


@router.post("/", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def create_shift(
    shift_data: ShiftCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Create new shift (with client access check for the site)."""
    # Check client access for the site
    from app.models.site import Site
    site = db.query(Site).filter(Site.site_id == shift_data.site_id).first()
    if site and not ClientFilterService.is_client_accessible(db, org_id, site.client_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to create shifts for this client's site"
        )
    shift = ShiftService.create(db, shift_data, org_id=org_id)
    return shift


@router.put("/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: int,
    shift_data: ShiftUpdate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Update shift (filtered by organization and client access)."""
    # First get the shift to check access
    existing_shift = ShiftService.get_by_id(db, shift_id, org_id=org_id)
    if not existing_shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )
    _check_shift_client_access(db, existing_shift, org_id, current_user)

    shift = ShiftService.update(db, shift_id, shift_data, org_id=org_id)
    return shift


@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift(
    shift_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Delete shift (filtered by organization and client access)."""
    # First get the shift to check access
    existing_shift = ShiftService.get_by_id(db, shift_id, org_id=org_id)
    if not existing_shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )
    _check_shift_client_access(db, existing_shift, org_id, current_user)

    success = ShiftService.delete(db, shift_id, org_id=org_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )
    return None


@router.get("/{shift_id}/assignments", response_model=List[ShiftAssignmentResponse])
async def get_shift_assignments(
    shift_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get all guard assignments for a shift (filtered by organization and client access)."""
    from app.models.shift import Shift

    shift = db.query(Shift).filter(
        Shift.shift_id == shift_id,
        Shift.org_id == org_id
    ).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )
    _check_shift_client_access(db, shift, org_id, current_user)

    assignments = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.status != AssignmentStatus.CANCELLED
    ).all()

    return assignments


@router.post("/{shift_id}/assign/{employee_id}", response_model=ShiftAssignmentResponse)
async def assign_guard_to_shift(
    shift_id: int,
    employee_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Assign a guard to a shift (manual assignment, filtered by organization and client access).
    Creates assignment with 'pending' status.
    """
    from app.models.shift import Shift
    from app.models.employee import Employee

    # Verify shift exists and belongs to organization
    shift = db.query(Shift).filter(
        Shift.shift_id == shift_id,
        Shift.org_id == org_id
    ).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )

    # Check client-level access
    _check_shift_client_access(db, shift, org_id, current_user)

    # Verify employee exists and belongs to organization
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id,
        Employee.org_id == org_id
    ).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    # Check if already assigned
    existing = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.employee_id == employee_id,
        ShiftAssignment.status != AssignmentStatus.CANCELLED
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee {employee_id} is already assigned to this shift"
        )

    # Check if shift is full
    current_assignments = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.CONFIRMED])
    ).count()

    if current_assignments >= shift.required_staff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shift is full ({current_assignments}/{shift.required_staff} guards assigned)"
        )

    # Create assignment
    assignment = ShiftAssignment(
        shift_id=shift_id,
        employee_id=employee_id,
        status=AssignmentStatus.PENDING.value,
        roster_id=None  # Manual assignment, no roster
    )

    # Calculate cost
    assignment.calculate_cost(shift, employee)

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment


@router.delete("/{shift_id}/assignments/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_guard_from_shift(
    shift_id: int,
    employee_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Remove guard assignment from shift (filtered by organization).
    Sets assignment status to 'cancelled'.
    """
    from app.models.shift import Shift

    # Verify shift belongs to organization
    shift = db.query(Shift).filter(
        Shift.shift_id == shift_id,
        Shift.org_id == org_id
    ).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )

    assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.employee_id == employee_id,
        ShiftAssignment.status != AssignmentStatus.CANCELLED
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment not found for employee {employee_id} on shift {shift_id}"
        )

    assignment.status = AssignmentStatus.CANCELLED.value
    db.commit()

    return None


@router.post("/{shift_id}/assignments/{assignment_id}/confirm", response_model=ShiftAssignmentResponse)
async def confirm_shift_assignment(
    shift_id: int,
    assignment_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Confirm a pending shift assignment (filtered by organization).
    Changes status from 'pending' to 'confirmed'.
    """
    from app.models.shift import Shift

    # Verify shift belongs to organization
    shift = db.query(Shift).filter(
        Shift.shift_id == shift_id,
        Shift.org_id == org_id
    ).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {shift_id} not found"
        )

    assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.assignment_id == assignment_id,
        ShiftAssignment.shift_id == shift_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment {assignment_id} not found"
        )

    if assignment.status != AssignmentStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assignment is already {assignment.status}, cannot confirm"
        )

    assignment.status = AssignmentStatus.CONFIRMED.value
    assignment.confirmation_datetime = datetime.utcnow()
    db.commit()
    db.refresh(assignment)

    return assignment


@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
async def bulk_delete_shifts(
    shift_ids: List[int],
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Bulk delete shifts (for admin/owner to clean up history, filtered by organization)."""
    deleted_count = 0
    errors = []

    for shift_id in shift_ids:
        try:
            success = ShiftService.delete(db, shift_id, org_id=org_id)
            if success:
                deleted_count += 1
            else:
                errors.append(f"Shift {shift_id} not found")
        except Exception as e:
            errors.append(f"Shift {shift_id}: {str(e)}")

    return {
        "deleted_count": deleted_count,
        "total_requested": len(shift_ids),
        "errors": errors
    }


@router.post("/bulk-generate", response_model=BulkShiftGenerateResponse)
async def bulk_generate_shifts(
    request: BulkShiftGenerateRequest,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Generate multiple shifts for selected sites over a date range.

    This endpoint allows admins to create recurring shifts based on:
    - Custom shift templates (day_of_week, start/end times)
    - Existing site shift templates from the database
    - A pattern like weekly or bi-weekly

    Example request:
    {
        "site_ids": [8, 9],
        "start_date": "2024-12-09",
        "end_date": "2024-12-22",
        "pattern": "weekly",
        "shift_templates": [
            {"day_of_week": 0, "start_time": "06:00", "end_time": "18:00", "required_staff": 2},
            {"day_of_week": 0, "start_time": "18:00", "end_time": "06:00", "required_staff": 1}
        ]
    }
    """
    from app.models.site import Site
    from app.models.shift import Shift, ShiftStatus
    from app.models.shift_template import ShiftTemplate

    errors = []
    details = []
    total_shifts_created = 0

    # Validate date range
    if request.start_date > request.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before or equal to end_date"
        )

    # Limit date range to avoid creating too many shifts
    date_diff = (request.end_date - request.start_date).days
    if date_diff > 90:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date range cannot exceed 90 days"
        )

    # Validate sites exist and belong to org
    sites = db.query(Site).filter(
        Site.site_id.in_(request.site_ids),
        Site.org_id == org_id
    ).all()

    if not sites:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No valid sites found for the provided IDs"
        )

    # Check client access for each site
    for site in sites:
        if not ClientFilterService.is_client_accessible(db, org_id, site.client_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have access to site {site.site_id} (client access denied)"
            )

    # Determine which templates to use
    templates_by_site = {}

    if request.use_site_templates:
        # Fetch existing templates from database
        for site in sites:
            site_templates = db.query(ShiftTemplate).filter(
                ShiftTemplate.site_id == site.site_id
            ).all()
            if site_templates:
                templates_by_site[site.site_id] = [
                    {
                        "day_of_week": t.day_of_week,
                        "start_time": t.start_time,
                        "end_time": t.end_time,
                        "required_staff": t.required_staff_count or request.default_required_staff,
                        "required_skill": t.required_skill or site.required_skill
                    }
                    for t in site_templates
                ]
            else:
                errors.append(f"Site {site.site_id} has no shift templates defined")
    elif request.shift_templates:
        # Use provided templates for all sites
        for site in sites:
            templates_by_site[site.site_id] = [
                {
                    "day_of_week": t.day_of_week,
                    "start_time": t.start_time,
                    "end_time": t.end_time,
                    "required_staff": t.required_staff,
                    "required_skill": t.required_skill or site.required_skill
                }
                for t in request.shift_templates
            ]
    else:
        # Default: Create day shift (06:00-18:00) and night shift (18:00-06:00) for every day
        from datetime import time as datetime_time
        default_templates = [
            {"day_of_week": d, "start_time": datetime_time(6, 0), "end_time": datetime_time(18, 0),
             "required_staff": request.default_required_staff, "required_skill": request.default_required_skill}
            for d in range(7)  # All days of week
        ] + [
            {"day_of_week": d, "start_time": datetime_time(18, 0), "end_time": datetime_time(6, 0),
             "required_staff": request.default_required_staff, "required_skill": request.default_required_skill}
            for d in range(7)  # All days of week
        ]
        for site in sites:
            templates_by_site[site.site_id] = default_templates

    # Generate shifts for each site
    for site in sites:
        site_shifts_created = 0
        templates = templates_by_site.get(site.site_id, [])

        if not templates:
            continue

        # Iterate through each day in the date range
        current_date = request.start_date
        while current_date <= request.end_date:
            day_of_week = current_date.weekday()  # 0=Monday, 6=Sunday

            # Find matching templates for this day
            for template in templates:
                if template["day_of_week"] != day_of_week:
                    continue

                # Calculate start and end datetimes
                start_dt = datetime.combine(current_date, template["start_time"])

                # Handle overnight shifts (end_time < start_time means next day)
                if template["end_time"] < template["start_time"]:
                    end_dt = datetime.combine(current_date + timedelta(days=1), template["end_time"])
                else:
                    end_dt = datetime.combine(current_date, template["end_time"])

                # Check for duplicate shifts (same site, same start time)
                existing = db.query(Shift).filter(
                    Shift.site_id == site.site_id,
                    Shift.start_time == start_dt,
                    Shift.org_id == org_id
                ).first()

                if existing:
                    errors.append(
                        f"Shift already exists for site {site.site_id} at {start_dt.strftime('%Y-%m-%d %H:%M')}"
                    )
                    continue

                # Create the shift
                new_shift = Shift(
                    org_id=org_id,
                    site_id=site.site_id,
                    start_time=start_dt,
                    end_time=end_dt,
                    required_staff=template["required_staff"],
                    required_skill=template.get("required_skill") or site.required_skill,
                    status=ShiftStatus.PLANNED,
                    created_by=current_user.username
                )

                db.add(new_shift)
                site_shifts_created += 1

            current_date += timedelta(days=1)

        total_shifts_created += site_shifts_created
        details.append({
            "site_id": site.site_id,
            "site_name": site.site_name or site.client_name,
            "shifts_created": site_shifts_created
        })

    # Commit all shifts
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save shifts: {str(e)}"
        )

    return BulkShiftGenerateResponse(
        success=total_shifts_created > 0,
        shifts_created=total_shifts_created,
        sites_processed=len(sites),
        date_range=f"{request.start_date.strftime('%Y-%m-%d')} to {request.end_date.strftime('%Y-%m-%d')}",
        details=details,
        errors=errors
    )
