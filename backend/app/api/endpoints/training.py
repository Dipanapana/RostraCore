"""Training management endpoints.

Manage training courses and employee training records.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.training import TrainingCourse, TrainingRecord
from app.models.employee import Employee
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CourseCreate(BaseModel):
    name: str
    category: str = "other"
    description: Optional[str] = None
    provider: Optional[str] = None
    duration_hours: Optional[float] = None
    is_mandatory: bool = False
    validity_months: Optional[int] = None


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    provider: Optional[str] = None
    duration_hours: Optional[float] = None
    is_mandatory: Optional[bool] = None
    validity_months: Optional[int] = None
    is_active: Optional[bool] = None


class RecordCreate(BaseModel):
    course_id: int
    employee_id: int
    status: str = "scheduled"
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    score: Optional[float] = None
    certificate_number: Optional[str] = None
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None


class RecordUpdate(BaseModel):
    status: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    score: Optional[float] = None
    certificate_number: Optional[str] = None
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None


def _build_course(c: TrainingCourse) -> dict:
    return {
        "course_id": c.course_id,
        "name": c.name,
        "category": c.category,
        "description": c.description,
        "provider": c.provider,
        "duration_hours": c.duration_hours,
        "is_mandatory": c.is_mandatory,
        "validity_months": c.validity_months,
        "is_active": c.is_active,
        "created_at": c.created_at,
    }


def _build_record(r: TrainingRecord, db: Session) -> dict:
    emp = db.query(Employee).get(r.employee_id) if r.employee_id else None
    course = db.query(TrainingCourse).get(r.course_id) if r.course_id else None
    return {
        "record_id": r.record_id,
        "course_id": r.course_id,
        "course_name": course.name if course else None,
        "course_category": course.category if course else None,
        "employee_id": r.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
        "status": r.status,
        "scheduled_date": r.scheduled_date,
        "completed_date": r.completed_date,
        "score": r.score,
        "certificate_number": r.certificate_number,
        "expires_at": r.expires_at,
        "notes": r.notes,
        "created_at": r.created_at,
    }


# ---------------------------------------------------------------------------
# Courses CRUD
# ---------------------------------------------------------------------------

@router.get("/courses/")
def list_courses(
    category: Optional[str] = None,
    active_only: bool = True,
    search: Optional[str] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List training courses."""
    q = db.query(TrainingCourse).filter(TrainingCourse.org_id == org_id)
    if active_only:
        q = q.filter(TrainingCourse.is_active.is_(True))
    if category:
        q = q.filter(TrainingCourse.category == category)
    if search:
        like = f"%{search}%"
        q = q.filter(TrainingCourse.name.ilike(like))
    courses = q.order_by(TrainingCourse.name).all()
    return {"items": [_build_course(c) for c in courses], "total": len(courses)}


