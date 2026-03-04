"""
Dashboard API Endpoints
Provides specialized dashboard views for different user personas
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, case, distinct, extract
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.database import get_db
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
from app.models.site import Site
from app.models.payroll import PayrollSummary
from app.models.organization import Organization
from app.models.availability import Availability
from app.models.user import User
from app.services.cache_service import CacheService
from app.auth.security import get_current_user, get_current_org_id

router = APIRouter(prefix="/api/v1/dashboards")


@router.get("/executive")
async def get_executive_dashboard(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Executive Dashboard - Big Numbers, Minimal Text

    Designed for: C-level executives and business owners
    Focus: High-level KPIs, financial health, growth metrics

    Metrics:
    - Total revenue (current month vs last month)
    - Total guards employed
    - Active sites
    - Shift fill rate
    - Average cost per shift
    - Total shifts this month
    - Guard utilization rate
    - Revenue per guard
    """

    # Check cache first
    cache_key = f"dashboard:executive:{org_id or 'all'}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        return cached_data

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    last_month_end = month_start - timedelta(seconds=1)

    # 1. Total Guards
    total_guards = db.query(func.count(Employee.employee_id)).filter(
        Employee.status == 'active',
        *([Employee.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # 2. Active Sites — Site model has no is_active column; count all sites for the org
    active_sites = db.query(func.count(Site.site_id)).filter(
        *([Site.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # 3. Revenue This Month (from payroll — period_start and gross_pay are the correct fields)
    revenue_this_month = db.query(func.sum(PayrollSummary.gross_pay)).filter(
        PayrollSummary.period_start >= month_start.date(),
        *([PayrollSummary.org_id == org_id] if org_id else [])
    ).scalar() or Decimal('0.00')

    # 4. Revenue Last Month
    revenue_last_month = db.query(func.sum(PayrollSummary.gross_pay)).filter(
        PayrollSummary.period_start >= last_month_start.date(),
        PayrollSummary.period_start < month_start.date(),
        *([PayrollSummary.org_id == org_id] if org_id else [])
    ).scalar() or Decimal('0.00')

    # Calculate revenue growth
    revenue_growth = 0.0
    if revenue_last_month and float(revenue_last_month) > 0:
        revenue_growth = ((float(revenue_this_month) - float(revenue_last_month)) / float(revenue_last_month)) * 100

    # 5. Shifts This Month
    total_shifts = db.query(func.count(Shift.shift_id)).filter(
        Shift.start_time >= month_start,
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # Filled shifts: count distinct shift_ids in ShiftAssignment that are not cancelled
    filled_shift_ids_subq = db.query(ShiftAssignment.shift_id).filter(
        ShiftAssignment.status != 'cancelled',
        ShiftAssignment.shift_id.in_(
            db.query(Shift.shift_id).filter(
                Shift.start_time >= month_start,
                *([Shift.org_id == org_id] if org_id else [])
            )
        )
    ).distinct().subquery()
    filled_shifts = db.query(func.count()).select_from(filled_shift_ids_subq).scalar() or 0

    fill_rate = (filled_shifts / total_shifts * 100) if total_shifts > 0 else 0.0

    # 6. Average Cost Per Shift — use ShiftAssignment.total_cost (Shift.cost does not exist)
    avg_shift_cost = db.query(func.avg(ShiftAssignment.total_cost)).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.status != 'cancelled',
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0.0

    # 7. Revenue Per Guard
    revenue_per_guard = float(revenue_this_month) / total_guards if total_guards > 0 else 0.0

    # 8. Guard Utilization Rate (shifts worked / available shifts)
    # Simplified: filled shifts / total guards / working days this month
    days_in_month = (now - month_start).days + 1
    expected_shifts = total_guards * days_in_month * 0.8  # Assuming 80% availability
    utilization_rate = (filled_shifts / expected_shifts * 100) if expected_shifts > 0 else 0.0

    # 9. Customer Count (if multi-tenant)
    customer_count = db.query(func.count(Organization.org_id)).filter(
        Organization.is_active == True
    ).scalar() or 0

    # 10. Shifts Trend (last 7 days) — use ShiftAssignment join instead of Shift.assigned_employee_id
    shifts_trend = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        day_shifts = db.query(func.count(distinct(ShiftAssignment.shift_id))).join(
            Shift, Shift.shift_id == ShiftAssignment.shift_id
        ).filter(
            Shift.start_time >= day_start,
            Shift.start_time < day_end,
            ShiftAssignment.status != 'cancelled',
            *([Shift.org_id == org_id] if org_id else [])
        ).scalar() or 0

        shifts_trend.append({
            "date": day.strftime("%Y-%m-%d"),
            "shifts": day_shifts
        })

    dashboard_data = {
        "period": {
            "current_month": month_start.strftime("%B %Y"),
            "last_updated": now.isoformat()
        },
        "revenue": {
            "current_month": float(revenue_this_month),
            "last_month": float(revenue_last_month),
            "growth_percentage": round(revenue_growth, 1),
            "currency": "ZAR"
        },
        "workforce": {
            "total_guards": total_guards,
            "active_sites": active_sites,
            "revenue_per_guard": round(revenue_per_guard, 2),
            "utilization_rate": round(utilization_rate, 1)
        },
        "operations": {
            "total_shifts": total_shifts,
            "filled_shifts": filled_shifts,
            "fill_rate": round(fill_rate, 1),
            "avg_cost_per_shift": float(avg_shift_cost)
        },
        "customers": {
            "total_customers": customer_count,
            "active_customers": customer_count  # All active for now
        },
        "trends": {
            "shifts_last_7_days": shifts_trend
        }
    }

    # Cache for 5 minutes
    CacheService.set(cache_key, dashboard_data, ttl=300)

    return dashboard_data


@router.get("/operations")
async def get_operations_dashboard(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Operations Dashboard - Action-Oriented

    Designed for: Operations managers and schedulers
    Focus: Immediate actions needed, operational health, scheduling efficiency

    Metrics:
    - Unfilled shifts (next 7 days)
    - Guards with expiring certifications
    - Attendance issues (no-shows, late arrivals)
    - Upcoming roster gaps
    - Guard availability status
    - Site coverage status
    """

    # Check cache
    cache_key = f"dashboard:operations:{org_id or 'all'}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        return cached_data

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = today_start + timedelta(days=7)

    # 1. Unfilled Shifts (Next 7 Days) — shifts with no non-cancelled ShiftAssignment
    assigned_shift_ids = db.query(ShiftAssignment.shift_id).filter(
        ShiftAssignment.status != 'cancelled'
    ).distinct()

    unfilled_shifts = db.query(Shift).filter(
        Shift.start_time >= now,
        Shift.start_time < week_end,
        Shift.shift_id.notin_(assigned_shift_ids),
        *([Shift.org_id == org_id] if org_id else [])
    ).order_by(Shift.start_time).limit(50).all()

    unfilled_shifts_data = [
        {
            "shift_id": shift.shift_id,
            "site_id": shift.site_id,
            "site_name": shift.site.site_name if shift.site else "Unknown",
            "start_time": shift.start_time.isoformat(),
            "end_time": shift.end_time.isoformat(),
            "hours_until": int((shift.start_time - now).total_seconds() / 3600),
            "urgency": "critical" if (shift.start_time - now).total_seconds() < 86400 else "high" if (shift.start_time - now).total_seconds() < 172800 else "medium"
        }
        for shift in unfilled_shifts
    ]

    # 2. Expiring Certifications (Next 30 Days)
    from app.models.certification import Certification
    thirty_days = now + timedelta(days=30)

    expiring_certs = db.query(Certification).join(Employee).filter(
        Certification.expiry_date.isnot(None),
        Certification.expiry_date > now,
        Certification.expiry_date <= thirty_days,
        Employee.status == 'active',
        *([Employee.org_id == org_id] if org_id else [])
    ).order_by(Certification.expiry_date).limit(20).all()

    today_date = now.date()
    expiring_certs_data = [
        {
            "cert_id": cert.cert_id,
            "employee_id": cert.employee_id,
            "employee_name": f"{cert.employee.first_name} {cert.employee.last_name}" if cert.employee else "Unknown",
            "cert_type": cert.cert_type,
            "expiry_date": cert.expiry_date.isoformat() if cert.expiry_date else None,
            "days_until_expiry": (cert.expiry_date - today_date).days if cert.expiry_date else None,
            "urgency": "critical" if cert.expiry_date and (cert.expiry_date - today_date).days <= 7 else "high" if cert.expiry_date and (cert.expiry_date - today_date).days <= 14 else "medium"
        }
        for cert in expiring_certs
    ]

    # 3. Attendance Issues (Last 7 Days) — use ShiftAssignment (no Attendance model)
    seven_days_ago = today_start - timedelta(days=7)

    # No-shows: assigned but never checked in, shift start was in the past
    no_shows = db.query(func.count(ShiftAssignment.assignment_id)).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= seven_days_ago,
        Shift.start_time < now,
        ShiftAssignment.checked_in == False,
        ShiftAssignment.status.notin_(['cancelled']),
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # Late arrivals: checked in more than 15 minutes after shift start
    late_arrivals = db.query(func.count(ShiftAssignment.assignment_id)).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= seven_days_ago,
        ShiftAssignment.checked_in == True,
        ShiftAssignment.check_in_time > Shift.start_time + timedelta(minutes=15),
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # 4. Guards Available Today
    available_today = db.query(Availability).join(Employee).filter(
        Availability.date == today_start.date(),
        Availability.available == True,
        Employee.status == 'active',
        *([Employee.org_id == org_id] if org_id else [])
    ).count()

    # 5. Site Coverage (Today) — Site has no is_active; count all sites for the org
    sites_needing_coverage = db.query(Site).filter(
        *([Site.org_id == org_id] if org_id else [])
    ).count()

    total_today = db.query(func.count(Shift.shift_id)).filter(
        Shift.start_time >= today_start,
        Shift.start_time < today_start + timedelta(days=1),
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # filled_today: shifts where at least one active assignment exists today
    filled_today = db.query(func.count(distinct(ShiftAssignment.shift_id))).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= today_start,
        Shift.start_time < today_start + timedelta(days=1),
        ShiftAssignment.status != 'cancelled',
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    coverage_rate_today = (filled_today / total_today * 100) if total_today > 0 else 100.0

    # 6. Quick Stats
    total_guards = db.query(func.count(Employee.employee_id)).filter(
        Employee.status == 'active',
        *([Employee.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # on_shift_now: shifts where at least one active assignment exists right now
    on_shift_now = db.query(func.count(distinct(ShiftAssignment.shift_id))).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time <= now,
        Shift.end_time >= now,
        ShiftAssignment.status != 'cancelled',
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    dashboard_data = {
        "last_updated": now.isoformat(),
        "action_items": {
            "unfilled_shifts": {
                "count": len(unfilled_shifts_data),
                "critical_count": len([s for s in unfilled_shifts_data if s["urgency"] == "critical"]),
                "shifts": unfilled_shifts_data[:10]  # Top 10 most urgent
            },
            "expiring_certifications": {
                "count": len(expiring_certs_data),
                "critical_count": len([c for c in expiring_certs_data if c["urgency"] == "critical"]),
                "certifications": expiring_certs_data[:10]  # Top 10 most urgent
            },
            "attendance_issues": {
                "no_shows_last_7_days": no_shows,
                "late_arrivals_last_7_days": late_arrivals,
                "total_issues": no_shows + late_arrivals
            }
        },
        "current_status": {
            "guards_on_shift_now": on_shift_now,
            "total_active_guards": total_guards,
            "guards_available_today": available_today,
            "coverage_rate_today": round(coverage_rate_today, 1)
        },
        "today_overview": {
            "total_shifts": total_today,
            "filled_shifts": filled_today,
            "unfilled_shifts": total_today - filled_today,
            "active_sites": sites_needing_coverage
        }
    }

    # Cache for 2 minutes (more frequent updates for operations)
    CacheService.set(cache_key, dashboard_data, ttl=120)

    return dashboard_data


@router.get("/financial")
async def get_financial_dashboard(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Financial Dashboard - Budget Control & Forecasting

    Designed for: Finance managers and accountants
    Focus: Budget tracking, cost optimization, financial forecasting

    Metrics:
    - Monthly payroll costs
    - Budget vs actual spending
    - Cost per site
    - Overtime costs
    - Revenue projections
    - Cost trends
    """

    # Check cache
    cache_key = f"dashboard:financial:{org_id or 'all'}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        return cached_data

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)

    # 1. Monthly PayrollSummary Costs — period_start and gross_pay are the correct fields
    payroll_totals = db.query(
        func.sum(PayrollSummary.gross_pay).label('total')
    ).filter(
        PayrollSummary.period_start >= month_start.date(),
        *([PayrollSummary.org_id == org_id] if org_id else [])
    ).first()
    total_payroll = float(payroll_totals.total or 0)

    # Derive regular/overtime from ShiftAssignment for breakdown
    # (PayrollSummary has no regular_pay or overtime_pay columns)
    payroll_breakdown = db.query(
        func.sum(ShiftAssignment.regular_pay).label('regular'),
        func.sum(ShiftAssignment.overtime_pay).label('overtime'),
    ).join(Shift, Shift.shift_id == ShiftAssignment.shift_id).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.status != 'cancelled',
        *([Shift.org_id == org_id] if org_id else [])
    ).first()
    regular_pay = float(payroll_breakdown.regular or 0)
    overtime_pay = float(payroll_breakdown.overtime or 0)

    # 2. Last Month for Comparison — period_start and gross_pay
    payroll_last_month = db.query(func.sum(PayrollSummary.gross_pay)).filter(
        PayrollSummary.period_start >= last_month_start.date(),
        PayrollSummary.period_start < month_start.date(),
        *([PayrollSummary.org_id == org_id] if org_id else [])
    ).scalar() or Decimal('0.00')

    payroll_change = ((total_payroll - float(payroll_last_month)) / float(payroll_last_month) * 100) if float(payroll_last_month) > 0 else 0.0

    # 3. Cost Per Site (This Month) — Site.site_name, ShiftAssignment.total_cost
    cost_per_site = db.query(
        Site.site_id,
        Site.site_name,
        func.sum(ShiftAssignment.total_cost).label('total_cost'),
        func.count(distinct(ShiftAssignment.assignment_id)).label('assignment_count')
    ).join(Shift, Shift.site_id == Site.site_id).join(
        ShiftAssignment, ShiftAssignment.shift_id == Shift.shift_id
    ).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.status != 'cancelled',
        *([Site.org_id == org_id] if org_id else [])
    ).group_by(Site.site_id, Site.site_name).order_by(func.sum(ShiftAssignment.total_cost).desc()).limit(10).all()

    cost_per_site_data = [
        {
            "site_id": row.site_id,
            "site_name": row.site_name,
            "total_cost": float(row.total_cost or 0),
            "shift_count": row.assignment_count,
            "avg_cost_per_shift": float(row.total_cost or 0) / row.assignment_count if row.assignment_count > 0 else 0
        }
        for row in cost_per_site
    ]

    # 4. Overtime Analysis
    overtime_percentage = (overtime_pay / total_payroll * 100) if total_payroll > 0 else 0.0

    # 5. Projected Monthly Cost (based on current burn rate)
    days_elapsed = (now - month_start).days + 1
    days_in_month = 30  # Approximate
    projected_monthly_cost = (total_payroll / days_elapsed) * days_in_month if days_elapsed > 0 else 0

    # 6. Cost Trend (Last 6 Months) — period_start and gross_pay
    cost_trend = []
    for i in range(5, -1, -1):
        month_date = (month_start - timedelta(days=i * 30)).replace(day=1)
        next_month = (month_date + timedelta(days=32)).replace(day=1)

        month_cost = db.query(func.sum(PayrollSummary.gross_pay)).filter(
            PayrollSummary.period_start >= month_date.date(),
            PayrollSummary.period_start < next_month.date(),
            *([PayrollSummary.org_id == org_id] if org_id else [])
        ).scalar() or Decimal('0.00')

        cost_trend.append({
            "month": month_date.strftime("%b %Y"),
            "cost": float(month_cost)
        })

    # 7. Budget Status (if budget is set in settings)
    # Placeholder: Assume monthly budget of R500,000
    monthly_budget = 500000.0  # TODO: Get from organization settings
    budget_used_percentage = (total_payroll / monthly_budget * 100) if monthly_budget > 0 else 0.0
    budget_remaining = monthly_budget - total_payroll

    # 8. Cost Breakdown by Assignment Cost Tiers — ShiftAssignment.total_cost
    low_cost_shifts = db.query(func.count(ShiftAssignment.assignment_id)).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.total_cost < 500,
        ShiftAssignment.status != 'cancelled',
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    medium_cost_shifts = db.query(func.count(ShiftAssignment.assignment_id)).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.total_cost >= 500,
        ShiftAssignment.total_cost < 1000,
        ShiftAssignment.status != 'cancelled',
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    high_cost_shifts = db.query(func.count(ShiftAssignment.assignment_id)).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.total_cost >= 1000,
        ShiftAssignment.status != 'cancelled',
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    dashboard_data = {
        "last_updated": now.isoformat(),
        "period": month_start.strftime("%B %Y"),
        "payroll": {
            "this_month": {
                "regular_pay": regular_pay,
                "overtime_pay": overtime_pay,
                "total": total_payroll
            },
            "last_month": float(payroll_last_month),
            "change_percentage": round(payroll_change, 1),
            "overtime_percentage": round(overtime_percentage, 1)
        },
        "budget": {
            "monthly_budget": monthly_budget,
            "spent": total_payroll,
            "remaining": budget_remaining,
            "used_percentage": round(budget_used_percentage, 1),
            "projected_monthly_cost": round(projected_monthly_cost, 2),
            "status": "on_track" if budget_used_percentage <= 90 else "warning" if budget_used_percentage <= 100 else "over_budget"
        },
        "cost_by_site": cost_per_site_data,
        "cost_breakdown": {
            "low_cost_shifts": low_cost_shifts,
            "medium_cost_shifts": medium_cost_shifts,
            "high_cost_shifts": high_cost_shifts
        },
        "trends": {
            "last_6_months": cost_trend
        }
    }

    # Cache for 10 minutes
    CacheService.set(cache_key, dashboard_data, ttl=600)

    return dashboard_data


@router.get("/people-analytics")
async def get_people_analytics_dashboard(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
) -> Dict:
    """
    People Analytics Dashboard - Guard Welfare & Fairness

    Designed for: HR managers and workforce planners
    Focus: Guard satisfaction, work-life balance, fairness metrics

    Metrics:
    - Hours worked distribution (fairness)
    - Overtime hours by guard
    - Guards at risk (overwork)
    - Shift distribution fairness
    - Guard satisfaction indicators
    - Turnover metrics
    """

    # Check cache
    cache_key = f"dashboard:people:{org_id or 'all'}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        return cached_data

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # 1. Hours Worked by Guard (This Month) — join through ShiftAssignment
    hours_by_guard = db.query(
        Employee.employee_id,
        Employee.first_name,
        Employee.last_name,
        func.count(distinct(ShiftAssignment.assignment_id)).label('shift_count'),
        func.sum(
            func.extract('epoch', Shift.end_time - Shift.start_time) / 3600
        ).label('total_hours')
    ).join(ShiftAssignment, ShiftAssignment.employee_id == Employee.employee_id
    ).join(Shift, Shift.shift_id == ShiftAssignment.shift_id).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.status != 'cancelled',
        Employee.status == 'active',
        *([Employee.org_id == org_id] if org_id else [])
    ).group_by(Employee.employee_id, Employee.first_name, Employee.last_name).all()

    # Calculate fairness metrics
    if hours_by_guard:
        hours_list = [float(row.total_hours or 0) for row in hours_by_guard]
        avg_hours = sum(hours_list) / len(hours_list) if hours_list else 0
        max_hours = max(hours_list) if hours_list else 0
        min_hours = min(hours_list) if hours_list else 0

        # Standard deviation (simple calculation)
        variance = sum((h - avg_hours) ** 2 for h in hours_list) / len(hours_list) if hours_list else 0
        std_dev = variance ** 0.5

        # Fairness score (0-100, where 100 is perfectly fair)
        fairness_score = max(0, 100 - (std_dev / avg_hours * 100)) if avg_hours > 0 else 100
    else:
        avg_hours = 0
        max_hours = 0
        min_hours = 0
        fairness_score = 100

    # 2. Guards at Risk (Overwork)
    guards_at_risk = [
        {
            "employee_id": row.employee_id,
            "name": f"{row.first_name} {row.last_name}",
            "hours_worked": float(row.total_hours or 0),
            "shifts": row.shift_count,
            "risk_level": "high" if float(row.total_hours or 0) > 240 else "medium" if float(row.total_hours or 0) > 200 else "low"
        }
        for row in hours_by_guard
        if float(row.total_hours or 0) > 200  # More than 200 hours/month
    ]

    # 3. Underutilized Guards (Less than 80 hours/month)
    underutilized_guards = [
        {
            "employee_id": row.employee_id,
            "name": f"{row.first_name} {row.last_name}",
            "hours_worked": float(row.total_hours or 0),
            "shifts": row.shift_count
        }
        for row in hours_by_guard
        if float(row.total_hours or 0) < 80
    ]

    # 4. Shift Distribution (Day vs Night) — use ShiftAssignment join
    day_shifts = db.query(func.count(distinct(ShiftAssignment.shift_id))).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.status != 'cancelled',
        extract('hour', Shift.start_time) >= 6,
        extract('hour', Shift.start_time) < 18,
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    night_shifts = db.query(func.count(distinct(ShiftAssignment.shift_id))).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.status != 'cancelled',
        or_(
            extract('hour', Shift.start_time) < 6,
            extract('hour', Shift.start_time) >= 18
        ),
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # 5. Attendance Performance — use ShiftAssignment (no Attendance model exists)
    total_shifts_with_attendance = db.query(func.count(ShiftAssignment.assignment_id)).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.checked_in == True,
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 1  # default to 1 to avoid division by zero

    on_time_arrivals = db.query(func.count(ShiftAssignment.assignment_id)).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).filter(
        Shift.start_time >= month_start,
        ShiftAssignment.checked_in == True,
        ShiftAssignment.check_in_time <= Shift.start_time + timedelta(minutes=5),
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    on_time_percentage = (on_time_arrivals / total_shifts_with_attendance * 100) if total_shifts_with_attendance > 0 else 0

    # 6. Active Guards Summary
    total_active_guards = db.query(func.count(Employee.employee_id)).filter(
        Employee.status == 'active',
        *([Employee.org_id == org_id] if org_id else [])
    ).scalar() or 0

    guards_with_shifts = len(hours_by_guard)
    guards_without_shifts = total_active_guards - guards_with_shifts

    dashboard_data = {
        "last_updated": now.isoformat(),
        "period": month_start.strftime("%B %Y"),
        "workforce_summary": {
            "total_active_guards": total_active_guards,
            "guards_with_shifts": guards_with_shifts,
            "guards_without_shifts": guards_without_shifts,
            "utilization_rate": round((guards_with_shifts / total_active_guards * 100) if total_active_guards > 0 else 0, 1)
        },
        "hours_distribution": {
            "average_hours": round(avg_hours, 1),
            "max_hours": round(max_hours, 1),
            "min_hours": round(min_hours, 1),
            "fairness_score": round(fairness_score, 1),
            "status": "excellent" if fairness_score >= 80 else "good" if fairness_score >= 60 else "needs_improvement"
        },
        "risk_indicators": {
            "guards_at_risk_of_burnout": len(guards_at_risk),
            "guards_at_risk": guards_at_risk[:10],  # Top 10
            "underutilized_guards": len(underutilized_guards),
            "underutilized": underutilized_guards[:10]  # Top 10
        },
        "shift_distribution": {
            "day_shifts": day_shifts,
            "night_shifts": night_shifts,
            "day_percentage": round((day_shifts / (day_shifts + night_shifts) * 100) if (day_shifts + night_shifts) > 0 else 0, 1)
        },
        "attendance": {
            "on_time_percentage": round(on_time_percentage, 1),
            "on_time_count": on_time_arrivals,
            "total_shifts": total_shifts_with_attendance
        }
    }

    # Cache for 5 minutes
    CacheService.set(cache_key, dashboard_data, ttl=300)

    return dashboard_data


# ---------------------------------------------------------------------------
# Guard Dashboard (Mobile App)
# ---------------------------------------------------------------------------

@router.get("/guard")
def get_guard_dashboard(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
) -> Dict:
    """
    Guard-specific dashboard for the mobile app.

    Returns:
    - Today's shift and check-in status
    - Upcoming shifts (next 7 days)
    - Stats for the current month (hours worked, shifts completed)
    """
    # Find the employee record linked to this user
    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()

    if not employee:
        return {
            "employee": None,
            "today_assignment": None,
            "upcoming_shifts": [],
            "monthly_stats": {"shifts_completed": 0, "hours_worked": 0.0},
        }

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=0)
    week_end = now + timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Today's assignment
    today_assignment = (
        db.query(ShiftAssignment)
        .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
        .filter(
            ShiftAssignment.employee_id == employee.employee_id,
            ShiftAssignment.status != AssignmentStatus.CANCELLED,
            Shift.start_time >= today_start,
            Shift.start_time <= today_end,
        )
        .order_by(Shift.start_time)
        .first()
    )

    # Upcoming shifts (next 7 days, excluding today)
    upcoming = (
        db.query(ShiftAssignment)
        .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
        .filter(
            ShiftAssignment.employee_id == employee.employee_id,
            ShiftAssignment.status != AssignmentStatus.CANCELLED,
            Shift.start_time > today_end,
            Shift.start_time <= week_end,
        )
        .order_by(Shift.start_time)
        .limit(10)
        .all()
    )

    # Monthly stats
    monthly_assignments = (
        db.query(ShiftAssignment)
        .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
        .filter(
            ShiftAssignment.employee_id == employee.employee_id,
            ShiftAssignment.checked_out == True,
            Shift.start_time >= month_start,
        )
        .all()
    )

    total_minutes = sum(
        int((a.check_out_time - a.check_in_time).total_seconds() / 60)
        for a in monthly_assignments
        if a.check_in_time and a.check_out_time
    )

    def _format_assignment(a):
        shift = db.query(Shift).filter(Shift.shift_id == a.shift_id).first()
        site = db.query(Site).filter(Site.site_id == shift.site_id).first() if shift else None
        return {
            "assignment_id": a.assignment_id,
            "shift_id": a.shift_id,
            "checked_in": a.checked_in,
            "check_in_time": a.check_in_time.isoformat() if a.check_in_time else None,
            "checked_out": a.checked_out,
            "check_out_time": a.check_out_time.isoformat() if a.check_out_time else None,
            "attendance_status": a.attendance_status,
            "shift": {
                "start_time": shift.start_time.isoformat(),
                "end_time": shift.end_time.isoformat(),
                "notes": shift.notes,
            } if shift else None,
            "site": {
                "site_id": site.site_id,
                "site_name": site.site_name,
                "address": site.address,
                "gps_lat": site.gps_lat,
                "gps_lng": site.gps_lng,
            } if site else None,
        }

    return {
        "employee": {
            "employee_id": employee.employee_id,
            "full_name": f"{employee.first_name} {employee.last_name}",
            "role": employee.role,
            "profile_photo_url": employee.profile_photo_url,
        },
        "today_assignment": _format_assignment(today_assignment) if today_assignment else None,
        "upcoming_shifts": [_format_assignment(a) for a in upcoming],
        "monthly_stats": {
            "shifts_completed": len(monthly_assignments),
            "hours_worked": round(total_minutes / 60, 1),
        },
    }


# ---------------------------------------------------------------------------
# Admin Stats Summary (Mobile App — AdminDashboardScreen)
# ---------------------------------------------------------------------------

@router.get("/stats")
def get_admin_stats(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
) -> Dict:
    """
    Compact stats summary for the mobile admin dashboard.

    Returns key operational metrics: employees, clients, sites, today's shift
    coverage, monthly financials, pending leave requests, expiring certifications.
    """
    from app.models.client import Client
    from app.models.leave import LeaveRequest
    from app.models.certification import Certification
    from app.models.payroll import PayrollSummary
    from app.models.client_invoice import ClientInvoice

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cert_warn_date = (now + timedelta(days=30)).date()

    # Employees
    total_employees = db.query(func.count(Employee.employee_id)).filter(
        Employee.org_id == org_id
    ).scalar() or 0

    active_employees = db.query(func.count(Employee.employee_id)).filter(
        Employee.org_id == org_id,
        Employee.status == 'active',
    ).scalar() or 0

    # Clients & Sites
    total_clients = db.query(func.count(Client.client_id)).filter(
        Client.org_id == org_id
    ).scalar() or 0

    total_sites = db.query(func.count(Site.site_id)).filter(
        Site.org_id == org_id
    ).scalar() or 0

    # Today's shifts
    today_shifts = db.query(Shift).filter(
        Shift.org_id == org_id,
        Shift.start_time >= today_start,
        Shift.start_time <= today_end,
    ).all()

    shifts_today = len(today_shifts)
    shifts_filled = sum(
        1 for s in today_shifts
        if db.query(ShiftAssignment).filter(
            ShiftAssignment.shift_id == s.shift_id,
            ShiftAssignment.status != AssignmentStatus.CANCELLED,
        ).count() > 0
    )
    shifts_unfilled = shifts_today - shifts_filled
    fill_rate = round((shifts_filled / shifts_today * 100) if shifts_today > 0 else 0.0, 1)

    # Monthly payroll costs — join through employees to filter by org
    payroll_rows = (
        db.query(PayrollSummary)
        .join(Employee, PayrollSummary.employee_id == Employee.employee_id)
        .filter(
            Employee.org_id == org_id,
            PayrollSummary.period_start >= month_start.date(),
        )
        .all()
    )
    costs_this_month = sum(float(p.gross_pay or 0) for p in payroll_rows)

    # Revenue = paid invoices this month
    revenue_rows = db.query(func.sum(ClientInvoice.total_amount)).filter(
        ClientInvoice.org_id == org_id,
        ClientInvoice.invoice_date >= month_start.date(),
        ClientInvoice.status == 'paid',
    ).scalar()
    revenue_this_month = float(revenue_rows or 0)

    profit_margin = round(
        ((revenue_this_month - costs_this_month) / revenue_this_month * 100)
        if revenue_this_month > 0 else 0.0,
        1,
    )

    # Pending leave requests (status stored as plain string)
    pending_leave_requests = db.query(func.count(LeaveRequest.request_id)).filter(
        LeaveRequest.org_id == org_id,
        LeaveRequest.status == 'pending',
    ).scalar() or 0

    # Certifications expiring in the next 30 days
    # Certification links to org via Employee — join through employees table
    expiring_certifications = (
        db.query(func.count(Certification.cert_id))
        .join(Employee, Certification.employee_id == Employee.employee_id)
        .filter(
            Employee.org_id == org_id,
            Certification.expiry_date <= cert_warn_date,
            Certification.expiry_date >= now.date(),
        )
        .scalar() or 0
    )

    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "total_clients": total_clients,
        "total_sites": total_sites,
        "shifts_today": shifts_today,
        "shifts_filled": shifts_filled,
        "shifts_unfilled": shifts_unfilled,
        "fill_rate": fill_rate,
        "revenue_this_month": revenue_this_month,
        "costs_this_month": costs_this_month,
        "profit_margin": profit_margin,
        "pending_leave_requests": pending_leave_requests,
        "expiring_certifications": expiring_certifications,
    }
