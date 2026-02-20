"""Employee skills matrix — certification coverage, training gaps, capability overview."""

from datetime import datetime, date
from typing import Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.certification import Certification
from app.models.training import TrainingCourse, TrainingRecord
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/overview")
def skills_matrix_overview(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Skills matrix — employee capability overview with cert/training status."""
    today = date.today()

    employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == "active",
    ).all()

    # All certs for active employees
    emp_ids = [e.employee_id for e in employees]
    certs = db.query(Certification).filter(
        Certification.employee_id.in_(emp_ids),
    ).all() if emp_ids else []

    # All training records (completed)
    training_records = db.query(TrainingRecord).filter(
        TrainingRecord.org_id == org_id,
        TrainingRecord.employee_id.in_(emp_ids),
        TrainingRecord.status == "COMPLETED",
    ).all() if emp_ids else []

    # Index certs by employee
    emp_certs = defaultdict(list)
    for c in certs:
        emp_certs[c.employee_id].append(c)

    # Index training by employee
    emp_training = defaultdict(list)
    for tr in training_records:
        emp_training[tr.employee_id].append(tr)

    # Gather all cert types and training courses
    all_cert_types = sorted(set(c.cert_type for c in certs if c.cert_type))
    course_ids = set(tr.course_id for tr in training_records if tr.course_id)
    courses = {}
    if course_ids:
        for c in db.query(TrainingCourse).filter(TrainingCourse.course_id.in_(list(course_ids))).all():
            courses[c.course_id] = c.name

    all_course_names = sorted(set(courses.values()))

    # Build matrix rows
    rows = []
    for emp in employees:
        my_certs = emp_certs.get(emp.employee_id, [])
        my_training = emp_training.get(emp.employee_id, [])

        # Cert status per type
        cert_map = {}
        for ct in all_cert_types:
            matching = [c for c in my_certs if c.cert_type == ct]
            if not matching:
                cert_map[ct] = "missing"
            else:
                latest = max(matching, key=lambda c: c.expiry_date or date.min)
                if latest.expiry_date and latest.expiry_date < today:
                    cert_map[ct] = "expired"
                elif latest.expiry_date and (latest.expiry_date - today).days <= 30:
                    cert_map[ct] = "expiring"
                elif latest.verified:
                    cert_map[ct] = "valid"
                else:
                    cert_map[ct] = "unverified"

        # Training status per course
        training_map = {}
        for cn in all_course_names:
            matching = [tr for tr in my_training if courses.get(tr.course_id) == cn]
            if not matching:
                training_map[cn] = "not_completed"
            else:
                latest = max(matching, key=lambda t: t.completed_date or date.min)
                if latest.expires_at and latest.expires_at.date() < today:
                    training_map[cn] = "expired"
                elif latest.expires_at and (latest.expires_at.date() - today).days <= 30:
                    training_map[cn] = "expiring"
                else:
                    training_map[cn] = "completed"

        # PSIRA status
        psira_status = "none"
        psira_grade_val = str(getattr(emp.psira_grade, 'value', emp.psira_grade)) if emp.psira_grade else None
        if emp.psira_expiry_date:
            if emp.psira_expiry_date < today:
                psira_status = "expired"
            elif (emp.psira_expiry_date - today).days <= 30:
                psira_status = "expiring"
            else:
                psira_status = "valid"

        # Firearm competency
        firearm = None
        for c in my_certs:
            if c.firearm_competency:
                fc = str(getattr(c.firearm_competency, 'value', c.firearm_competency))
                if c.expiry_date and c.expiry_date >= today:
                    firearm = fc
                    break

        total_certs = len([v for v in cert_map.values() if v in ("valid", "expiring")])
        total_training = len([v for v in training_map.values() if v in ("completed", "expiring")])

        rows.append({
            "employee_id": emp.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "role": str(getattr(emp.role, 'value', emp.role)) if emp.role else None,
            "psira_grade": psira_grade_val,
            "psira_status": psira_status,
            "firearm_competency": firearm,
            "active_certs": total_certs,
            "total_cert_types": len(all_cert_types),
            "completed_training": total_training,
            "total_courses": len(all_course_names),
            "certifications": cert_map,
            "training": training_map,
        })

    rows.sort(key=lambda r: r["active_certs"], reverse=True)

    return {
        "total_employees": len(rows),
        "cert_types": all_cert_types,
        "training_courses": all_course_names,
        "employees": rows,
    }


@router.get("/dashboard")
def skills_matrix_dashboard(
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Skills matrix summary — coverage rates, gaps, expiring certs."""
    today = date.today()

    employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == "active",
    ).all()

    emp_ids = [e.employee_id for e in employees]
    total_employees = len(employees)

    certs = db.query(Certification).filter(
        Certification.employee_id.in_(emp_ids),
    ).all() if emp_ids else []

    training_records = db.query(TrainingRecord).filter(
        TrainingRecord.org_id == org_id,
        TrainingRecord.employee_id.in_(emp_ids),
        TrainingRecord.status == "COMPLETED",
    ).all() if emp_ids else []

    # PSIRA stats
    psira_valid = sum(1 for e in employees if e.psira_expiry_date and e.psira_expiry_date >= today)
    psira_expired = sum(1 for e in employees if e.psira_expiry_date and e.psira_expiry_date < today)
    psira_expiring = sum(1 for e in employees if e.psira_expiry_date and 0 <= (e.psira_expiry_date - today).days <= 30)

    # By PSIRA grade
    by_grade = defaultdict(int)
    for e in employees:
        g = str(getattr(e.psira_grade, 'value', e.psira_grade)) if e.psira_grade else "None"
        by_grade[g] += 1

    # Cert coverage by type
    cert_type_coverage = defaultdict(lambda: {"valid": 0, "expired": 0, "total": 0})
    for c in certs:
        ct = c.cert_type or "Unknown"
        cert_type_coverage[ct]["total"] += 1
        if c.expiry_date and c.expiry_date >= today and c.verified:
            cert_type_coverage[ct]["valid"] += 1
        elif c.expiry_date and c.expiry_date < today:
            cert_type_coverage[ct]["expired"] += 1

    cert_summary = []
    for ct, stats in sorted(cert_type_coverage.items(), key=lambda x: x[1]["total"], reverse=True):
        cert_summary.append({
            "cert_type": ct,
            "total": stats["total"],
            "valid": stats["valid"],
            "expired": stats["expired"],
        })

    # Training coverage
    courses = db.query(TrainingCourse).filter(
        TrainingCourse.org_id == org_id,
        TrainingCourse.is_active == True,
    ).all()

    training_summary = []
    for course in courses:
        completed = sum(1 for tr in training_records if tr.course_id == course.course_id)
        rate = round((completed / total_employees) * 100, 1) if total_employees > 0 else 0
        training_summary.append({
            "course_id": course.course_id,
            "course_name": course.name,
            "category": str(getattr(course.category, 'value', course.category)) if course.category else None,
            "is_mandatory": course.is_mandatory,
            "employees_completed": completed,
            "total_employees": total_employees,
            "coverage_rate": rate,
        })
    training_summary.sort(key=lambda x: x["coverage_rate"])

    # Firearm competency
    armed_capable = set()
    for c in certs:
        if c.firearm_competency and c.expiry_date and c.expiry_date >= today:
            armed_capable.add(c.employee_id)

    # Expiring soon (next 30 days)
    expiring_certs = []
    for c in certs:
        if c.expiry_date and 0 < (c.expiry_date - today).days <= 30:
            emp = next((e for e in employees if e.employee_id == c.employee_id), None)
            name = f"{emp.first_name} {emp.last_name}" if emp else f"Employee #{c.employee_id}"
            expiring_certs.append({
                "employee_id": c.employee_id,
                "employee_name": name,
                "cert_type": c.cert_type,
                "expiry_date": c.expiry_date.isoformat(),
                "days_remaining": (c.expiry_date - today).days,
            })
    expiring_certs.sort(key=lambda x: x["days_remaining"])

    return {
        "total_employees": total_employees,
        "psira_valid": psira_valid,
        "psira_expired": psira_expired,
        "psira_expiring_30d": psira_expiring,
        "armed_capable": len(armed_capable),
        "by_psira_grade": dict(by_grade),
        "cert_coverage": cert_summary,
        "training_coverage": training_summary,
        "expiring_certs": expiring_certs[:20],
    }
