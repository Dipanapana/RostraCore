"""Dashboard analytics endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict, List

from app.database import get_db
from app.models.employee import Employee, EmployeeStatus
from app.models.shift import Shift, ShiftStatus
from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
from app.models.site import Site
from app.models.certification import Certification
from app.models.availability import Availability
from app.models.user import User
from app.models.client import Client
from app.services.cache_service import cached, CacheService
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics")
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get comprehensive dashboard metrics filtered by organization.

    **Cached for 5 minutes** - Significantly improves dashboard load time

    Returns:
        Dict with all key metrics for dashboard display
    """
    # Get organization ID from current user
    org_id = current_user.org_id
    if not org_id:
        # Fallback for users without organization (superadmin)
        org_id = 1

    # Check cache first (include org_id in cache key for multi-tenancy)
    cache_key = f"dashboard:metrics:org_{org_id}"
    cached_metrics = CacheService.get(cache_key)
    if cached_metrics:
        return cached_metrics

    # User Metrics (authentication accounts) - filtered by organization
    total_users = db.query(User).filter(User.org_id == org_id).count()
    active_users = db.query(User).filter(
        User.org_id == org_id,
        User.is_active == True
    ).count()

    # Employee Metrics (security guards) - filtered by organization
    total_employees = db.query(Employee).filter(Employee.org_id == org_id).count()
    active_employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == EmployeeStatus.ACTIVE
    ).count()
    inactive_employees = total_employees - active_employees

    # Shift Metrics - filtered by organization
    # Get all sites belonging to this organization (directly or via clients)
    org_site_ids = db.query(Site.site_id).filter(
        Site.org_id == org_id
    ).subquery()

    total_shifts = db.query(Shift).filter(
        Shift.site_id.in_(org_site_ids)
    ).count()

    upcoming_shifts = db.query(Shift).filter(
        Shift.site_id.in_(org_site_ids),
        Shift.start_time > datetime.now()
    ).count()

    # Count assigned shifts (shifts with at least one confirmed assignment)
    assigned_shift_ids = db.query(ShiftAssignment.shift_id).filter(
        ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED])
    ).distinct().subquery()

    assigned_shifts = db.query(Shift).filter(
        Shift.site_id.in_(org_site_ids),
        Shift.shift_id.in_(assigned_shift_ids)
    ).count()

    # Unassigned shifts = total shifts - assigned shifts
    unassigned_shifts = total_shifts - assigned_shifts

    # This Week's Shifts
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=7)

    shifts_this_week = db.query(Shift).filter(
        Shift.site_id.in_(org_site_ids),
        Shift.start_time >= start_of_week,
        Shift.start_time < end_of_week
    ).count()

    # Site Metrics - filtered by organization
    total_sites = db.query(Site).filter(
        Site.org_id == org_id
    ).count()

    # Certification Expiry Warnings - filtered by organization through employees
    expiring_soon = db.query(Certification).join(Employee).filter(
        Employee.org_id == org_id,
        Certification.expiry_date <= datetime.now().date() + timedelta(days=30),
        Certification.expiry_date > datetime.now().date()
    ).count()

    expired_certifications = db.query(Certification).join(Employee).filter(
        Employee.org_id == org_id,
        Certification.expiry_date <= datetime.now().date()
    ).count()

    # Availability Stats - filtered by organization through employees
    total_availability_records = db.query(Availability).join(Employee).filter(
        Employee.org_id == org_id
    ).count()

    # Calculate fill rate
    fill_rate = (assigned_shifts / total_shifts * 100) if total_shifts > 0 else 0

    metrics = {
        "users": {
            "total": total_users,
            "active": active_users
        },
        "employees": {
            "total": total_employees,
            "active": active_employees,
            "inactive": inactive_employees
        },
        "shifts": {
            "total": total_shifts,
            "upcoming": upcoming_shifts,
            "assigned": assigned_shifts,
            "unassigned": unassigned_shifts,
            "this_week": shifts_this_week,
            "fill_rate": round(fill_rate, 2)
        },
        "sites": {
            "total": total_sites
        },
        "certifications": {
            "expiring_soon": expiring_soon,
            "expired": expired_certifications
        },
        "availability": {
            "total_records": total_availability_records
        }
    }

    # Cache for 5 minutes (300 seconds)
    CacheService.set(cache_key, metrics, ttl=300)

    return metrics


