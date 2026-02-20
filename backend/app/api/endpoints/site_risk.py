"""Site risk assessment — risk scoring based on incidents, staffing, and compliance."""

from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.site import Site
from app.models.incident import Incident
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment
from app.models.sla_compliance import SLARecord
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/scores")
def site_risk_scores(
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Risk score for each site (0=safe, 100=critical risk)."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    today = date.today()

    sites = db.query(Site).filter(Site.org_id == org_id).all()

    results = []
    for site in sites:
        risk_score = 0
        factors = []

        # Factor 1: Incident count and severity (0-40 points)
        incidents = db.query(Incident).filter(
            Incident.org_id == org_id,
            Incident.site_id == site.site_id,
            Incident.reported_at >= cutoff,
        ).all()

        incident_score = 0
        for inc in incidents:
            sev = str(getattr(inc.severity, 'value', inc.severity)) if inc.severity else "LOW"
            if sev == "CRITICAL":
                incident_score += 10
            elif sev == "HIGH":
                incident_score += 5
            elif sev == "MEDIUM":
                incident_score += 2
            else:
                incident_score += 1
        incident_score = min(incident_score, 40)
        risk_score += incident_score
        if incident_score > 0:
            factors.append(f"{len(incidents)} incidents ({incident_score}pts)")

        # Factor 2: Understaffing this month (0-30 points)
        month_start_dt = datetime.combine(date(today.year, today.month, 1), datetime.min.time())
        today_dt = datetime.combine(today, datetime.max.time())

        shifts = db.query(Shift).filter(
            Shift.org_id == org_id,
            Shift.site_id == site.site_id,
            Shift.start_time >= month_start_dt,
            Shift.start_time <= today_dt,
        ).all()

        understaffed_shifts = 0
        total_shifts = len(shifts)
        min_staff = site.min_staff or 1
        for shift in shifts:
            assigned = db.query(ShiftAssignment).filter(
                ShiftAssignment.shift_id == shift.shift_id,
                ShiftAssignment.status.in_(["pending", "confirmed", "completed"]),
            ).count()
            if assigned < min_staff:
                understaffed_shifts += 1

        if total_shifts > 0:
            understaffing_ratio = understaffed_shifts / total_shifts
            staffing_score = round(understaffing_ratio * 30)
        else:
            staffing_score = 0
        risk_score += staffing_score
        if staffing_score > 0:
            factors.append(f"{understaffed_shifts}/{total_shifts} shifts understaffed ({staffing_score}pts)")

        # Factor 3: SLA compliance (0-20 points)
        sla_records = db.query(SLARecord).filter(
            SLARecord.org_id == org_id,
            SLARecord.site_id == site.site_id,
        ).order_by(SLARecord.period_year.desc(), SLARecord.period_month.desc()).limit(3).all()

        sla_score = 0
        if sla_records:
            for sla in sla_records:
                status = str(getattr(sla.overall_status, 'value', sla.overall_status)) if sla.overall_status else ""
                if status == "breached":
                    sla_score += 10
                elif status == "at_risk":
                    sla_score += 5
            sla_score = min(sla_score, 20)
            if sla_score > 0:
                factors.append(f"SLA issues ({sla_score}pts)")

        risk_score += sla_score

        # Factor 4: No recent patrols or inspections (0-10 points)
        # Simple: if no shifts at all this month, add 10
        if total_shifts == 0:
            risk_score += 10
            factors.append("No shifts this month (10pts)")

        risk_score = min(risk_score, 100)

        # Risk level
        if risk_score >= 70:
            risk_level = "critical"
        elif risk_score >= 40:
            risk_level = "high"
        elif risk_score >= 20:
            risk_level = "medium"
        else:
            risk_level = "low"

        results.append({
            "site_id": site.site_id,
            "site_name": site.site_name,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "incident_count": len(incidents),
            "understaffed_shifts": understaffed_shifts,
            "total_shifts": total_shifts,
            "factors": factors,
        })

    results.sort(key=lambda r: r["risk_score"], reverse=True)

    # Summary
    by_level = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for r in results:
        by_level[r["risk_level"]] += 1

    return {
        "period_days": days,
        "total_sites": len(results),
        "by_risk_level": by_level,
        "avg_risk_score": round(sum(r["risk_score"] for r in results) / len(results), 1) if results else 0,
        "sites": results,
    }
