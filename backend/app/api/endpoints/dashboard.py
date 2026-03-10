"""Dashboard analytics endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case as sa_case
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
from app.models.payroll import PayrollSummary
from app.models.client_invoice import ClientInvoice
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
    # Get organization ID from current user (multi-tenancy security)
    org_id = current_user.org_id
    if not org_id:
        # Superadmins without org_id get empty metrics - they should use /admin endpoints
        # Regular users without org_id should not see any data
        return {
            "users": {"total": 0, "active": 0},
            "employees": {"total": 0, "active": 0, "inactive": 0},
            "shifts": {"total": 0, "upcoming": 0, "assigned": 0, "unassigned": 0, "this_week": 0, "fill_rate": 0},
            "sites": {"total": 0},
            "certifications": {"total": 0, "expiring_soon": 0, "expired": 0},
            "availability": {"total_records": 0}
        }

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

    # Count assigned shifts (shifts with at least one assignment - including PENDING)
    # PENDING means guard is assigned but not yet confirmed, still counts as filled
    assigned_shift_ids = db.query(ShiftAssignment.shift_id).filter(
        ShiftAssignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED])
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

    # Certification Stats - filtered by organization through employees
    total_certifications = db.query(Certification).join(Employee).filter(
        Employee.org_id == org_id
    ).count()

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

    # ── Financial Metrics ──────────────────────────────────────────────
    current_month_start = today.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=today.day - 1)
    last_month_end = current_month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    # Current month payroll
    payroll_current = db.query(
        func.sum(PayrollSummary.gross_pay),
        func.sum(PayrollSummary.net_pay),
        func.sum(PayrollSummary.total_deductions),
        func.count(PayrollSummary.payroll_id),
    ).filter(
        PayrollSummary.org_id == org_id,
        PayrollSummary.period_start >= current_month_start.date(),
    ).first()

    # Last month payroll (for trend)
    payroll_last = db.query(
        func.sum(PayrollSummary.gross_pay),
    ).filter(
        PayrollSummary.org_id == org_id,
        PayrollSummary.period_start >= last_month_start.date(),
        PayrollSummary.period_start < current_month_start.date(),
    ).scalar() or 0

    # Invoice metrics
    invoices_total = db.query(func.count(ClientInvoice.invoice_id)).filter(
        ClientInvoice.org_id == org_id
    ).scalar() or 0

    invoices_outstanding = db.query(
        func.count(ClientInvoice.invoice_id),
        func.coalesce(func.sum(ClientInvoice.total_amount), 0),
    ).filter(
        ClientInvoice.org_id == org_id,
        ClientInvoice.status.in_(["sent", "overdue"]),
    ).first()

    invoices_overdue = db.query(func.count(ClientInvoice.invoice_id)).filter(
        ClientInvoice.org_id == org_id,
        ClientInvoice.status == "overdue",
    ).scalar() or 0

    # Revenue (paid invoices current month)
    revenue_current = db.query(
        func.coalesce(func.sum(ClientInvoice.total_amount), 0)
    ).filter(
        ClientInvoice.org_id == org_id,
        ClientInvoice.status == "paid",
        ClientInvoice.paid_date >= current_month_start.date(),
    ).scalar() or 0

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
            "total": total_certifications,
            "expiring_soon": expiring_soon,
            "expired": expired_certifications
        },
        "availability": {
            "total_records": total_availability_records
        },
        "payroll": {
            "gross_pay": float(payroll_current[0] or 0),
            "net_pay": float(payroll_current[1] or 0),
            "total_deductions": float(payroll_current[2] or 0),
            "records": payroll_current[3] or 0,
            "last_month_gross": float(payroll_last),
        },
        "invoices": {
            "total": invoices_total,
            "outstanding_count": invoices_outstanding[0] or 0,
            "outstanding_amount": float(invoices_outstanding[1] or 0),
            "overdue_count": invoices_overdue,
        },
        "revenue": {
            "current_month": float(revenue_current),
        },
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
    # Get organization ID (multi-tenancy security)
    org_id = current_user.org_id
    if not org_id:
        return []  # No org = no data

    # Check cache (include org_id)
    cache_key = f"dashboard:upcoming_shifts:org_{org_id}:{limit}"
    cached_shifts = CacheService.get(cache_key)
    if cached_shifts:
        return cached_shifts

    # Use Shift.org_id directly (indexed) instead of site subquery
    shifts = db.query(Shift).options(
        joinedload(Shift.site)
    ).filter(
        Shift.org_id == org_id,
        Shift.start_time > datetime.now()
    ).order_by(Shift.start_time).limit(limit).all()

    # Bulk-load assignments with employees for all shifts (2 queries total)
    shift_ids = [s.shift_id for s in shifts]
    from collections import defaultdict
    assignments_by_shift = defaultdict(list)
    if shift_ids:
        all_assignments = db.query(ShiftAssignment).options(
            joinedload(ShiftAssignment.employee)
        ).filter(
            ShiftAssignment.shift_id.in_(shift_ids),
            ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED])
        ).all()
        for a in all_assignments:
            assignments_by_shift[a.shift_id].append(a)

    result = []
    for s in shifts:
        assignments = assignments_by_shift[s.shift_id]
        employee_names = [
            f"{a.employee.first_name} {a.employee.last_name}"
            for a in assignments if a.employee
        ]
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
    org_id = current_user.org_id
    if not org_id:
        return []  # No org = no data
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
    org_id = current_user.org_id
    if not org_id:
        return {"trend": [], "summary": {"total_cost": 0, "avg_daily_cost": 0, "period_days": days}}

    # Check cache
    cache_key_cost = f"dashboard:cost_trends:org_{org_id}:{days}"
    cached = CacheService.get(cache_key_cost)
    if cached:
        return cached

    start_date = datetime.now() - timedelta(days=days)

    # Single aggregation query: daily cost grouped in SQL (uses Shift.org_id directly)
    daily_costs_rows = db.query(
        func.date(Shift.start_time).label('day'),
        func.sum(ShiftAssignment.total_cost).label('total_cost')
    ).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.org_id == org_id,
        Shift.start_time >= start_date,
        ShiftAssignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED])
    ).group_by(
        func.date(Shift.start_time)
    ).all()

    daily_costs = {
        str(row.day): float(row.total_cost or 0)
        for row in daily_costs_rows
    }

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

    result = {
        "trend": trend_data,
        "summary": {
            "total_cost": round(total_cost, 2),
            "avg_daily_cost": round(avg_daily_cost, 2),
            "period_days": days
        }
    }

    CacheService.set(cache_key_cost, result, ttl=180)
    return result


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
    org_id = current_user.org_id
    if not org_id:
        return []  # No org = no data

    # Check cache
    cache_key_util = f"dashboard:employee_utilization:org_{org_id}:{days}"
    cached = CacheService.get(cache_key_util)
    if cached:
        return cached

    start_date = datetime.now() - timedelta(days=days)

    # Single aggregation query: shifts + hours per employee (instead of N queries)
    stats_rows = db.query(
        ShiftAssignment.employee_id,
        func.count(ShiftAssignment.assignment_id).label('shifts_assigned'),
        func.sum(ShiftAssignment.regular_hours + ShiftAssignment.overtime_hours).label('total_hours')
    ).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.org_id == org_id,
        Shift.start_time >= start_date,
        ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED])
    ).group_by(ShiftAssignment.employee_id).all()

    stats_by_emp = {r.employee_id: r for r in stats_rows}

    # Get all active employees (single query)
    employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == EmployeeStatus.ACTIVE
    ).all()

    utilization_data = []
    for emp in employees:
        stats = stats_by_emp.get(emp.employee_id)
        total_hours = float(stats.total_hours or 0) if stats else 0.0
        shifts_assigned = stats.shifts_assigned if stats else 0

        utilization_data.append({
            "employee_id": emp.employee_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "role": emp.role.value,
            "shifts_assigned": shifts_assigned,
            "total_hours": round(total_hours, 2),
            "avg_hours_per_week": round(total_hours / (days / 7), 2) if days > 0 else 0,
            "utilization_rate": round((total_hours / (days * 24)) * 100, 2)
        })

    # Sort by total hours descending
    utilization_data.sort(key=lambda x: x["total_hours"], reverse=True)

    CacheService.set(cache_key_util, utilization_data, ttl=300)
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
    org_id = current_user.org_id
    if not org_id:
        return []  # No org = no data

    # Check cache
    cache_key_cov = f"dashboard:site_coverage:org_{org_id}"
    cached = CacheService.get(cache_key_cov)
    if cached:
        return cached

    # Get sites for clients in this organization
    sites = db.query(Site).join(Client).filter(
        Client.org_id == org_id
    ).all()

    site_ids = [s.site_id for s in sites]

    # Pre-aggregate: total + upcoming shifts per site (1 query instead of 2*N)
    now = datetime.now()
    shift_stats = db.query(
        Shift.site_id,
        func.count(Shift.shift_id).label('total_shifts'),
        func.count(sa_case((Shift.start_time > now, Shift.shift_id))).label('upcoming_shifts')
    ).filter(
        Shift.site_id.in_(site_ids)
    ).group_by(Shift.site_id).all() if site_ids else []

    # Pre-aggregate: assigned shifts per site (1 query instead of N)
    assigned_stats = db.query(
        Shift.site_id,
        func.count(func.distinct(ShiftAssignment.shift_id)).label('assigned_shifts')
    ).join(
        ShiftAssignment, ShiftAssignment.shift_id == Shift.shift_id
    ).filter(
        Shift.site_id.in_(site_ids),
        ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED])
    ).group_by(Shift.site_id).all() if site_ids else []

    # Build lookups
    total_by_site = {r.site_id: (r.total_shifts, r.upcoming_shifts) for r in shift_stats}
    assigned_by_site = {r.site_id: r.assigned_shifts for r in assigned_stats}

    coverage_data = []
    for site in sites:
        total_shifts, upcoming_shifts = total_by_site.get(site.site_id, (0, 0))
        assigned_shifts = assigned_by_site.get(site.site_id, 0)
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

    CacheService.set(cache_key_cov, coverage_data, ttl=300)
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
    org_id = current_user.org_id
    if not org_id:
        return {
            "week_start": None, "week_end": None,
            "shifts": {"total": 0, "assigned": 0, "unassigned": 0, "fill_rate": 0},
            "costs": {"total": 0, "avg_per_shift": 0},
            "hours": {"total": 0, "avg_per_employee": 0},
            "employees_utilized": 0
        }
    # Check cache
    cache_key_weekly = f"dashboard:weekly_summary:org_{org_id}"
    cached = CacheService.get(cache_key_weekly)
    if cached:
        return cached

    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=7)

    # Use Shift.org_id directly (indexed) instead of site subquery
    shifts_this_week = db.query(Shift).filter(
        Shift.org_id == org_id,
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

    # Calculate costs using BCEA-compliant assignment.total_cost
    total_cost = 0.0
    total_hours = 0.0

    for assignment in assignments_this_week:
        if assignment.shift:
            # Use assignment.total_cost which includes BCEA premiums
            cost = assignment.total_cost or 0.0
            total_cost += cost
            # Use assignment.total_hours for accurate hours (includes regular + overtime)
            total_hours += assignment.total_hours

    # Employees working this week
    employees_this_week = len(set(a.employee_id for a in assignments_this_week))

    result = {
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

    CacheService.set(cache_key_weekly, result, ttl=120)
    return result