@router.get("/upcoming-shifts")
def get_upcoming_shifts(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict]:
    """
    Get upcoming shifts for dashboard display (filtered by organization).

    **Cached for 2 minutes** - Reduces database load

    Args:
        limit: Maximum number of shifts to return
        db: Database session
        current_user: Current authenticated user

    Returns:
        List of upcoming shifts with details
    """
    # Get organization ID
    org_id = current_user.org_id or 1

    # Check cache (include org_id)
    cache_key = f"dashboard:upcoming_shifts:org_{org_id}:{limit}"
    cached_shifts = CacheService.get(cache_key)
    if cached_shifts:
        return cached_shifts

    # Get shifts for sites in this organization
    org_site_ids = db.query(Site.site_id).join(Client).filter(
        Client.org_id == org_id
    ).subquery()

    shifts = db.query(Shift).filter(
        Shift.site_id.in_(org_site_ids),
        Shift.start_time > datetime.now()
    ).order_by(Shift.start_time).limit(limit).all()

    result = []
    for s in shifts:
        # Get confirmed assignments for this shift
        assignments = db.query(ShiftAssignment).filter(
            ShiftAssignment.shift_id == s.shift_id,
            ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED])
        ).all()

        # Get employee names (multiple employees can be assigned)
        employee_names = []
        for assignment in assignments:
            if assignment.employee:
                employee_names.append(f"{assignment.employee.first_name} {assignment.employee.last_name}")

        employee_name = ", ".join(employee_names) if employee_names else "Unassigned"

        result.append({
            "shift_id": s.shift_id,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "site_name": s.site.client_name if s.site else "Unknown",
            "employee_name": employee_name,
            "status": s.status.value,
            "required_skill": s.required_skill
        })

    # Cache for 2 minutes (120 seconds)
    CacheService.set(cache_key, result, ttl=120)

    return result


@router.get("/expiring-certifications")
def get_expiring_certifications(
    days_ahead: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict]:
    """
    Get certifications expiring soon (filtered by organization).

    Args:
        days_ahead: Number of days to look ahead
        db: Database session
        current_user: Current authenticated user

    Returns:
        List of expiring certifications
    """
    org_id = current_user.org_id or 1
    expiry_threshold = datetime.now().date() + timedelta(days=days_ahead)

    certs = db.query(Certification).join(Employee).filter(
        Employee.org_id == org_id,
        Certification.expiry_date <= expiry_threshold,
        Certification.expiry_date > datetime.now().date()
    ).order_by(Certification.expiry_date).all()

    return [
        {
            "cert_id": c.cert_id,
            "employee_id": c.employee_id,
            "employee_name": f"{c.employee.first_name} {c.employee.last_name}",
            "cert_type": c.cert_type,
            "expiry_date": c.expiry_date,
            "days_until_expiry": (c.expiry_date - datetime.now().date()).days,
            "verified": c.verified
        }
        for c in certs
    ]


