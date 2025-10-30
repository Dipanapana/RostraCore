"""Dashboard analytics endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict, List

from app.database import get_db
from app.models.employee import Employee, EmployeeStatus
from app.models.shift import Shift, ShiftStatus
from app.models.site import Site
from app.models.certification import Certification
from app.models.availability import Availability

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db)) -> Dict:
    """
    Get comprehensive dashboard metrics.

    Returns:
        Dict with all key metrics for dashboard display
    """
    # Employee Metrics
    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(
        Employee.status == EmployeeStatus.ACTIVE
    ).count()
    inactive_employees = total_employees - active_employees

    # Shift Metrics
    total_shifts = db.query(Shift).count()
    upcoming_shifts = db.query(Shift).filter(
        Shift.start_time > datetime.now()
    ).count()

    assigned_shifts = db.query(Shift).filter(
        Shift.assigned_employee_id != None
    ).count()

    unassigned_shifts = db.query(Shift).filter(
        Shift.assigned_employee_id == None
    ).count()

    # This Week's Shifts
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=7)

    shifts_this_week = db.query(Shift).filter(
        Shift.start_time >= start_of_week,
        Shift.start_time < end_of_week
    ).count()

    # Site Metrics
    total_sites = db.query(Site).count()

    # Certification Expiry Warnings
    expiring_soon = db.query(Certification).filter(
        Certification.expiry_date <= datetime.now().date() + timedelta(days=30),
        Certification.expiry_date > datetime.now().date()
    ).count()

    expired_certifications = db.query(Certification).filter(
        Certification.expiry_date <= datetime.now().date()
    ).count()

    # Availability Stats
    total_availability_records = db.query(Availability).count()

    # Calculate fill rate
    fill_rate = (assigned_shifts / total_shifts * 100) if total_shifts > 0 else 0

    return {
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


@router.get("/upcoming-shifts")
def get_upcoming_shifts(
    limit: int = 10,
    db: Session = Depends(get_db)
) -> List[Dict]:
    """
    Get upcoming shifts for dashboard display.

    Args:
        limit: Maximum number of shifts to return
        db: Database session

    Returns:
        List of upcoming shifts with details
    """
    shifts = db.query(Shift).filter(
        Shift.start_time > datetime.now()
    ).order_by(Shift.start_time).limit(limit).all()

    return [
        {
            "shift_id": s.shift_id,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "site_name": s.site.client_name if s.site else "Unknown",
            "employee_name": f"{s.employee.first_name} {s.employee.last_name}" if s.employee else "Unassigned",
            "status": s.status.value,
            "required_skill": s.required_skill
        }
        for s in shifts
    ]


@router.get("/expiring-certifications")
def get_expiring_certifications(
    days_ahead: int = 30,
    db: Session = Depends(get_db)
) -> List[Dict]:
    """
    Get certifications expiring soon.

    Args:
        days_ahead: Number of days to look ahead
        db: Database session

    Returns:
        List of expiring certifications
    """
    expiry_threshold = datetime.now().date() + timedelta(days=days_ahead)

    certs = db.query(Certification).filter(
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
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get cost trends for the specified period.

    Args:
        days: Number of days to analyze
        db: Database session

    Returns:
        Cost trend data
    """
    start_date = datetime.now() - timedelta(days=days)

    # Query shifts in the period
    shifts = db.query(Shift).filter(
        Shift.start_time >= start_date,
        Shift.assigned_employee_id != None
    ).all()

    # Calculate daily costs
    daily_costs = {}
    for shift in shifts:
        date_key = shift.start_time.date().isoformat()
        duration = (shift.end_time - shift.start_time).total_seconds() / 3600

        if shift.employee:
            cost = shift.employee.hourly_rate * duration
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
    db: Session = Depends(get_db)
) -> List[Dict]:
    """
    Get employee utilization statistics.

    Args:
        days: Number of days to analyze
        db: Database session

    Returns:
        Employee utilization data
    """
    start_date = datetime.now() - timedelta(days=days)

    # Get all active employees
    employees = db.query(Employee).filter(
        Employee.status == EmployeeStatus.ACTIVE
    ).all()

    utilization_data = []

    for emp in employees:
        # Count shifts for this employee
        shifts = db.query(Shift).filter(
            Shift.assigned_employee_id == emp.employee_id,
            Shift.start_time >= start_date
        ).all()

        total_hours = 0.0
        for shift in shifts:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            total_hours += duration

        utilization_data.append({
            "employee_id": emp.employee_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "role": emp.role.value,
            "shifts_assigned": len(shifts),
            "total_hours": round(total_hours, 2),
            "avg_hours_per_week": round(total_hours / (days / 7), 2) if days > 0 else 0,
            "utilization_rate": round((total_hours / (days * 24)) * 100, 2)
        })

    # Sort by total hours descending
    utilization_data.sort(key=lambda x: x["total_hours"], reverse=True)

    return utilization_data


@router.get("/site-coverage")
def get_site_coverage(db: Session = Depends(get_db)) -> List[Dict]:
    """
    Get coverage statistics per site.

    Args:
        db: Database session

    Returns:
        Site coverage data
    """
    sites = db.query(Site).all()

    coverage_data = []

    for site in sites:
        total_shifts = db.query(Shift).filter(
            Shift.site_id == site.site_id
        ).count()

        assigned_shifts = db.query(Shift).filter(
            Shift.site_id == site.site_id,
            Shift.assigned_employee_id != None
        ).count()

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
def get_weekly_summary(db: Session = Depends(get_db)) -> Dict:
    """
    Get summary statistics for the current week.

    Args:
        db: Database session

    Returns:
        Weekly summary data
    """
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=7)

    # Shifts this week
    shifts_this_week = db.query(Shift).filter(
        Shift.start_time >= start_of_week,
        Shift.start_time < end_of_week
    ).all()

    total_shifts = len(shifts_this_week)
    assigned_shifts = len([s for s in shifts_this_week if s.assigned_employee_id])
    unassigned_shifts = total_shifts - assigned_shifts

    # Calculate costs
    total_cost = 0.0
    total_hours = 0.0

    for shift in shifts_this_week:
        if shift.employee:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            cost = shift.employee.hourly_rate * duration
            total_cost += cost
            total_hours += duration

    # Employees working this week
    employees_this_week = len(set(
        s.assigned_employee_id for s in shifts_this_week
        if s.assigned_employee_id
    ))

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