@router.post("/courses/", status_code=status.HTTP_201_CREATED)
def create_course(
    body: CourseCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Create a training course."""
    c = TrainingCourse(
        org_id=org_id,
        name=body.name,
        category=body.category,
        description=body.description,
        provider=body.provider,
        duration_hours=body.duration_hours,
        is_mandatory=body.is_mandatory,
        validity_months=body.validity_months,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _build_course(c)


@router.put("/courses/{course_id}/")
def update_course(
    course_id: int,
    body: CourseUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update a training course."""
    c = db.query(TrainingCourse).filter(
        TrainingCourse.course_id == course_id,
        TrainingCourse.org_id == org_id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")

    for field in ["name", "category", "description", "provider", "duration_hours", "is_mandatory", "validity_months", "is_active"]:
        val = getattr(body, field)
        if val is not None:
            setattr(c, field, val)

    db.commit()
    db.refresh(c)
    return _build_course(c)


@router.delete("/courses/{course_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Deactivate a training course."""
    c = db.query(TrainingCourse).filter(
        TrainingCourse.course_id == course_id,
        TrainingCourse.org_id == org_id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    c.is_active = False
    db.commit()


# ---------------------------------------------------------------------------
# Records CRUD
# ---------------------------------------------------------------------------

@router.get("/records/")
def list_records(
    employee_id: Optional[int] = None,
    course_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List training records."""
    q = db.query(TrainingRecord).filter(TrainingRecord.org_id == org_id)
    if employee_id:
        q = q.filter(TrainingRecord.employee_id == employee_id)
    if course_id:
        q = q.filter(TrainingRecord.course_id == course_id)
    if status_filter:
        q = q.filter(TrainingRecord.status == status_filter)
    if search:
        like = f"%{search}%"
        q = q.join(TrainingCourse).filter(TrainingCourse.name.ilike(like))

    total = q.count()
    records = q.order_by(TrainingRecord.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": [_build_record(r, db) for r in records], "total": total}


@router.post("/records/", status_code=status.HTTP_201_CREATED)
def create_record(
    body: RecordCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enrol an employee in a training course."""
    # Validate course and employee
    course = db.query(TrainingCourse).filter(
        TrainingCourse.course_id == body.course_id,
        TrainingCourse.org_id == org_id,
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    emp = db.query(Employee).filter(
        Employee.employee_id == body.employee_id,
        Employee.org_id == org_id,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Auto-set expires_at based on validity_months
    expires_at = body.expires_at
    if not expires_at and body.status == "completed" and body.completed_date and course.validity_months:
        expires_at = body.completed_date + timedelta(days=course.validity_months * 30)

    r = TrainingRecord(
        org_id=org_id,
        course_id=body.course_id,
        employee_id=body.employee_id,
        status=body.status,
        scheduled_date=body.scheduled_date,
        completed_date=body.completed_date,
        score=body.score,
        certificate_number=body.certificate_number,
        expires_at=expires_at,
        notes=body.notes,
        created_by_user_id=current_user.user_id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _build_record(r, db)


@router.put("/records/{record_id}/")
def update_record(
    record_id: int,
    body: RecordUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update a training record."""
    r = db.query(TrainingRecord).filter(
        TrainingRecord.record_id == record_id,
        TrainingRecord.org_id == org_id,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Record not found")

    for field in ["status", "scheduled_date", "completed_date", "score", "certificate_number", "expires_at", "notes"]:
        val = getattr(body, field)
        if val is not None:
            setattr(r, field, val)

    db.commit()
    db.refresh(r)
    return _build_record(r, db)


@router.delete("/records/{record_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    record_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete a training record."""
    r = db.query(TrainingRecord).filter(
        TrainingRecord.record_id == record_id,
        TrainingRecord.org_id == org_id,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(r)
    db.commit()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def training_dashboard(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Training compliance dashboard."""
    courses = db.query(TrainingCourse).filter(
        TrainingCourse.org_id == org_id,
        TrainingCourse.is_active.is_(True),
    ).all()
    records = db.query(TrainingRecord).filter(TrainingRecord.org_id == org_id).all()
    employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == "active",
    ).all()

    now = datetime.utcnow()
    total_courses = len(courses)
    total_records = len(records)
    total_employees = len(employees)

    completed = sum(1 for r in records if r.status == "completed")
    scheduled = sum(1 for r in records if r.status == "scheduled")
    in_progress = sum(1 for r in records if r.status == "in_progress")
    failed = sum(1 for r in records if r.status == "failed")

    # Expiring training (within 60 days)
    expiring_soon = sum(
        1 for r in records
        if r.status == "completed" and r.expires_at and r.expires_at > now and (r.expires_at - now).days <= 60
    )
    expired = sum(
        1 for r in records
        if r.status == "completed" and r.expires_at and r.expires_at <= now
    )

    # By category
    cat_counts: dict = {}
    for r in records:
        course = next((c for c in courses if c.course_id == r.course_id), None)
        cat = course.category if course else "other"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    # Mandatory compliance rate
    mandatory_courses = [c for c in courses if c.is_mandatory]
    mandatory_ids = {c.course_id for c in mandatory_courses}
    if mandatory_courses and total_employees > 0:
        mandatory_completions = sum(
            1 for r in records
            if r.course_id in mandatory_ids and r.status == "completed"
            and (not r.expires_at or r.expires_at > now)
        )
        mandatory_target = len(mandatory_courses) * total_employees
        compliance_pct = round(mandatory_completions / mandatory_target * 100, 1) if mandatory_target > 0 else 0
    else:
        compliance_pct = 100.0

    return {
        "total_courses": total_courses,
        "total_records": total_records,
        "total_employees": total_employees,
        "completed": completed,
        "scheduled": scheduled,
        "in_progress": in_progress,
        "failed": failed,
        "expiring_soon": expiring_soon,
        "expired": expired,
        "compliance_pct": compliance_pct,
        "mandatory_courses": len(mandatory_courses),
        "by_category": sorted(cat_counts.items(), key=lambda x: x[1], reverse=True),
    }
