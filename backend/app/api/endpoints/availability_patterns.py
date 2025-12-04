"""API endpoints for employee availability patterns."""

from datetime import date, time, timedelta
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.employee import Employee
from app.models.availability_pattern import AvailabilityPattern, PatternType
from app.services.availability_resolver import AvailabilityResolver

router = APIRouter()


# Pydantic schemas
class DaySchedule(BaseModel):
    available: bool = True
    start_time: Optional[str] = None  # HH:MM format
    end_time: Optional[str] = None


class WeeklySchedule(BaseModel):
    monday: Optional[DaySchedule] = None
    tuesday: Optional[DaySchedule] = None
    wednesday: Optional[DaySchedule] = None
    thursday: Optional[DaySchedule] = None
    friday: Optional[DaySchedule] = None
    saturday: Optional[DaySchedule] = None
    sunday: Optional[DaySchedule] = None


class AvailabilityPatternBase(BaseModel):
    pattern_name: Optional[str] = Field(None, max_length=100)
    effective_from: str  # YYYY-MM-DD
    effective_to: Optional[str] = None  # YYYY-MM-DD, null = indefinite
    pattern_type: str = Field("recurring_weekly", description="recurring_weekly, date_range, or exception")
    priority: int = Field(0, ge=0)


class AvailabilityPatternCreate(AvailabilityPatternBase):
    weekly_schedule: Optional[WeeklySchedule] = None
    range_start_time: Optional[str] = None  # HH:MM, for date_range patterns
    range_end_time: Optional[str] = None


class AvailabilityPatternUpdate(BaseModel):
    pattern_name: Optional[str] = None
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
    pattern_type: Optional[str] = None
    priority: Optional[int] = None
    weekly_schedule: Optional[WeeklySchedule] = None
    range_start_time: Optional[str] = None
    range_end_time: Optional[str] = None
    is_active: Optional[bool] = None


class AvailabilityPatternResponse(BaseModel):
    pattern_id: int
    employee_id: int
    org_id: int
    pattern_name: Optional[str]
    effective_from: str
    effective_to: Optional[str]
    pattern_type: str
    priority: int
    is_active: bool
    weekly_schedule: Dict
    range_start_time: Optional[str]
    range_end_time: Optional[str]

    class Config:
        from_attributes = True


class CalendarRequest(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD


class StandardPatternCreate(BaseModel):
    effective_from: str  # YYYY-MM-DD
    effective_to: Optional[str] = None
    weekday_start: str = "06:00"  # HH:MM
    weekday_end: str = "18:00"
    include_saturday: bool = False
    saturday_start: Optional[str] = None
    saturday_end: Optional[str] = None


def parse_time(time_str: Optional[str]) -> Optional[time]:
    """Parse HH:MM time string to time object."""
    if not time_str:
        return None
    try:
        parts = time_str.split(":")
        return time(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid time format: {time_str}. Use HH:MM format."
        )


def parse_date(date_str: Optional[str]) -> Optional[date]:
    """Parse YYYY-MM-DD date string to date object."""
    if not date_str:
        return None
    try:
        return date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {date_str}. Use YYYY-MM-DD format."
        )


def parse_pattern_type(value: str) -> PatternType:
    """Parse string to PatternType enum."""
    try:
        return PatternType(value.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid pattern_type: {value}. Must be one of: recurring_weekly, date_range, exception"
        )


def pattern_to_response(pattern: AvailabilityPattern) -> dict:
    """Convert model to response dict."""
    weekly_schedule = {}
    for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
        available = getattr(pattern, f"{day}_available")
        start = getattr(pattern, f"{day}_start")
        end = getattr(pattern, f"{day}_end")
        weekly_schedule[day] = {
            "available": available,
            "start_time": start.strftime("%H:%M") if start else None,
            "end_time": end.strftime("%H:%M") if end else None
        }

    return {
        "pattern_id": pattern.pattern_id,
        "employee_id": pattern.employee_id,
        "org_id": pattern.org_id,
        "pattern_name": pattern.pattern_name,
        "effective_from": pattern.effective_from.isoformat(),
        "effective_to": pattern.effective_to.isoformat() if pattern.effective_to else None,
        "pattern_type": pattern.pattern_type.value,
        "priority": pattern.priority,
        "is_active": pattern.is_active,
        "weekly_schedule": weekly_schedule,
        "range_start_time": pattern.range_start_time.strftime("%H:%M") if pattern.range_start_time else None,
        "range_end_time": pattern.range_end_time.strftime("%H:%M") if pattern.range_end_time else None
    }


