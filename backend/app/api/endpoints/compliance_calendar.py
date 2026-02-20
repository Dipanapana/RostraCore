"""Compliance calendar endpoints — aggregate upcoming events."""

from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.certification import Certification
from app.models.employee import Employee
from app.models.contract_value import ContractValue
from app.models.training import TrainingRecord, TrainingCourse
from app.models.leave import LeaveRequest
from app.models.client import Client
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/events")
def calendar_events(
    days_ahead: int = Query(90, le=365),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Get all compliance events for the next N days."""
    today = date.today()
    cutoff = today + timedelta(days=days_ahead)
    events = []

    # 1. Certification expiries
    certs = db.query(Certification).join(Employee).filter(
        Employee.org_id == org_id,
        Certification.expiry_date.isnot(None),
        Certification.expiry_date <= cutoff,
        Certification.expiry_date >= today - timedelta(days=30),  # Include recently expired
    ).all()

    for c in certs:
        emp = db.query(Employee).get(c.employee_id)
        emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown"
        is_expired = c.expiry_date < today if c.expiry_date else False
        events.append({
            "type": "cert_expiry",
            "date": c.expiry_date.isoformat() if c.expiry_date else None,
            "title": f"{'EXPIRED' if is_expired else 'Expiring'}: {c.cert_type} — {emp_name}",
            "severity": "critical" if is_expired else ("warning" if c.expiry_date <= today + timedelta(days=30) else "info"),
            "entity_type": "certification",
            "entity_id": c.cert_id,
            "employee_name": emp_name,
        })

    # 2. Contract expirations
    contracts = db.query(ContractValue).filter(
        ContractValue.org_id == org_id,
        ContractValue.is_active == True,
        ContractValue.end_date.isnot(None),
    ).all()

    for cv in contracts:
        end = cv.end_date.date() if hasattr(cv.end_date, 'date') else cv.end_date
        if end and today - timedelta(days=7) <= end <= cutoff:
            client = db.query(Client).get(cv.client_id) if cv.client_id else None
            is_expired = end < today
            events.append({
                "type": "contract_expiry",
                "date": end.isoformat(),
                "title": f"{'EXPIRED' if is_expired else 'Expiring'} contract: {client.client_name if client else 'Unknown'}",
                "severity": "critical" if is_expired else ("warning" if end <= today + timedelta(days=30) else "info"),
                "entity_type": "contract",
                "entity_id": cv.contract_id,
            })

    # 3. Training records due / overdue
    training_records = db.query(TrainingRecord).join(TrainingCourse).join(
        Employee, TrainingRecord.employee_id == Employee.employee_id
    ).filter(
        Employee.org_id == org_id,
        TrainingRecord.status.in_(["scheduled", "in_progress"]),
    ).all()

    for tr in training_records:
        if tr.scheduled_date:
            sched = tr.scheduled_date.date() if hasattr(tr.scheduled_date, 'date') else tr.scheduled_date
            if today - timedelta(days=7) <= sched <= cutoff:
                emp = db.query(Employee).get(tr.employee_id)
                emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown"
                course = db.query(TrainingCourse).get(tr.course_id)
                is_overdue = sched < today
                events.append({
                    "type": "training_due",
                    "date": sched.isoformat(),
                    "title": f"{'OVERDUE' if is_overdue else 'Training'}: {course.title if course else 'Course'} — {emp_name}",
                    "severity": "warning" if is_overdue else "info",
                    "entity_type": "training",
                    "entity_id": tr.record_id,
                    "employee_name": emp_name,
                })

    # 4. Approved leave
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.org_id == org_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= cutoff,
        LeaveRequest.end_date >= today,
    ).all()

    for lv in leaves:
        emp = db.query(Employee).get(lv.employee_id)
        emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown"
        events.append({
            "type": "leave",
            "date": lv.start_date.isoformat(),
            "end_date": lv.end_date.isoformat(),
            "title": f"Leave: {emp_name} ({lv.leave_type})",
            "severity": "info",
            "entity_type": "leave",
            "entity_id": lv.request_id,
            "employee_name": emp_name,
        })

    # Sort by date
    events.sort(key=lambda e: e.get("date", ""))

    return {"events": events, "total": len(events), "period_days": days_ahead}


@router.get("/summary")
def calendar_summary(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Summary counts of upcoming compliance events."""
    today = date.today()
    next_30 = today + timedelta(days=30)
    next_90 = today + timedelta(days=90)

    # Expiring certs (30 days)
    expiring_certs_30 = db.query(Certification).join(Employee).filter(
        Employee.org_id == org_id,
        Certification.expiry_date.isnot(None),
        Certification.expiry_date >= today,
        Certification.expiry_date <= next_30,
    ).count()

    # Expired certs
    expired_certs = db.query(Certification).join(Employee).filter(
        Employee.org_id == org_id,
        Certification.expiry_date.isnot(None),
        Certification.expiry_date < today,
    ).count()

    # Expiring contracts (90 days)
    contracts = db.query(ContractValue).filter(
        ContractValue.org_id == org_id,
        ContractValue.is_active == True,
        ContractValue.end_date.isnot(None),
    ).all()
    expiring_contracts_90 = sum(
        1 for c in contracts
        if c.end_date and today <= (c.end_date.date() if hasattr(c.end_date, 'date') else c.end_date) <= next_90
    )

    # Upcoming leave (30 days)
    upcoming_leave = db.query(LeaveRequest).filter(
        LeaveRequest.org_id == org_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= next_30,
        LeaveRequest.end_date >= today,
    ).count()

    # Scheduled training (30 days)
    scheduled_training = db.query(TrainingRecord).join(
        Employee, TrainingRecord.employee_id == Employee.employee_id
    ).filter(
        Employee.org_id == org_id,
        TrainingRecord.status == "scheduled",
    ).count()

    return {
        "expired_certs": expired_certs,
        "expiring_certs_30d": expiring_certs_30,
        "expiring_contracts_90d": expiring_contracts_90,
        "upcoming_leave_30d": upcoming_leave,
        "scheduled_training": scheduled_training,
    }
