"""Incident Report endpoints for PSIRA-compliant incident reporting."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.incident_report import (
    IncidentReport,
    IncidentType,
    IncidentSeverity,
    IncidentCategory,
    IncidentStatus
)
from app.models.employee import Employee
from app.models.site import Site

router = APIRouter()


# Pydantic schemas
class IncidentReportBase(BaseModel):
    incident_date: datetime
    incident_type: IncidentType
    severity: IncidentSeverity
    incident_category: Optional[IncidentCategory] = None
    location_details: Optional[str] = None
    exact_location: Optional[str] = None
    description: str
    action_taken: Optional[str] = None
    outcome: Optional[str] = None
    suspect_details: Optional[str] = None
    victim_details: Optional[str] = None
    witness_details: Optional[str] = None
    police_notified: bool = False
    police_case_number: Optional[str] = None
    police_station: Optional[str] = None
    client_notified: bool = False
    injuries_reported: bool = False
    medical_attention_required: bool = False
    ambulance_called: bool = False
    property_damage: bool = False
    property_damage_description: Optional[str] = None
    estimated_loss_value: Optional[float] = None
    evidence_collected: bool = False
    evidence_description: Optional[str] = None
    follow_up_required: bool = False
    follow_up_notes: Optional[str] = None


class IncidentReportCreate(IncidentReportBase):
    employee_id: int
    site_id: int


class IncidentReportUpdate(BaseModel):
    description: Optional[str] = None
    action_taken: Optional[str] = None
    outcome: Optional[str] = None
    status: Optional[IncidentStatus] = None


class SupervisorReview(BaseModel):
    supervisor_comments: str
    status: Optional[IncidentStatus] = None


class IncidentReportResponse(IncidentReportBase):
    incident_id: int
    employee_id: int
    employee_name: Optional[str] = None
    site_id: int
    site_name: Optional[str] = None
    supervisor_id: Optional[int] = None
    supervisor_name: Optional[str] = None
    reported_date: datetime
    supervisor_reviewed: bool
    supervisor_comments: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Endpoints
@router.get("/", response_model=List[IncidentReportResponse])
async def list_incident_reports(
    site_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    incident_type: Optional[IncidentType] = None,
    severity: Optional[IncidentSeverity] = None,
    status: Optional[IncidentStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    supervisor_reviewed: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List incident reports with filtering."""
    query = db.query(IncidentReport)

    if site_id:
        query = query.filter(IncidentReport.site_id == site_id)

    if employee_id:
        query = query.filter(IncidentReport.employee_id == employee_id)

    if incident_type:
        query = query.filter(IncidentReport.incident_type == incident_type)

    if severity:
        query = query.filter(IncidentReport.severity == severity)

    if status:
        query = query.filter(IncidentReport.status == status)

    if start_date:
        query = query.filter(IncidentReport.incident_date >= start_date)

    if end_date:
        query = query.filter(IncidentReport.incident_date <= end_date)

    if supervisor_reviewed is not None:
        query = query.filter(IncidentReport.supervisor_reviewed == supervisor_reviewed)

    incidents = query.order_by(desc(IncidentReport.incident_date)).offset(offset).limit(limit).all()

    # Build response with names
    result = []
    for incident in incidents:
        employee = db.query(Employee).filter(Employee.employee_id == incident.employee_id).first()
        site = db.query(Site).filter(Site.site_id == incident.site_id).first()
        supervisor = None
        if incident.supervisor_id:
            supervisor = db.query(Employee).filter(Employee.employee_id == incident.supervisor_id).first()

        result.append({
            **incident.__dict__,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
            "site_name": site.site_name or site.client_name if site else None,
            "supervisor_name": f"{supervisor.first_name} {supervisor.last_name}" if supervisor else None,
        })

    return result


@router.post("/", response_model=IncidentReportResponse, status_code=status.HTTP_201_CREATED)
async def create_incident_report(report_data: IncidentReportCreate, db: Session = Depends(get_db)):
    """Create a new incident report (employee submits)."""
    # Validate employee and site
    employee = db.query(Employee).filter(Employee.employee_id == report_data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    site = db.query(Site).filter(Site.site_id == report_data.site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    # Create incident report
    incident = IncidentReport(
        **report_data.model_dump(),
        supervisor_id=site.supervisor_id if site else None,
        reported_date=datetime.utcnow(),
        status=IncidentStatus.OPEN
    )

    if report_data.client_notified:
        incident.client_notified_at = datetime.utcnow()

    db.add(incident)
    db.commit()
    db.refresh(incident)

    return {
        **incident.__dict__,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "site_name": site.site_name or site.client_name,
        "supervisor_name": None,
    }


@router.get("/{incident_id}", response_model=IncidentReportResponse)
async def get_incident_report(incident_id: int, db: Session = Depends(get_db)):
    """Get specific incident report."""
    incident = db.query(IncidentReport).filter(IncidentReport.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident report not found")

    employee = db.query(Employee).filter(Employee.employee_id == incident.employee_id).first()
    site = db.query(Site).filter(Site.site_id == incident.site_id).first()
    supervisor = None
    if incident.supervisor_id:
        supervisor = db.query(Employee).filter(Employee.employee_id == incident.supervisor_id).first()

    return {
        **incident.__dict__,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
        "site_name": site.site_name or site.client_name if site else None,
        "supervisor_name": f"{supervisor.first_name} {supervisor.last_name}" if supervisor else None,
    }


@router.put("/{incident_id}", response_model=IncidentReportResponse)
async def update_incident_report(
    incident_id: int,
    report_data: IncidentReportUpdate,
    db: Session = Depends(get_db)
):
    """Update incident report."""
    incident = db.query(IncidentReport).filter(IncidentReport.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident report not found")

    for field, value in report_data.model_dump(exclude_unset=True).items():
        setattr(incident, field, value)

    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)

    employee = db.query(Employee).filter(Employee.employee_id == incident.employee_id).first()
    site = db.query(Site).filter(Site.site_id == incident.site_id).first()

    return {
        **incident.__dict__,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
        "site_name": site.site_name or site.client_name if site else None,
    }


@router.put("/{incident_id}/review")
async def supervisor_review_incident(
    incident_id: int,
    review_data: SupervisorReview,
    supervisor_id: int,
    db: Session = Depends(get_db)
):
    """Supervisor reviews and approves incident report."""
    incident = db.query(IncidentReport).filter(IncidentReport.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident report not found")

    incident.supervisor_id = supervisor_id
    incident.supervisor_reviewed = True
    incident.supervisor_comments = review_data.supervisor_comments
    incident.reviewed_at = datetime.utcnow()

    if review_data.status:
        incident.status = review_data.status

    incident.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Incident report reviewed successfully"}


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident_report(incident_id: int, db: Session = Depends(get_db)):
    """Delete incident report."""
    incident = db.query(IncidentReport).filter(IncidentReport.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident report not found")

    db.delete(incident)
    db.commit()

    return None
