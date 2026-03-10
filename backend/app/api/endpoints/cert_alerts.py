"""Certification expiry alerts endpoints.

Proactive dashboard for expiring and expired certifications across the org.
"""

from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.certification import Certification
from app.models.employee import Employee
from app.auth.security import get_current_org_id

router = APIRouter()


@router.post("/send-expiry-notifications")
def send_expiry_notifications(
    days: int = Query(30, le=90, description="Days ahead to check for expiring certifications"),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Manually trigger in-app notifications for certifications expiring within N days."""
    from app.services.push_service import PushService
    count = PushService(db).notify_psira_expiry_batch(org_id, days_threshold=days)
    return {"notifications_sent": count}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _cert_response(cert: Certification, emp: Employee, today: date) -> dict:
    days_left = (cert.expiry_date - today).days if cert.expiry_date else None
    return {
        "cert_id": cert.cert_id,
        "employee_id": cert.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
        "cert_type": cert.cert_type,
        "cert_number": cert.cert_number,
        "issuing_authority": cert.issuing_authority,
        "psira_grade": cert.psira_grade.value if cert.psira_grade else None,
        "issue_date": str(cert.issue_date) if cert.issue_date else None,
        "expiry_date": str(cert.expiry_date) if cert.expiry_date else None,
        "verified": cert.verified,
        "days_until_expiry": days_left,
        "status": "expired" if days_left is not None and days_left < 0
                  else "critical" if days_left is not None and days_left <= 7
                  else "warning" if days_left is not None and days_left <= 30
                  else "upcoming" if days_left is not None and days_left <= 90
                  else "ok",
    }


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

@router.get("/expiring/")
def expiring_certifications(
    days: int = Query(90, le=365),
    cert_type: Optional[str] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List certifications expiring within N days (or already expired)."""
    today = date.today()
    cutoff = today + timedelta(days=days)

    # Get all employees for the org
    emp_ids = [e.employee_id for e in db.query(Employee.employee_id).filter(Employee.org_id == org_id).all()]
    if not emp_ids:
        return {"items": [], "total": 0}

    q = db.query(Certification).filter(
        Certification.employee_id.in_(emp_ids),
        Certification.expiry_date <= cutoff,
    )
    if cert_type:
        q = q.filter(Certification.cert_type == cert_type)

    certs = q.order_by(Certification.expiry_date.asc()).all()

    results = []
    for cert in certs:
        emp = db.query(Employee).get(cert.employee_id)
        results.append(_cert_response(cert, emp, today))

    return {"items": results, "total": len(results)}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def cert_alert_dashboard(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Certification compliance overview."""
    today = date.today()

    emp_ids = [e.employee_id for e in db.query(Employee.employee_id).filter(Employee.org_id == org_id).all()]
    if not emp_ids:
        return {
            "total_certs": 0, "expired": 0, "critical": 0, "warning": 0,
            "upcoming": 0, "ok": 0, "by_type": [], "top_at_risk": [],
        }

    certs = db.query(Certification).filter(Certification.employee_id.in_(emp_ids)).all()

    total = len(certs)
    expired = 0
    critical = 0
    warning = 0
    upcoming = 0
    ok = 0

    type_map: dict = {}
    emp_risk: dict = {}

    for cert in certs:
        days_left = (cert.expiry_date - today).days if cert.expiry_date else 999

        if days_left < 0:
            expired += 1
            bucket = "expired"
        elif days_left <= 7:
            critical += 1
            bucket = "critical"
        elif days_left <= 30:
            warning += 1
            bucket = "warning"
        elif days_left <= 90:
            upcoming += 1
            bucket = "upcoming"
        else:
            ok += 1
            bucket = "ok"

        # By type
        ct = cert.cert_type or "Unknown"
        if ct not in type_map:
            type_map[ct] = {"type": ct, "total": 0, "expired": 0, "expiring_soon": 0}
        type_map[ct]["total"] += 1
        if bucket == "expired":
            type_map[ct]["expired"] += 1
        elif bucket in ("critical", "warning"):
            type_map[ct]["expiring_soon"] += 1

        # Employee risk score (count of expired + critical certs)
        if bucket in ("expired", "critical", "warning"):
            eid = cert.employee_id
            if eid not in emp_risk:
                emp = db.query(Employee).get(eid)
                emp_risk[eid] = {"employee_id": eid, "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown", "issues": 0}
            emp_risk[eid]["issues"] += 1

    return {
        "total_certs": total,
        "expired": expired,
        "critical": critical,
        "warning": warning,
        "upcoming": upcoming,
        "ok": ok,
        "by_type": sorted(type_map.values(), key=lambda x: x["expired"] + x["expiring_soon"], reverse=True),
        "top_at_risk": sorted(emp_risk.values(), key=lambda x: x["issues"], reverse=True)[:10],
    }
