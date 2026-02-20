"""Contract compliance analytics — staffing, financial, and term compliance."""

from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contract_value import ContractValue
from app.models.client import Client
from app.models.site import Site
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment
from app.models.employee import Employee
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/overview")
def contract_compliance_overview(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Overview of all contracts with compliance status."""
    contracts = db.query(ContractValue).filter(
        ContractValue.org_id == org_id,
    ).all()

    today = date.today()
    now_dt = datetime.utcnow()

    results = []
    total_compliant = 0
    total_at_risk = 0
    total_expired = 0
    total_active = 0

    for c in contracts:
        client = db.query(Client).get(c.client_id) if c.client_id else None
        site = db.query(Site).get(c.site_id) if c.site_id else None

        # Term compliance
        end_dt = c.end_date.date() if isinstance(c.end_date, datetime) else c.end_date if c.end_date else None
        start_dt = c.start_date.date() if isinstance(c.start_date, datetime) else c.start_date if c.start_date else None

        days_remaining = None
        term_status = "unknown"
        if not c.is_active:
            term_status = "inactive"
        elif end_dt:
            days_remaining = (end_dt - today).days
            if days_remaining < 0:
                term_status = "expired"
                total_expired += 1
            elif days_remaining <= 30:
                term_status = "expiring_soon"
                total_at_risk += 1
            else:
                term_status = "active"
                total_active += 1
        else:
            term_status = "active"
            total_active += 1

        # Staffing compliance: check site min_staff vs actual shift assignments this month
        staffing_compliance = None
        required_staff = 0
        actual_staff = 0
        if site:
            required_staff = site.min_staff or 1
            month_start = date(today.year, today.month, 1)
            month_start_dt = datetime.combine(month_start, datetime.min.time())
            month_end_dt = datetime.combine(today, datetime.max.time())

            shifts = db.query(Shift).filter(
                Shift.org_id == org_id,
                Shift.site_id == site.site_id,
                Shift.start_time >= month_start_dt,
                Shift.start_time <= month_end_dt,
            ).all()

            if shifts:
                total_assigned = 0
                total_required = 0
                for shift in shifts:
                    assigned = db.query(ShiftAssignment).filter(
                        ShiftAssignment.shift_id == shift.shift_id,
                        ShiftAssignment.status.in_(["pending", "confirmed", "completed"]),
                    ).count()
                    total_assigned += assigned
                    total_required += required_staff

                actual_staff = total_assigned
                staffing_pct = round(total_assigned / total_required * 100, 1) if total_required > 0 else 100
                staffing_compliance = staffing_pct
            else:
                staffing_compliance = 100  # No shifts scheduled = no violations

        # Wage budget compliance
        wage_compliance = None
        actual_wage_cost = 0
        if c.monthly_wage_budget and c.monthly_wage_budget > 0 and site:
            month_start = date(today.year, today.month, 1)
            month_start_dt = datetime.combine(month_start, datetime.min.time())
            month_end_dt = datetime.combine(today, datetime.max.time())

            shifts = db.query(Shift).filter(
                Shift.org_id == org_id,
                Shift.site_id == site.site_id,
                Shift.start_time >= month_start_dt,
                Shift.start_time <= month_end_dt,
            ).all()

            for shift in shifts:
                duration = (shift.end_time - shift.start_time).total_seconds() / 3600
                assignments = db.query(ShiftAssignment).filter(
                    ShiftAssignment.shift_id == shift.shift_id,
                    ShiftAssignment.status.in_(["pending", "confirmed", "completed"]),
                ).all()
                for a in assignments:
                    emp = db.query(Employee).get(a.employee_id)
                    if emp and emp.hourly_rate:
                        actual_wage_cost += duration * float(emp.hourly_rate)

            wage_compliance = round(actual_wage_cost / c.monthly_wage_budget * 100, 1)

        # Overall compliance score (0-100)
        scores = []
        if term_status in ("active",):
            scores.append(100)
        elif term_status == "expiring_soon":
            scores.append(60)
        elif term_status == "expired":
            scores.append(0)
        else:
            scores.append(50)

        if staffing_compliance is not None:
            scores.append(min(staffing_compliance, 100))

        if wage_compliance is not None:
            # Under budget = good, over budget = bad
            if wage_compliance <= 100:
                scores.append(100)
            else:
                scores.append(max(0, 200 - wage_compliance))  # 150% = score 50, 200% = score 0

        overall_score = round(sum(scores) / len(scores), 1) if scores else 0

        if overall_score >= 80:
            compliance_status = "compliant"
            if term_status not in ("expired", "inactive"):
                total_compliant += 1
        elif overall_score >= 50:
            compliance_status = "at_risk"
        else:
            compliance_status = "non_compliant"

        results.append({
            "contract_value_id": c.contract_value_id,
            "contract_number": c.contract_number,
            "client_name": client.client_name if client else None,
            "site_name": site.site_name if site else None,
            "monthly_value": c.monthly_value or 0,
            "is_active": c.is_active,
            "term_status": term_status,
            "days_remaining": days_remaining,
            "start_date": start_dt.isoformat() if start_dt else None,
            "end_date": end_dt.isoformat() if end_dt else None,
            "staffing_compliance_pct": staffing_compliance,
            "wage_budget": c.monthly_wage_budget,
            "actual_wage_cost": round(actual_wage_cost, 2) if actual_wage_cost else None,
            "wage_compliance_pct": wage_compliance,
            "overall_score": overall_score,
            "compliance_status": compliance_status,
        })

    results.sort(key=lambda r: r["overall_score"])

    return {
        "total_contracts": len(contracts),
        "active": total_active,
        "expiring_soon": total_at_risk,
        "expired": total_expired,
        "compliant": total_compliant,
        "contracts": results,
    }


@router.get("/dashboard")
def contract_compliance_dashboard(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """High-level compliance dashboard metrics."""
    contracts = db.query(ContractValue).filter(
        ContractValue.org_id == org_id,
    ).all()

    today = date.today()
    active = 0
    expiring_30 = 0
    expiring_90 = 0
    expired = 0
    total_monthly_revenue = 0
    with_wage_budget = 0

    for c in contracts:
        end_dt = c.end_date.date() if isinstance(c.end_date, datetime) else c.end_date if c.end_date else None

        if not c.is_active:
            continue

        if c.monthly_value:
            total_monthly_revenue += c.monthly_value

        if c.monthly_wage_budget and c.monthly_wage_budget > 0:
            with_wage_budget += 1

        if end_dt:
            days = (end_dt - today).days
            if days < 0:
                expired += 1
            elif days <= 30:
                expiring_30 += 1
            elif days <= 90:
                expiring_90 += 1
            else:
                active += 1
        else:
            active += 1

    # Sites with staffing issues (min_staff not met today)
    sites = db.query(Site).filter(Site.org_id == org_id).all()
    understaffed_sites = 0
    for site in sites:
        if not site.min_staff or site.min_staff <= 0:
            continue
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        shifts = db.query(Shift).filter(
            Shift.org_id == org_id,
            Shift.site_id == site.site_id,
            Shift.start_time >= today_start,
            Shift.start_time <= today_end,
        ).all()
        for shift in shifts:
            assigned = db.query(ShiftAssignment).filter(
                ShiftAssignment.shift_id == shift.shift_id,
                ShiftAssignment.status.in_(["pending", "confirmed", "completed"]),
            ).count()
            if assigned < site.min_staff:
                understaffed_sites += 1
                break

    return {
        "total_contracts": len([c for c in contracts if c.is_active]),
        "active": active,
        "expiring_within_30_days": expiring_30,
        "expiring_within_90_days": expiring_90,
        "expired": expired,
        "total_monthly_revenue": round(total_monthly_revenue, 2),
        "contracts_with_wage_budget": with_wage_budget,
        "understaffed_sites_today": understaffed_sites,
    }
