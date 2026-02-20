"""Guard availability heatmap — workforce supply by day-of-week and time slot."""

from datetime import datetime, date, time, timedelta
from typing import Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.availability_pattern import AvailabilityPattern
from app.models.leave import LeaveRequest
from app.models.shift_assignment import ShiftAssignment
from app.models.shift import Shift
from app.auth.security import get_current_org_id

router = APIRouter()

DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
TIME_SLOTS = [
    ("06:00", "10:00"),
    ("10:00", "14:00"),
    ("14:00", "18:00"),
    ("18:00", "22:00"),
    ("22:00", "02:00"),
    ("02:00", "06:00"),
]


def _time_in_slot(start_t, end_t, slot_start_str, slot_end_str):
    """Check if an availability window overlaps with a time slot."""
    if start_t is None or end_t is None:
        return False
    sh, sm = map(int, slot_start_str.split(":"))
    eh, em = map(int, slot_end_str.split(":"))
    slot_s = sh * 60 + sm
    slot_e = eh * 60 + em
    avail_s = start_t.hour * 60 + start_t.minute
    avail_e = end_t.hour * 60 + end_t.minute

    # Handle overnight slots (e.g. 22:00-02:00)
    if slot_e <= slot_s:
        slot_e += 24 * 60
    if avail_e <= avail_s:
        avail_e += 24 * 60

    return avail_s < slot_e and avail_e > slot_s


@router.get("/heatmap")
def availability_heatmap(
    site_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Availability heatmap — guards available per day/time slot."""

    employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == "active",
    ).all()
    emp_ids = [e.employee_id for e in employees]
    total_active = len(employees)

    # Get all active availability patterns
    patterns = db.query(AvailabilityPattern).filter(
        AvailabilityPattern.org_id == org_id,
        AvailabilityPattern.employee_id.in_(emp_ids),
        AvailabilityPattern.is_active == True,
    ).all() if emp_ids else []

    # Index patterns by employee (take highest priority per employee)
    emp_patterns = {}
    for p in sorted(patterns, key=lambda x: x.priority or 0):
        emp_patterns[p.employee_id] = p  # Last one wins (highest priority)

    # Build heatmap: day x slot -> count of available guards
    heatmap = {}
    for day_idx, day_name in enumerate(DAY_NAMES):
        for slot_start, slot_end in TIME_SLOTS:
            slot_key = f"{day_name}_{slot_start}"
            available_count = 0

            for emp in employees:
                pattern = emp_patterns.get(emp.employee_id)
                if pattern and pattern.pattern_type and str(getattr(pattern.pattern_type, 'value', pattern.pattern_type)) == "RECURRING_WEEKLY":
                    is_avail = getattr(pattern, f"{day_name}_available", True)
                    start_t = getattr(pattern, f"{day_name}_start", None)
                    end_t = getattr(pattern, f"{day_name}_end", None)
                    if is_avail and start_t and end_t:
                        if _time_in_slot(start_t, end_t, slot_start, slot_end):
                            available_count += 1
                    elif is_avail and not start_t:
                        # Available all day
                        available_count += 1
                else:
                    # No pattern = assumed available
                    available_count += 1

            heatmap[slot_key] = available_count

    # Format as grid
    grid = []
    for slot_start, slot_end in TIME_SLOTS:
        row = {"time_slot": f"{slot_start}-{slot_end}"}
        for day_name in DAY_NAMES:
            slot_key = f"{day_name}_{slot_start}"
            count = heatmap.get(slot_key, 0)
            row[day_name] = count
        grid.append(row)

    # Current week stats: leaves and assignments
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    on_leave = db.query(LeaveRequest).filter(
        LeaveRequest.org_id == org_id,
        LeaveRequest.employee_id.in_(emp_ids),
        LeaveRequest.status.in_(["approved", "pending"]),
        LeaveRequest.start_date <= week_end,
        LeaveRequest.end_date >= week_start,
    ).count() if emp_ids else 0

    # Assignments this week
    week_start_dt = datetime.combine(week_start, time.min)
    week_end_dt = datetime.combine(week_end, time.max)
    assigned_this_week = db.query(ShiftAssignment.employee_id).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.org_id == org_id,
        Shift.start_time >= week_start_dt,
        Shift.start_time <= week_end_dt,
        ShiftAssignment.status.in_(["pending", "confirmed"]),
    ).distinct().count() if emp_ids else 0

    # Peak and trough
    max_slot = max(heatmap.items(), key=lambda x: x[1]) if heatmap else ("", 0)
    min_slot = min(heatmap.items(), key=lambda x: x[1]) if heatmap else ("", 0)

    return {
        "total_active_guards": total_active,
        "guards_with_patterns": len(emp_patterns),
        "on_leave_this_week": on_leave,
        "assigned_this_week": assigned_this_week,
        "peak_slot": {"slot": max_slot[0], "count": max_slot[1]} if max_slot[0] else None,
        "trough_slot": {"slot": min_slot[0], "count": min_slot[1]} if min_slot[0] else None,
        "days": DAY_NAMES,
        "time_slots": [f"{s}-{e}" for s, e in TIME_SLOTS],
        "grid": grid,
    }
