"""Client satisfaction surveys — track client feedback and satisfaction trends."""

from datetime import datetime
from typing import Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.client_satisfaction import ClientSatisfaction
from app.models.client import Client
from app.models.site import Site
from app.auth.security import get_current_org_id

router = APIRouter()


class SurveyCreate(BaseModel):
    client_id: int
    site_id: Optional[int] = None
    overall_rating: float = Field(ge=1, le=5)
    service_quality: Optional[float] = Field(None, ge=1, le=5)
    response_time: Optional[float] = Field(None, ge=1, le=5)
    professionalism: Optional[float] = Field(None, ge=1, le=5)
    communication: Optional[float] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None
    areas_of_improvement: Optional[str] = None
    survey_period: Optional[str] = None
    surveyed_by: Optional[str] = None
    respondent_name: Optional[str] = None
    respondent_role: Optional[str] = None


class SurveyUpdate(BaseModel):
    overall_rating: Optional[float] = Field(None, ge=1, le=5)
    service_quality: Optional[float] = Field(None, ge=1, le=5)
    response_time: Optional[float] = Field(None, ge=1, le=5)
    professionalism: Optional[float] = Field(None, ge=1, le=5)
    communication: Optional[float] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None
    areas_of_improvement: Optional[str] = None
    survey_period: Optional[str] = None
    respondent_name: Optional[str] = None
    respondent_role: Optional[str] = None


def _build_response(s, client_name=None, site_name=None):
    return {
        "survey_id": s.survey_id,
        "client_id": s.client_id,
        "client_name": client_name,
        "site_id": s.site_id,
        "site_name": site_name,
        "overall_rating": s.overall_rating,
        "service_quality": s.service_quality,
        "response_time": s.response_time,
        "professionalism": s.professionalism,
        "communication": s.communication,
        "feedback": s.feedback,
        "areas_of_improvement": s.areas_of_improvement,
        "survey_period": s.survey_period,
        "surveyed_by": s.surveyed_by,
        "respondent_name": s.respondent_name,
        "respondent_role": s.respondent_role,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.post("/")
def create_survey(
    data: SurveyCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Record a new client satisfaction survey."""
    client = db.query(Client).filter(Client.client_id == data.client_id, Client.org_id == org_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    survey = ClientSatisfaction(org_id=org_id, **data.dict())
    db.add(survey)
    db.commit()
    db.refresh(survey)
    return _build_response(survey, client_name=client.client_name)


@router.get("/")
def list_surveys(
    client_id: Optional[int] = Query(None),
    site_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """List satisfaction surveys with optional filters."""
    q = db.query(ClientSatisfaction).filter(ClientSatisfaction.org_id == org_id)
    if client_id:
        q = q.filter(ClientSatisfaction.client_id == client_id)
    if site_id:
        q = q.filter(ClientSatisfaction.site_id == site_id)

    surveys = q.order_by(ClientSatisfaction.created_at.desc()).offset(skip).limit(limit).all()

    # Lookup names
    client_ids = set(s.client_id for s in surveys)
    site_ids = set(s.site_id for s in surveys if s.site_id)
    clients = {c.client_id: c.client_name for c in db.query(Client).filter(Client.client_id.in_(list(client_ids))).all()} if client_ids else {}
    sites = {s.site_id: s.site_name for s in db.query(Site).filter(Site.site_id.in_(list(site_ids))).all()} if site_ids else {}

    return [_build_response(s, client_name=clients.get(s.client_id), site_name=sites.get(s.site_id)) for s in surveys]


@router.put("/{survey_id}")
def update_survey(
    survey_id: int,
    data: SurveyUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Update a satisfaction survey."""
    survey = db.query(ClientSatisfaction).filter(
        ClientSatisfaction.survey_id == survey_id,
        ClientSatisfaction.org_id == org_id,
    ).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(survey, field, value)
    survey.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(survey)
    return _build_response(survey)


@router.delete("/{survey_id}", status_code=204)
def delete_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Delete a satisfaction survey."""
    survey = db.query(ClientSatisfaction).filter(
        ClientSatisfaction.survey_id == survey_id,
        ClientSatisfaction.org_id == org_id,
    ).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    db.delete(survey)
    db.commit()


@router.get("/dashboard")
def satisfaction_dashboard(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Client satisfaction dashboard — averages, trends, by client."""
    surveys = db.query(ClientSatisfaction).filter(ClientSatisfaction.org_id == org_id).all()
    total = len(surveys)

    if total == 0:
        return {
            "total_surveys": 0,
            "avg_overall": None,
            "avg_service_quality": None,
            "avg_response_time": None,
            "avg_professionalism": None,
            "avg_communication": None,
            "by_client": [],
            "trend": [],
            "low_rated": [],
        }

    def avg(vals):
        filtered = [v for v in vals if v is not None]
        return round(sum(filtered) / len(filtered), 2) if filtered else None

    avg_overall = avg([s.overall_rating for s in surveys])
    avg_sq = avg([s.service_quality for s in surveys])
    avg_rt = avg([s.response_time for s in surveys])
    avg_prof = avg([s.professionalism for s in surveys])
    avg_comm = avg([s.communication for s in surveys])

    # By client
    client_data = defaultdict(list)
    for s in surveys:
        client_data[s.client_id].append(s)

    client_ids = list(client_data.keys())
    clients = {c.client_id: c.client_name for c in db.query(Client).filter(Client.client_id.in_(client_ids)).all()}

    by_client = []
    for cid, recs in sorted(client_data.items(), key=lambda x: avg([r.overall_rating for r in x[1]]) or 0):
        by_client.append({
            "client_id": cid,
            "client_name": clients.get(cid, f"Client #{cid}"),
            "surveys": len(recs),
            "avg_overall": avg([r.overall_rating for r in recs]),
            "avg_service_quality": avg([r.service_quality for r in recs]),
            "latest_rating": recs[-1].overall_rating if recs else None,
        })

    # Trend by period
    period_data = defaultdict(list)
    for s in surveys:
        period = s.survey_period or s.created_at.strftime("%Y-%m") if s.created_at else "unknown"
        period_data[period].append(s.overall_rating)

    trend = []
    for period in sorted(period_data.keys()):
        vals = period_data[period]
        trend.append({
            "period": period,
            "surveys": len(vals),
            "avg_rating": round(sum(vals) / len(vals), 2),
        })

    # Low-rated (below 3.0)
    low_rated = [
        _build_response(s, client_name=clients.get(s.client_id))
        for s in sorted(surveys, key=lambda x: x.overall_rating)
        if s.overall_rating < 3.0
    ][:10]

    return {
        "total_surveys": total,
        "avg_overall": avg_overall,
        "avg_service_quality": avg_sq,
        "avg_response_time": avg_rt,
        "avg_professionalism": avg_prof,
        "avg_communication": avg_comm,
        "by_client": by_client,
        "trend": trend,
        "low_rated": low_rated,
    }
