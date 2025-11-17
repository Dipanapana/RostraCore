"""
Dashboard API Endpoints
Provides specialized dashboard views for different user personas
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.database import get_db
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.site import Site
from app.models.payroll import PayrollSummary
from app.models.organization import Organization
from app.models.availability import Availability
from app.services.cache_service import CacheService

router = APIRouter(prefix="/api/v1/dashboards")


@router.get("/executive")
async def get_executive_dashboard(
    org_id: Optional[int] = None,
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

    # Base query filter
    org_filter = [Organization.org_id == org_id] if org_id else []

    # 1. Total Guards
    total_guards = db.query(func.count(Employee.employee_id)).filter(
        Employee.status == 'active',
        *([Employee.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # 2. Active Sites
    active_sites = db.query(func.count(Site.site_id)).filter(
        Site.is_active == True,
        *([Site.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # 3. Revenue This Month (from payroll)
    revenue_this_month = db.query(func.sum(PayrollSummary.total_pay)).filter(
        PayrollSummary.pay_period_start >= month_start,
        *([PayrollSummary.org_id == org_id] if org_id else [])
    ).scalar() or Decimal('0.00')

    # 4. Revenue Last Month
    revenue_last_month = db.query(func.sum(PayrollSummary.total_pay)).filter(
        PayrollSummary.pay_period_start >= last_month_start,
        PayrollSummary.pay_period_start < month_start,
        *([PayrollSummary.org_id == org_id] if org_id else [])
    ).scalar() or Decimal('0.00')

    # Calculate revenue growth
    revenue_growth = 0.0
    if revenue_last_month and float(revenue_last_month) > 0:
        revenue_growth = ((float(revenue_this_month) - float(revenue_last_month)) / float(revenue_last_month)) * 100

    # 5. Shifts This Month
    shifts_query = db.query(Shift).filter(
        Shift.start_time >= month_start,
        *([Shift.org_id == org_id] if org_id else [])
    )

    total_shifts = shifts_query.count()
    filled_shifts = shifts_query.filter(Shift.assigned_employee_id.isnot(None)).count()

    fill_rate = (filled_shifts / total_shifts * 100) if total_shifts > 0 else 0.0

    # 6. Average Cost Per Shift
    avg_shift_cost = db.query(func.avg(Shift.cost)).filter(
        Shift.start_time >= month_start,
        Shift.assigned_employee_id.isnot(None),
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or Decimal('0.00')

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

    # 10. Shifts Trend (last 7 days)
    shifts_trend = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        day_shifts = db.query(func.count(Shift.shift_id)).filter(
            Shift.start_time >= day_start,
            Shift.start_time < day_end,
            Shift.assigned_employee_id.isnot(None),
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
    org_id: Optional[int] = None,
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

    # 1. Unfilled Shifts (Next 7 Days)
    unfilled_shifts = db.query(Shift).filter(
        Shift.start_time >= now,
        Shift.start_time < week_end,
        Shift.assigned_employee_id.is_(None),
        *([Shift.org_id == org_id] if org_id else [])
    ).order_by(Shift.start_time).limit(50).all()

    unfilled_shifts_data = [
        {
            "shift_id": shift.shift_id,
            "site_id": shift.site_id,
            "site_name": shift.site.name if shift.site else "Unknown",
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

    expiring_certs_data = [
        {
            "cert_id": cert.cert_id,
            "employee_id": cert.employee_id,
            "employee_name": f"{cert.employee.first_name} {cert.employee.last_name}" if cert.employee else "Unknown",
            "cert_type": cert.cert_type,
            "expiry_date": cert.expiry_date.isoformat() if cert.expiry_date else None,
            "days_until_expiry": (cert.expiry_date - now).days if cert.expiry_date else None,
            "urgency": "critical" if cert.expiry_date and (cert.expiry_date - now).days <= 7 else "high" if cert.expiry_date and (cert.expiry_date - now).days <= 14 else "medium"
        }
        for cert in expiring_certs
    ]

    # 3. Attendance Issues (Last 7 Days)
    seven_days_ago = today_start - timedelta(days=7)

    no_shows = db.query(Attendance).filter(
        Attendance.shift_start_time >= seven_days_ago,
        Attendance.clock_in_time.is_(None),
        *([Attendance.org_id == org_id] if org_id else [])
    ).count()

    late_arrivals = db.query(Attendance).filter(
        Attendance.shift_start_time >= seven_days_ago,
        Attendance.clock_in_time > Attendance.shift_start_time + timedelta(minutes=15),
        *([Attendance.org_id == org_id] if org_id else [])
    ).count()

    # 4. Guards Available Today
    available_today = db.query(Availability).join(Employee).filter(
        Availability.date == today_start.date(),
        Availability.is_available == True,
        Employee.status == 'active',
        *([Employee.org_id == org_id] if org_id else [])
    ).count()

    # 5. Site Coverage (Today)
    sites_needing_coverage = db.query(Site).filter(
        Site.is_active == True,
        *([Site.org_id == org_id] if org_id else [])
    ).count()

    shifts_today = db.query(Shift).filter(
        Shift.start_time >= today_start,
        Shift.start_time < today_start + timedelta(days=1),
        *([Shift.org_id == org_id] if org_id else [])
    )

    filled_today = shifts_today.filter(Shift.assigned_employee_id.isnot(None)).count()
    total_today = shifts_today.count()
    coverage_rate_today = (filled_today / total_today * 100) if total_today > 0 else 100.0

    # 6. Quick Stats
    total_guards = db.query(func.count(Employee.employee_id)).filter(
        Employee.status == 'active',
        *([Employee.org_id == org_id] if org_id else [])
    ).scalar() or 0

    on_shift_now = db.query(func.count(Shift.shift_id)).filter(
        Shift.start_time <= now,
        Shift.end_time >= now,
        Shift.assigned_employee_id.isnot(None),
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
    org_id: Optional[int] = None,
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

    # 1. Monthly PayrollSummary Costs
    payroll_this_month = db.query(
        func.sum(PayrollSummary.regular_pay).label('regular'),
        func.sum(PayrollSummary.overtime_pay).label('overtime'),
        func.sum(PayrollSummary.total_pay).label('total')
    ).filter(
        PayrollSummary.pay_period_start >= month_start,
        *([PayrollSummary.org_id == org_id] if org_id else [])
    ).first()

    regular_pay = float(payroll_this_month.regular or 0)
    overtime_pay = float(payroll_this_month.overtime or 0)
    total_payroll = float(payroll_this_month.total or 0)

    # 2. Last Month for Comparison
    payroll_last_month = db.query(func.sum(PayrollSummary.total_pay)).filter(
        PayrollSummary.pay_period_start >= last_month_start,
        PayrollSummary.pay_period_start < month_start,
        *([PayrollSummary.org_id == org_id] if org_id else [])
    ).scalar() or Decimal('0.00')

    payroll_change = ((total_payroll - float(payroll_last_month)) / float(payroll_last_month) * 100) if float(payroll_last_month) > 0 else 0.0

    # 3. Cost Per Site (This Month)
    cost_per_site = db.query(
        Site.site_id,
        Site.name,
        func.sum(Shift.cost).label('total_cost'),
        func.count(Shift.shift_id).label('shift_count')
    ).join(Shift, Shift.site_id == Site.site_id).filter(
        Shift.start_time >= month_start,
        Shift.assigned_employee_id.isnot(None),
        *([Site.org_id == org_id] if org_id else [])
    ).group_by(Site.site_id, Site.name).order_by(func.sum(Shift.cost).desc()).limit(10).all()

    cost_per_site_data = [
        {
            "site_id": row.site_id,
            "site_name": row.name,
            "total_cost": float(row.total_cost or 0),
            "shift_count": row.shift_count,
            "avg_cost_per_shift": float(row.total_cost or 0) / row.shift_count if row.shift_count > 0 else 0
        }
        for row in cost_per_site
    ]

    # 4. Overtime Analysis
    overtime_percentage = (overtime_pay / total_payroll * 100) if total_payroll > 0 else 0.0

    # 5. Projected Monthly Cost (based on current burn rate)
    days_elapsed = (now - month_start).days + 1
    days_in_month = 30  # Approximate
    projected_monthly_cost = (total_payroll / days_elapsed) * days_in_month if days_elapsed > 0 else 0

    # 6. Cost Trend (Last 6 Months)
    cost_trend = []
    for i in range(5, -1, -1):
        month_date = (month_start - timedelta(days=i * 30)).replace(day=1)
        next_month = (month_date + timedelta(days=32)).replace(day=1)

        month_cost = db.query(func.sum(PayrollSummary.total_pay)).filter(
            PayrollSummary.pay_period_start >= month_date,
            PayrollSummary.pay_period_start < next_month,
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

    # 8. Cost Breakdown by Employee Type
    # Simplified: Count shifts by cost tiers
    low_cost_shifts = db.query(func.count(Shift.shift_id)).filter(
        Shift.start_time >= month_start,
        Shift.cost < 500,
        Shift.assigned_employee_id.isnot(None),
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    medium_cost_shifts = db.query(func.count(Shift.shift_id)).filter(
        Shift.start_time >= month_start,
        Shift.cost >= 500,
        Shift.cost < 1000,
        Shift.assigned_employee_id.isnot(None),
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    high_cost_shifts = db.query(func.count(Shift.shift_id)).filter(
        Shift.start_time >= month_start,
        Shift.cost >= 1000,
        Shift.assigned_employee_id.isnot(None),
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
    org_id: Optional[int] = None,
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

    # 1. Hours Worked by Guard (This Month)
    hours_by_guard = db.query(
        Employee.employee_id,
        Employee.first_name,
        Employee.last_name,
        func.count(Shift.shift_id).label('shift_count'),
        func.sum(
            func.extract('epoch', Shift.end_time - Shift.start_time) / 3600
        ).label('total_hours')
    ).join(Shift, Shift.assigned_employee_id == Employee.employee_id).filter(
        Shift.start_time >= month_start,
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

    # 4. Shift Distribution (Day vs Night)
    from sqlalchemy import extract

    day_shifts = db.query(func.count(Shift.shift_id)).filter(
        Shift.start_time >= month_start,
        Shift.assigned_employee_id.isnot(None),
        extract('hour', Shift.start_time) >= 6,
        extract('hour', Shift.start_time) < 18,
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    night_shifts = db.query(func.count(Shift.shift_id)).filter(
        Shift.start_time >= month_start,
        Shift.assigned_employee_id.isnot(None),
        or_(
            extract('hour', Shift.start_time) < 6,
            extract('hour', Shift.start_time) >= 18
        ),
        *([Shift.org_id == org_id] if org_id else [])
    ).scalar() or 0

    # 5. Attendance Performance
    total_shifts_with_attendance = db.query(func.count(Attendance.attendance_id)).filter(
        Attendance.shift_start_time >= month_start,
        *([Attendance.org_id == org_id] if org_id else [])
    ).scalar() or 1

    on_time_arrivals = db.query(func.count(Attendance.attendance_id)).filter(
        Attendance.shift_start_time >= month_start,
        Attendance.clock_in_time <= Attendance.shift_start_time + timedelta(minutes=5),
        *([Attendance.org_id == org_id] if org_id else [])
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
