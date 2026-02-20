"""Operational summary — single-endpoint aggregate of all key operational metrics."""

from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.site import Site
from app.models.client import Client
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment
from app.models.incident import Incident
from app.models.leave import LeaveRequest
from app.models.certification import Certification
from app.models.contract_value import ContractValue
from app.models.client_invoice import ClientInvoice
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/snapshot")
def operational_snapshot(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Full operational snapshot — workforce, sites, financial, compliance at a glance."""
    today = date.today()
    now = datetime.utcnow()
    month_start = datetime.combine(date(today.year, today.month, 1), datetime.min.time())
    day_start = datetime.combine(today, datetime.min.time())
    day_end = datetime.combine(today, datetime.max.time())
    thirty_days_ago = now - timedelta(days=30)

    # ── WORKFORCE ──
    active_employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == "active",
    ).count()

    on_leave_today = db.query(LeaveRequest).filter(
        LeaveRequest.org_id == org_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= today,
        LeaveRequest.end_date >= today,
    ).count()

    # Certs expiring in 30 days
    emp_ids_q = db.query(Employee.employee_id).filter(Employee.org_id == org_id, Employee.status == "active")
    expiring_certs = db.query(Certification).filter(
        Certification.employee_id.in_(emp_ids_q),
        Certification.expiry_date >= today,
        Certification.expiry_date <= today + timedelta(days=30),
    ).count()

    # ── SITES & CLIENTS ──
    total_sites = db.query(Site).filter(Site.org_id == org_id).count()
    total_clients = db.query(Client).filter(Client.org_id == org_id).count()

    # ── SHIFTS TODAY ──
    today_shifts = db.query(Shift).filter(
        Shift.org_id == org_id,
        Shift.start_time >= day_start,
        Shift.start_time <= day_end,
    ).all()

    today_shift_ids = [s.shift_id for s in today_shifts]
    today_assignments = 0
    if today_shift_ids:
        today_assignments = db.query(ShiftAssignment).filter(
            ShiftAssignment.shift_id.in_(today_shift_ids),
            ShiftAssignment.status.in_(["pending", "confirmed", "completed"]),
        ).count()

    # ── THIS MONTH ──
    month_shifts = db.query(Shift).filter(
        Shift.org_id == org_id,
        Shift.start_time >= month_start,
        Shift.start_time <= day_end,
    ).count()

    month_shift_ids = [s[0] for s in db.query(Shift.shift_id).filter(
        Shift.org_id == org_id,
        Shift.start_time >= month_start,
        Shift.start_time <= day_end,
    ).all()]

    month_assignments = 0
    month_hours = 0.0
    if month_shift_ids:
        assignments = db.query(ShiftAssignment).filter(
            ShiftAssignment.shift_id.in_(month_shift_ids),
            ShiftAssignment.status.in_(["pending", "confirmed", "completed"]),
        ).all()
        month_assignments = len(assignments)
        month_hours = sum(float(a.regular_hours or 0) + float(a.overtime_hours or 0) for a in assignments)

    # ── INCIDENTS (30 days) ──
    recent_incidents = db.query(Incident).filter(
        Incident.org_id == org_id,
        Incident.reported_at >= thirty_days_ago,
    ).count()

    open_incidents = db.query(Incident).filter(
        Incident.org_id == org_id,
        text("incidents.status IN ('reported', 'investigating')"),
    ).count()

    # ── FINANCIAL ──
    contracts = db.query(ContractValue).filter(ContractValue.org_id == org_id).all()
    monthly_contract_value = sum(float(c.monthly_value or 0) for c in contracts)

    # Invoices this month
    month_invoiced = 0.0
    month_collected = 0.0
    invoices = db.query(ClientInvoice).filter(
        ClientInvoice.org_id == org_id,
        ClientInvoice.created_at >= month_start,
    ).all()
    for inv in invoices:
        amount = float(inv.total_amount or 0)
        month_invoiced += amount
        status = str(getattr(inv.status, 'value', inv.status)) if inv.status else ""
        if status in ("paid", "PAID"):
            month_collected += amount

    overdue_invoices = db.query(ClientInvoice).filter(
        ClientInvoice.org_id == org_id,
        ClientInvoice.due_date < today,
        ClientInvoice.status.notin_(["paid", "PAID"]),
    ).count()

    # ── ATTENDANCE TODAY ──
    checked_in_today = 0
    if today_shift_ids:
        checked_in_today = db.query(ShiftAssignment).filter(
            ShiftAssignment.shift_id.in_(today_shift_ids),
            ShiftAssignment.checked_in == True,
        ).count()

    return {
        "generated_at": now.isoformat(),
        "date": today.isoformat(),

        "workforce": {
            "active_employees": active_employees,
            "on_leave_today": on_leave_today,
            "available_today": active_employees - on_leave_today,
            "certs_expiring_30d": expiring_certs,
        },

        "operations": {
            "total_sites": total_sites,
            "total_clients": total_clients,
            "today_shifts": len(today_shifts),
            "today_assignments": today_assignments,
            "checked_in_today": checked_in_today,
            "month_shifts": month_shifts,
            "month_assignments": month_assignments,
            "month_hours": round(month_hours, 1),
        },

        "incidents": {
            "last_30_days": recent_incidents,
            "open": open_incidents,
        },

        "financial": {
            "monthly_contract_value": round(monthly_contract_value, 2),
            "annual_contract_value": round(monthly_contract_value * 12, 2),
            "active_contracts": len(contracts),
            "month_invoiced": round(month_invoiced, 2),
            "month_collected": round(month_collected, 2),
            "overdue_invoices": overdue_invoices,
        },
    }
