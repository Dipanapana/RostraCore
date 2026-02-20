"""SLA compliance tracking endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.sla_compliance import SLARecord
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SLACreate(BaseModel):
    site_id: int
    period_month: int
    period_year: int
    coverage_target: float = 95.0
    coverage_actual: Optional[float] = None
    response_target_mins: int = 30
    response_avg_mins: Optional[int] = None
    resolution_target_hrs: int = 24
    resolution_avg_hrs: Optional[int] = None
    notes: Optional[str] = None


class SLAUpdate(BaseModel):
    coverage_target: Optional[float] = None
    coverage_actual: Optional[float] = None
    response_target_mins: Optional[int] = None
    response_avg_mins: Optional[int] = None
    resolution_target_hrs: Optional[int] = None
    resolution_avg_hrs: Optional[int] = None
    notes: Optional[str] = None


def _calc_status(actual, target, higher_is_better=True) -> str:
    """Determine compliant / at_risk / breached."""
    if actual is None:
        return "compliant"
    if higher_is_better:
        if actual >= target:
            return "compliant"
        elif actual >= target * 0.9:
            return "at_risk"
        else:
            return "breached"
    else:  # lower is better (response time, resolution time)
        if actual <= target:
            return "compliant"
        elif actual <= target * 1.2:
            return "at_risk"
        else:
            return "breached"


def _calc_overall(rec: SLARecord) -> tuple:
    """Calculate overall score and status."""
    scores = []
    statuses = []

    if rec.coverage_actual is not None:
        pct = min(rec.coverage_actual / rec.coverage_target * 100, 100) if rec.coverage_target else 100
        scores.append(pct)
        statuses.append(rec.coverage_status)

    if rec.response_avg_mins is not None:
        pct = min(rec.response_target_mins / rec.response_avg_mins * 100, 100) if rec.response_avg_mins else 100
        scores.append(pct)
        statuses.append(rec.response_status)

    if rec.resolution_avg_hrs is not None:
        pct = min(rec.resolution_target_hrs / rec.resolution_avg_hrs * 100, 100) if rec.resolution_avg_hrs else 100
        scores.append(pct)
        statuses.append(rec.resolution_status)

    overall_score = round(sum(scores) / len(scores), 1) if scores else None

    if "breached" in statuses:
        overall_status = "breached"
    elif "at_risk" in statuses:
        overall_status = "at_risk"
    else:
        overall_status = "compliant"

    return overall_score, overall_status


def _build_response(r: SLARecord, db: Session) -> dict:
    site = db.query(Site).get(r.site_id) if r.site_id else None
    return {
        "record_id": r.record_id,
        "site_id": r.site_id,
        "site_name": site.site_name if site else None,
        "period_month": r.period_month,
        "period_year": r.period_year,
        "coverage_target": r.coverage_target,
        "coverage_actual": r.coverage_actual,
        "coverage_status": r.coverage_status,
        "response_target_mins": r.response_target_mins,
        "response_avg_mins": r.response_avg_mins,
        "response_status": r.response_status,
        "resolution_target_hrs": r.resolution_target_hrs,
        "resolution_avg_hrs": r.resolution_avg_hrs,
        "resolution_status": r.resolution_status,
        "overall_score": r.overall_score,
        "overall_status": r.overall_status,
        "notes": r.notes,
        "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_sla_records(
    site_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    q = db.query(SLARecord).filter(SLARecord.org_id == org_id)
    if site_id:
        q = q.filter(SLARecord.site_id == site_id)
    if status_filter:
        q = q.filter(SLARecord.overall_status == status_filter)
    if year:
        q = q.filter(SLARecord.period_year == year)
    if month:
        q = q.filter(SLARecord.period_month == month)
    q = q.order_by(SLARecord.period_year.desc(), SLARecord.period_month.desc())
    rows = q.all()
    return {"items": [_build_response(r, db) for r in rows], "total": len(rows)}


@router.post("/", status_code=201)
def create_sla_record(
    body: SLACreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
):
    if body.period_month < 1 or body.period_month > 12:
        raise HTTPException(400, "period_month must be 1-12")

    rec = SLARecord(
        org_id=org_id,
        site_id=body.site_id,
        period_month=body.period_month,
        period_year=body.period_year,
        coverage_target=body.coverage_target,
        coverage_actual=body.coverage_actual,
        response_target_mins=body.response_target_mins,
        response_avg_mins=body.response_avg_mins,
        resolution_target_hrs=body.resolution_target_hrs,
        resolution_avg_hrs=body.resolution_avg_hrs,
        notes=body.notes,
    )

    # Calculate statuses
    rec.coverage_status = _calc_status(rec.coverage_actual, rec.coverage_target, higher_is_better=True)
    rec.response_status = _calc_status(rec.response_avg_mins, rec.response_target_mins, higher_is_better=False)
    rec.resolution_status = _calc_status(rec.resolution_avg_hrs, rec.resolution_target_hrs, higher_is_better=False)
    rec.overall_score, rec.overall_status = _calc_overall(rec)

    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.put("/{record_id}/")
def update_sla_record(
    record_id: int,
    body: SLAUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(SLARecord).filter(SLARecord.record_id == record_id, SLARecord.org_id == org_id).first()
    if not rec:
        raise HTTPException(404, "SLA record not found")

    for field, val in body.dict(exclude_unset=True).items():
        setattr(rec, field, val)
    rec.updated_at = datetime.utcnow()

    # Recalculate statuses
    rec.coverage_status = _calc_status(rec.coverage_actual, rec.coverage_target, higher_is_better=True)
    rec.response_status = _calc_status(rec.response_avg_mins, rec.response_target_mins, higher_is_better=False)
    rec.resolution_status = _calc_status(rec.resolution_avg_hrs, rec.resolution_target_hrs, higher_is_better=False)
    rec.overall_score, rec.overall_status = _calc_overall(rec)

    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.delete("/{record_id}/")
def delete_sla_record(
    record_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(SLARecord).filter(SLARecord.record_id == record_id, SLARecord.org_id == org_id).first()
    if not rec:
        raise HTTPException(404, "SLA record not found")
    db.delete(rec)
    db.commit()
    return {"detail": "deleted"}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard")
def sla_dashboard(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    now = datetime.utcnow()
    target_year = year or now.year

    records = db.query(SLARecord).filter(
        SLARecord.org_id == org_id,
        SLARecord.period_year == target_year,
    ).all()

    total = len(records)
    compliant = sum(1 for r in records if r.overall_status == "compliant")
    at_risk = sum(1 for r in records if r.overall_status == "at_risk")
    breached = sum(1 for r in records if r.overall_status == "breached")

    avg_score = round(
        sum(r.overall_score for r in records if r.overall_score is not None)
        / max(sum(1 for r in records if r.overall_score is not None), 1),
        1
    ) if records else None

    # Average coverage
    coverage_vals = [r.coverage_actual for r in records if r.coverage_actual is not None]
    avg_coverage = round(sum(coverage_vals) / len(coverage_vals), 1) if coverage_vals else None

    # By site — latest record per site
    site_map = {}
    for r in sorted(records, key=lambda x: (x.period_year, x.period_month)):
        site_map[r.site_id] = r
    by_site = []
    for sid, r in site_map.items():
        site = db.query(Site).get(sid) if sid else None
        by_site.append({
            "site_id": sid,
            "site_name": site.site_name if site else "Unknown",
            "latest_month": r.period_month,
            "overall_score": r.overall_score,
            "overall_status": r.overall_status,
            "coverage_actual": r.coverage_actual,
        })

    # Monthly trend
    monthly = {}
    for r in records:
        key = r.period_month
        if key not in monthly:
            monthly[key] = {"month": key, "scores": [], "statuses": []}
        if r.overall_score is not None:
            monthly[key]["scores"].append(r.overall_score)
        monthly[key]["statuses"].append(r.overall_status)

    monthly_trend = []
    for m in sorted(monthly.keys()):
        d = monthly[m]
        avg_s = round(sum(d["scores"]) / len(d["scores"]), 1) if d["scores"] else None
        monthly_trend.append({"month": m, "avg_score": avg_s, "record_count": len(d["statuses"])})

    return {
        "year": target_year,
        "total_records": total,
        "compliant": compliant,
        "at_risk": at_risk,
        "breached": breached,
        "avg_score": avg_score,
        "avg_coverage": avg_coverage,
        "by_site": by_site,
        "monthly_trend": monthly_trend,
    }