def weekly_schedule_to_dict(schedule: Optional[WeeklySchedule]) -> Dict:
    """Convert WeeklySchedule pydantic model to dict for service."""
    if not schedule:
        return {}

    result = {}
    for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
        day_schedule = getattr(schedule, day, None)
        if day_schedule:
            result[day] = (
                day_schedule.available,
                parse_time(day_schedule.start_time),
                parse_time(day_schedule.end_time)
            )
    return result


@router.get("/employees/{employee_id}/availability-patterns", response_model=List[AvailabilityPatternResponse])
async def get_employee_availability_patterns(
    employee_id: int,
    active_only: bool = Query(True, description="Only return active patterns"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all availability patterns for an employee."""
    # Verify employee exists and user has access
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not current_user.is_superadmin and employee.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this employee")

    resolver = AvailabilityResolver(db)
    patterns = resolver.get_patterns_for_employee(employee_id, active_only=active_only)

    return [pattern_to_response(p) for p in patterns]


@router.post("/employees/{employee_id}/availability-patterns", response_model=AvailabilityPatternResponse)
async def create_availability_pattern(
    employee_id: int,
    pattern_data: AvailabilityPatternCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new availability pattern for an employee."""
    # Verify employee exists and user has access
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not current_user.is_superadmin and employee.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this employee")

    resolver = AvailabilityResolver(db)

    effective_from = parse_date(pattern_data.effective_from)
    effective_to = parse_date(pattern_data.effective_to)
    pattern_type = parse_pattern_type(pattern_data.pattern_type)
    weekly_schedule = weekly_schedule_to_dict(pattern_data.weekly_schedule)

    range_times = None
    if pattern_data.range_start_time and pattern_data.range_end_time:
        range_times = (
            parse_time(pattern_data.range_start_time),
            parse_time(pattern_data.range_end_time)
        )

    pattern = resolver.create_pattern(
        org_id=employee.org_id,
        employee_id=employee_id,
        pattern_name=pattern_data.pattern_name,
        effective_from=effective_from,
        effective_to=effective_to,
        pattern_type=pattern_type,
        weekly_schedule=weekly_schedule,
        range_times=range_times,
        priority=pattern_data.priority
    )

    return pattern_to_response(pattern)


@router.post("/employees/{employee_id}/availability-patterns/standard", response_model=AvailabilityPatternResponse)
async def create_standard_work_week_pattern(
    employee_id: int,
    config: StandardPatternCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a standard Mon-Fri work week availability pattern.

    Quick way to set up typical employee availability.
    """
    # Verify employee exists and user has access
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not current_user.is_superadmin and employee.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this employee")

    resolver = AvailabilityResolver(db)

    pattern = resolver.create_standard_work_week_pattern(
        org_id=employee.org_id,
        employee_id=employee_id,
        effective_from=parse_date(config.effective_from),
        effective_to=parse_date(config.effective_to),
        weekday_start=parse_time(config.weekday_start),
        weekday_end=parse_time(config.weekday_end),
        include_saturday=config.include_saturday,
        saturday_start=parse_time(config.saturday_start) if config.include_saturday else None,
        saturday_end=parse_time(config.saturday_end) if config.include_saturday else None
    )

    return pattern_to_response(pattern)


@router.get("/employees/{employee_id}/availability-patterns/{pattern_id}", response_model=AvailabilityPatternResponse)
async def get_availability_pattern(
    employee_id: int,
    pattern_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific availability pattern."""
    pattern = db.query(AvailabilityPattern).filter(
        AvailabilityPattern.pattern_id == pattern_id,
        AvailabilityPattern.employee_id == employee_id
    ).first()

    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    if not current_user.is_superadmin and pattern.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this pattern")

    return pattern_to_response(pattern)


@router.put("/employees/{employee_id}/availability-patterns/{pattern_id}", response_model=AvailabilityPatternResponse)
async def update_availability_pattern(
    employee_id: int,
    pattern_id: int,
    pattern_data: AvailabilityPatternUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an availability pattern."""
    pattern = db.query(AvailabilityPattern).filter(
        AvailabilityPattern.pattern_id == pattern_id,
        AvailabilityPattern.employee_id == employee_id
    ).first()

    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    if not current_user.is_superadmin and pattern.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this pattern")

    resolver = AvailabilityResolver(db)

    update_data = {}
    if pattern_data.pattern_name is not None:
        update_data["pattern_name"] = pattern_data.pattern_name
    if pattern_data.effective_from is not None:
        update_data["effective_from"] = parse_date(pattern_data.effective_from)
    if pattern_data.effective_to is not None:
        update_data["effective_to"] = parse_date(pattern_data.effective_to)
    if pattern_data.pattern_type is not None:
        update_data["pattern_type"] = parse_pattern_type(pattern_data.pattern_type)
    if pattern_data.priority is not None:
        update_data["priority"] = pattern_data.priority
    if pattern_data.range_start_time is not None:
        update_data["range_start_time"] = parse_time(pattern_data.range_start_time)
    if pattern_data.range_end_time is not None:
        update_data["range_end_time"] = parse_time(pattern_data.range_end_time)
    if pattern_data.is_active is not None:
        update_data["is_active"] = pattern_data.is_active

    # Handle weekly schedule updates
    if pattern_data.weekly_schedule:
        schedule = pattern_data.weekly_schedule
        for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
            day_schedule = getattr(schedule, day, None)
            if day_schedule:
                update_data[f"{day}_available"] = day_schedule.available
                update_data[f"{day}_start"] = parse_time(day_schedule.start_time)
                update_data[f"{day}_end"] = parse_time(day_schedule.end_time)

    updated_pattern = resolver.update_pattern(pattern_id, **update_data)

    return pattern_to_response(updated_pattern)


@router.delete("/employees/{employee_id}/availability-patterns/{pattern_id}")
async def delete_availability_pattern(
    employee_id: int,
    pattern_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an availability pattern."""
    pattern = db.query(AvailabilityPattern).filter(
        AvailabilityPattern.pattern_id == pattern_id,
        AvailabilityPattern.employee_id == employee_id
    ).first()

    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    if not current_user.is_superadmin and pattern.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this pattern")

    resolver = AvailabilityResolver(db)
    resolver.delete_pattern(pattern_id)

    return {"message": "Pattern deleted successfully"}


@router.post("/employees/{employee_id}/availability-calendar")
async def get_employee_availability_calendar(
    employee_id: int,
    request: CalendarRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a calendar view of employee availability for a date range.

    Returns availability status for each day, combining patterns and specific dates.
    """
    # Verify employee exists and user has access
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not current_user.is_superadmin and employee.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this employee")

    try:
        start_date = date.fromisoformat(request.start_date)
        end_date = date.fromisoformat(request.end_date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD."
        )

    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="end_date must be after start_date"
        )

    # Limit calendar to 62 days (2 months)
    if (end_date - start_date).days > 62:
        raise HTTPException(
            status_code=400,
            detail="Calendar limited to 62 days maximum"
        )

    resolver = AvailabilityResolver(db)
    calendar = resolver.get_availability_calendar(employee_id, start_date, end_date)

    return {
        "employee_id": employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "calendar": calendar
    }


@router.get("/employees/{employee_id}/check-availability")
async def check_employee_availability(
    employee_id: int,
    date_str: str = Query(..., alias="date", description="Date to check (YYYY-MM-DD)"),
    time_str: Optional[str] = Query(None, alias="time", description="Time to check (HH:MM)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if an employee is available at a specific date/time.

    Quick check endpoint for roster generation.
    """
    # Verify employee exists and user has access
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not current_user.is_superadmin and employee.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this employee")

    check_date = parse_date(date_str)
    check_time = parse_time(time_str) if time_str else None

    resolver = AvailabilityResolver(db)
    is_available, reason = resolver.is_employee_available(employee_id, check_date, check_time)

    return {
        "employee_id": employee_id,
        "date": check_date.isoformat(),
        "time": time_str,
        "is_available": is_available,
        "reason": reason
    }
