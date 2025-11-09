"""Daily Occurrence Book (OB) endpoints for shift reporting."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from datetime import datetime, date

from app.database import get_db
from app.models.daily_occurrence_book import DailyOccurrenceBook
from app.models.employee import Employee
from app.models.site import Site

router = APIRouter()


# Pydantic schemas
class VisitorEntry(BaseModel):
    name: str
    company: Optional[str] = None
    time_in: str
    time_out: Optional[str] = None
    purpose: Optional[str] = None


class DailyReportBase(BaseModel):
    shift_start: datetime
    shift_end: Optional[datetime] = None
    weather_conditions: Optional[str] = None
    site_conditions: Optional[str] = None
    patrol_rounds_completed: Optional[int] = None
    patrol_notes: Optional[str] = None
    visitors_logged: int = 0
    visitor_details: Optional[List[dict]] = None
    equipment_checked: bool = False
    equipment_status: Optional[str] = None
    equipment_issues: Optional[str] = None
    incidents_reported: int = 0
    incident_summary: Optional[str] = None
    observations: Optional[str] = None
    unusual_activities: Optional[str] = None
    handover_notes: Optional[str] = None
    relieving_officer_name: Optional[str] = None
    handover_completed: bool = False
    keys_handed_over: bool = False
    keys_description: Optional[str] = None


class DailyReportCreate(DailyReportBase):
    employee_id: int
    site_id: int
    shift_id: Optional[int] = None
    ob_date: date


class DailyReportUpdate(BaseModel):
    shift_end: Optional[datetime] = None
    patrol_rounds_completed: Optional[int] = None
    patrol_notes: Optional[str] = None
    equipment_status: Optional[str] = None
    observations: Optional[str] = None
    handover_notes: Optional[str] = None


class SupervisorReviewOB(BaseModel):
    supervisor_comments: str


class DailyReportResponse(DailyReportBase):
    ob_id: int
    employee_id: int
    employee_name: Optional[str] = None
    site_id: int
    site_name: Optional[str] = None
    shift_id: Optional[int] = None
    ob_date: date
    supervisor_id: Optional[int] = None
    supervisor_name: Optional[str] = None
    supervisor_reviewed: bool
    supervisor_comments: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Endpoints
@router.get("/", response_model=List[DailyReportResponse])
async def list_daily_reports(
    site_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    supervisor_reviewed: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List daily occurrence books with filtering."""
    query = db.query(DailyOccurrenceBook)

    if site_id:
        query = query.filter(DailyOccurrenceBook.site_id == site_id)

    if employee_id:
        query = query.filter(DailyOccurrenceBook.employee_id == employee_id)

    if start_date:
        query = query.filter(DailyOccurrenceBook.ob_date >= start_date)

    if end_date:
        query = query.filter(DailyOccurrenceBook.ob_date <= end_date)

    if supervisor_reviewed is not None:
        query = query.filter(DailyOccurrenceBook.supervisor_reviewed == supervisor_reviewed)

    reports = query.order_by(desc(DailyOccurrenceBook.ob_date)).offset(offset).limit(limit).all()

    # Build response with names
    result = []
    for report in reports:
        employee = db.query(Employee).filter(Employee.employee_id == report.employee_id).first()
        site = db.query(Site).filter(Site.site_id == report.site_id).first()
        supervisor = None
        if report.supervisor_id:
            supervisor = db.query(Employee).filter(Employee.employee_id == report.supervisor_id).first()

        result.append({
            **report.__dict__,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
            "site_name": site.site_name or site.client_name if site else None,
            "supervisor_name": f"{supervisor.first_name} {supervisor.last_name}" if supervisor else None,
        })

    return result


@router.post("/", response_model=DailyReportResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_report(report_data: DailyReportCreate, db: Session = Depends(get_db)):
    """Create a new daily occurrence book entry (employee submits)."""
    # Validate employee and site
    employee = db.query(Employee).filter(Employee.employee_id == report_data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    site = db.query(Site).filter(Site.site_id == report_data.site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    # Create daily report
    daily_report = DailyOccurrenceBook(
        **report_data.model_dump(),
        supervisor_id=site.supervisor_id if site else None
    )

    db.add(daily_report)
    db.commit()
    db.refresh(daily_report)

    return {
        **daily_report.__dict__,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "site_name": site.site_name or site.client_name,
        "supervisor_name": None,
    }


@router.get("/{ob_id}", response_model=DailyReportResponse)
async def get_daily_report(ob_id: int, db: Session = Depends(get_db)):
    """Get specific daily occurrence book entry."""
    report = db.query(DailyOccurrenceBook).filter(DailyOccurrenceBook.ob_id == ob_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Daily report not found")

    employee = db.query(Employee).filter(Employee.employee_id == report.employee_id).first()
    site = db.query(Site).filter(Site.site_id == report.site_id).first()
    supervisor = None
    if report.supervisor_id:
        supervisor = db.query(Employee).filter(Employee.employee_id == report.supervisor_id).first()

    return {
        **report.__dict__,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
        "site_name": site.site_name or site.client_name if site else None,
        "supervisor_name": f"{supervisor.first_name} {supervisor.last_name}" if supervisor else None,
    }


@router.put("/{ob_id}", response_model=DailyReportResponse)
async def update_daily_report(
    ob_id: int,
    report_data: DailyReportUpdate,
    db: Session = Depends(get_db)
):
    """Update daily occurrence book entry."""
    report = db.query(DailyOccurrenceBook).filter(DailyOccurrenceBook.ob_id == ob_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Daily report not found")

    for field, value in report_data.model_dump(exclude_unset=True).items():
        setattr(report, field, value)

    report.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(report)

    employee = db.query(Employee).filter(Employee.employee_id == report.employee_id).first()
    site = db.query(Site).filter(Site.site_id == report.site_id).first()

    return {
        **report.__dict__,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
        "site_name": site.site_name or site.client_name if site else None,
    }


@router.put("/{ob_id}/review")
async def supervisor_review_daily_report(
    ob_id: int,
    review_data: SupervisorReviewOB,
    supervisor_id: int,
    db: Session = Depends(get_db)
):
    """Supervisor reviews and approves daily report."""
    report = db.query(DailyOccurrenceBook).filter(DailyOccurrenceBook.ob_id == ob_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Daily report not found")

    report.supervisor_id = supervisor_id
    report.supervisor_reviewed = True
    report.supervisor_comments = review_data.supervisor_comments
    report.reviewed_at = datetime.utcnow()
    report.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Daily report reviewed successfully"}


@router.delete("/{ob_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_report(ob_id: int, db: Session = Depends(get_db)):
    """Delete daily report."""
    report = db.query(DailyOccurrenceBook).filter(DailyOccurrenceBook.ob_id == ob_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Daily report not found")

    db.delete(report)
    db.commit()

    return None