@router.get("/cost-trends")
def get_cost_trends(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get cost trends for the specified period (filtered by organization).

    Args:
        days: Number of days to analyze
        db: Database session
        current_user: Current authenticated user

    Returns:
        Cost trend data
    """
    org_id = current_user.org_id or 1
    start_date = datetime.now() - timedelta(days=days)

    # Get shifts for sites in this organization
    org_site_ids = db.query(Site.site_id).join(Client).filter(
        Client.org_id == org_id
    ).subquery()

    # Query shift assignments in the period (confirmed/completed only)
    assignments = db.query(ShiftAssignment).join(Shift).filter(
        Shift.site_id.in_(org_site_ids),
        Shift.start_time >= start_date,
        ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED])
    ).all()

    # Calculate daily costs
    daily_costs = {}
    for assignment in assignments:
        if assignment.shift and assignment.employee:
            date_key = assignment.shift.start_time.date().isoformat()
            duration = (assignment.shift.end_time - assignment.shift.start_time).total_seconds() / 3600
            cost = assignment.employee.hourly_rate * duration
            daily_costs[date_key] = daily_costs.get(date_key, 0) + cost

    # Prepare trend data
    trend_data = []
    current_date = start_date.date()
    end_date = datetime.now().date()

    while current_date <= end_date:
        date_key = current_date.isoformat()
        trend_data.append({
            "date": date_key,
            "cost": round(daily_costs.get(date_key, 0), 2)
        })
        current_date += timedelta(days=1)

    total_cost = sum(daily_costs.values())
    avg_daily_cost = total_cost / days if days > 0 else 0

    return {
        "trend": trend_data,
        "summary": {
            "total_cost": round(total_cost, 2),
            "avg_daily_cost": round(avg_daily_cost, 2),
            "period_days": days
        }
    }


@router.get("/employee-utilization")
def get_employee_utilization(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict]:
    """
    Get employee utilization statistics (filtered by organization).

    Args:
        days: Number of days to analyze
        db: Database session
        current_user: Current authenticated user

    Returns:
        Employee utilization data
    """
    org_id = current_user.org_id or 1
    start_date = datetime.now() - timedelta(days=days)

    # Get all active employees in this organization
    employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == EmployeeStatus.ACTIVE
    ).all()

    utilization_data = []

    for emp in employees:
        # Count shift assignments for this employee (confirmed/completed)
        assignments = db.query(ShiftAssignment).join(Shift).filter(
            ShiftAssignment.employee_id == emp.employee_id,
            ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED]),
            Shift.start_time >= start_date
        ).all()

        total_hours = 0.0
        for assignment in assignments:
            if assignment.shift:
                duration = (assignment.shift.end_time - assignment.shift.start_time).total_seconds() / 3600
                total_hours += duration

        utilization_data.append({
            "employee_id": emp.employee_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "role": emp.role.value,
            "shifts_assigned": len(assignments),
            "total_hours": round(total_hours, 2),
            "avg_hours_per_week": round(total_hours / (days / 7), 2) if days > 0 else 0,
            "utilization_rate": round((total_hours / (days * 24)) * 100, 2)
        })

    # Sort by total hours descending
    utilization_data.sort(key=lambda x: x["total_hours"], reverse=True)

    return utilization_data


@router.get("/site-coverage")
def get_site_coverage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict]:
    """
    Get coverage statistics per site (filtered by organization).

    Args:
        db: Database session
        current_user: Current authenticated user

    Returns:
        Site coverage data
    """
    org_id = current_user.org_id or 1

    # Get sites for clients in this organization
    sites = db.query(Site).join(Client).filter(
        Client.org_id == org_id
    ).all()

    coverage_data = []

    for site in sites:
        total_shifts = db.query(Shift).filter(
            Shift.site_id == site.site_id
        ).count()

        # Count shifts with at least one confirmed assignment
        assigned_shift_ids = db.query(ShiftAssignment.shift_id).join(Shift).filter(
            Shift.site_id == site.site_id,
            ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED])
        ).distinct().all()
        assigned_shifts = len(assigned_shift_ids)

        upcoming_shifts = db.query(Shift).filter(
            Shift.site_id == site.site_id,
            Shift.start_time > datetime.now()
        ).count()

        coverage_rate = (assigned_shifts / total_shifts * 100) if total_shifts > 0 else 0

        coverage_data.append({
            "site_id": site.site_id,
            "client_name": site.client_name,
            "address": site.address,
            "total_shifts": total_shifts,
            "assigned_shifts": assigned_shifts,
            "upcoming_shifts": upcoming_shifts,
            "coverage_rate": round(coverage_rate, 2),
            "min_staff": site.min_staff
        })

    # Sort by coverage rate ascending (show sites needing attention first)
    coverage_data.sort(key=lambda x: x["coverage_rate"])

    return coverage_data


@router.get("/weekly-summary")
def get_weekly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get summary statistics for the current week (filtered by organization).

    Args:
        db: Database session
        current_user: Current authenticated user

    Returns:
        Weekly summary data
    """
    org_id = current_user.org_id or 1
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=7)

    # Get shifts for sites in this organization
    org_site_ids = db.query(Site.site_id).join(Client).filter(
        Client.org_id == org_id
    ).subquery()

    # Shifts this week
    shifts_this_week = db.query(Shift).filter(
        Shift.site_id.in_(org_site_ids),
        Shift.start_time >= start_of_week,
        Shift.start_time < end_of_week
    ).all()

    total_shifts = len(shifts_this_week)

    # Get all confirmed assignments for shifts this week
    shift_ids_this_week = [s.shift_id for s in shifts_this_week]
    assignments_this_week = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id.in_(shift_ids_this_week),
        ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED])
    ).all()

    # Count assigned shifts (shifts with at least one assignment)
    assigned_shift_ids = set(a.shift_id for a in assignments_this_week)
    assigned_shifts = len(assigned_shift_ids)
    unassigned_shifts = total_shifts - assigned_shifts

    # Calculate costs
    total_cost = 0.0
    total_hours = 0.0

    for assignment in assignments_this_week:
        if assignment.shift and assignment.employee:
            duration = (assignment.shift.end_time - assignment.shift.start_time).total_seconds() / 3600
            cost = assignment.employee.hourly_rate * duration
            total_cost += cost
            total_hours += duration

    # Employees working this week
    employees_this_week = len(set(a.employee_id for a in assignments_this_week))

    return {
        "week_start": start_of_week.date().isoformat(),
        "week_end": end_of_week.date().isoformat(),
        "shifts": {
            "total": total_shifts,
            "assigned": assigned_shifts,
            "unassigned": unassigned_shifts,
            "fill_rate": round((assigned_shifts / total_shifts * 100) if total_shifts > 0 else 0, 2)
        },
        "costs": {
            "total": round(total_cost, 2),
            "avg_per_shift": round(total_cost / assigned_shifts if assigned_shifts > 0 else 0, 2)
        },
        "hours": {
            "total": round(total_hours, 2),
            "avg_per_employee": round(total_hours / employees_this_week if employees_this_week > 0 else 0, 2)
        },
        "employees_utilized": employees_this_week
    }
