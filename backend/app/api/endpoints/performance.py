"""
Employee performance evaluation and disciplinary case endpoints.

Evaluations: structured 1-5 scoring per category + overall score + notes.
Disciplinary: formal case log (verbal/written/final warning, suspension, dismissal).
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date, datetime

from app.database import get_db
from app.models.performance import EmployeeEvaluation, DisciplinaryCase
from app.models.employee import Employee
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class EvaluationCreate(BaseModel):
    evaluation_date: date
    overall_score: int                       # 1–5 required
    punctuality_score: Optional[int] = None
    conduct_score: Optional[int] = None
    performance_score: Optional[int] = None
    appearance_score: Optional[int] = None
    communication_score: Optional[int] = None
    notes: Optional[str] = None


class DisciplinaryCreate(BaseModel):
    incident_date: date
    case_type: str          # verbal_warning | written_warning | final_warning | suspension | dismissal
    reason: str
    outcome: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_employee_or_404(employee_id: int, org_id: int, db: Session) -> Employee:
    emp = db.query(Employee).filter(
        Employee.employee_id == employee_id,
        Employee.org_id == org_id,
    ).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return emp


def _caller_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip() if (user.first_name or user.last_name) else user.email


# ---------------------------------------------------------------------------
# Evaluations
# ---------------------------------------------------------------------------

@router.get("/employees/{employee_id}/evaluations")
def list_evaluations(
    employee_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all performance evaluations for an employee, newest first."""
    _get_employee_or_404(employee_id, org_id, db)
    evals = (
        db.query(EmployeeEvaluation)
        .filter(
            EmployeeEvaluation.org_id == org_id,
            EmployeeEvaluation.employee_id == employee_id,
        )
        .order_by(EmployeeEvaluation.evaluation_date.desc())
        .all()
    )
    return [e.to_dict() for e in evals]


@router.post("/employees/{employee_id}/evaluations", status_code=status.HTTP_201_CREATED)
def create_evaluation(
    employee_id: int,
    data: EvaluationCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a new performance evaluation for an employee."""
    _get_employee_or_404(employee_id, org_id, db)

    if not (1 <= data.overall_score <= 5):
        raise HTTPException(status_code=400, detail="overall_score must be between 1 and 5")
    for field in ["punctuality_score", "conduct_score", "performance_score", "appearance_score", "communication_score"]:
        val = getattr(data, field)
        if val is not None and not (1 <= val <= 5):
            raise HTTPException(status_code=400, detail=f"{field} must be between 1 and 5")

    evaluation = EmployeeEvaluation(
        org_id=org_id,
        employee_id=employee_id,
        evaluation_date=data.evaluation_date,
        evaluator_id=current_user.user_id,
        evaluator_name=_caller_name(current_user),
        overall_score=data.overall_score,
        punctuality_score=data.punctuality_score,
        conduct_score=data.conduct_score,
        performance_score=data.performance_score,
        appearance_score=data.appearance_score,
        communication_score=data.communication_score,
        notes=data.notes,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    return evaluation.to_dict()


@router.delete("/employees/{employee_id}/evaluations/{evaluation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evaluation(
    employee_id: int,
    evaluation_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete a performance evaluation record."""
    evaluation = db.query(EmployeeEvaluation).filter(
        EmployeeEvaluation.evaluation_id == evaluation_id,
        EmployeeEvaluation.employee_id == employee_id,
        EmployeeEvaluation.org_id == org_id,
    ).first()
    if not evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    db.delete(evaluation)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Disciplinary cases
# ---------------------------------------------------------------------------

VALID_CASE_TYPES = {"verbal_warning", "written_warning", "final_warning", "suspension", "dismissal"}


@router.get("/employees/{employee_id}/disciplinary")
def list_disciplinary(
    employee_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all disciplinary cases for an employee, newest first."""
    _get_employee_or_404(employee_id, org_id, db)
    cases = (
        db.query(DisciplinaryCase)
        .filter(
            DisciplinaryCase.org_id == org_id,
            DisciplinaryCase.employee_id == employee_id,
        )
        .order_by(DisciplinaryCase.incident_date.desc())
        .all()
    )
    return [c.to_dict() for c in cases]


@router.post("/employees/{employee_id}/disciplinary", status_code=status.HTTP_201_CREATED)
def create_disciplinary(
    employee_id: int,
    data: DisciplinaryCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a new disciplinary case for an employee."""
    _get_employee_or_404(employee_id, org_id, db)

    if data.case_type not in VALID_CASE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"case_type must be one of: {', '.join(sorted(VALID_CASE_TYPES))}",
        )

    case = DisciplinaryCase(
        org_id=org_id,
        employee_id=employee_id,
        incident_date=data.incident_date,
        case_type=data.case_type,
        reason=data.reason,
        outcome=data.outcome,
        issued_by_id=current_user.user_id,
        issued_by_name=_caller_name(current_user),
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case.to_dict()


@router.get("/performance-dashboard")
def performance_dashboard(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Organisation-wide performance dashboard with aggregated stats."""
    from sqlalchemy import func as sqlfunc

    # All evaluations for org
    evals = db.query(EmployeeEvaluation).filter(
        EmployeeEvaluation.org_id == org_id
    ).all()

    # All disciplinary cases
    cases = db.query(DisciplinaryCase).filter(
        DisciplinaryCase.org_id == org_id
    ).all()

    # Active employees count
    active_count = db.query(Employee).filter(
        Employee.org_id == org_id, Employee.status == "active"
    ).count()

    # Employees with at least one evaluation
    evaluated_ids = {e.employee_id for e in evals}
    employees_evaluated = len(evaluated_ids)

    # Average scores
    if evals:
        avg_overall = round(sum(e.overall_score for e in evals) / len(evals), 1)
        scores = {
            "punctuality": [e.punctuality_score for e in evals if e.punctuality_score],
            "conduct": [e.conduct_score for e in evals if e.conduct_score],
            "performance": [e.performance_score for e in evals if e.performance_score],
            "appearance": [e.appearance_score for e in evals if e.appearance_score],
            "communication": [e.communication_score for e in evals if e.communication_score],
        }
        avg_by_category = {
            k: round(sum(v) / len(v), 1) if v else None
            for k, v in scores.items()
        }
    else:
        avg_overall = 0
        avg_by_category = {}

    # Score distribution
    score_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for e in evals:
        score_dist[e.overall_score] = score_dist.get(e.overall_score, 0) + 1

    # Top performers (latest eval per employee, sorted by score)
    latest_evals: dict = {}
    for e in evals:
        eid = e.employee_id
        if eid not in latest_evals or e.evaluation_date > latest_evals[eid].evaluation_date:
            latest_evals[eid] = e

    top_performers = sorted(latest_evals.values(), key=lambda x: x.overall_score, reverse=True)[:10]
    top_list = []
    for ev in top_performers:
        emp = db.query(Employee).get(ev.employee_id)
        emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown"
        top_list.append({
            "employee_id": ev.employee_id,
            "name": emp_name,
            "overall_score": ev.overall_score,
            "evaluation_date": ev.evaluation_date.isoformat(),
        })

    # Disciplinary summary
    case_type_counts: dict = {}
    for c in cases:
        case_type_counts[c.case_type] = case_type_counts.get(c.case_type, 0) + 1

    # Recent disciplinary (last 10)
    recent_cases = sorted(cases, key=lambda c: c.incident_date, reverse=True)[:10]
    recent_list = []
    for c in recent_cases:
        emp = db.query(Employee).get(c.employee_id)
        emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Unknown"
        recent_list.append({
            "case_id": c.case_id,
            "employee_id": c.employee_id,
            "name": emp_name,
            "case_type": c.case_type,
            "reason": c.reason[:100] if c.reason else "",
            "incident_date": c.incident_date.isoformat(),
        })

    return {
        "total_active_employees": active_count,
        "employees_evaluated": employees_evaluated,
        "evaluation_coverage_pct": round(employees_evaluated / active_count * 100, 1) if active_count else 0,
        "total_evaluations": len(evals),
        "avg_overall_score": avg_overall,
        "avg_by_category": avg_by_category,
        "score_distribution": score_dist,
        "top_performers": top_list,
        "total_disciplinary_cases": len(cases),
        "disciplinary_by_type": case_type_counts,
        "recent_disciplinary": recent_list,
    }


@router.delete("/employees/{employee_id}/disciplinary/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_disciplinary(
    employee_id: int,
    case_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete a disciplinary case record."""
    case = db.query(DisciplinaryCase).filter(
        DisciplinaryCase.case_id == case_id,
        DisciplinaryCase.employee_id == employee_id,
        DisciplinaryCase.org_id == org_id,
    ).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disciplinary case not found")
    db.delete(case)
    db.commit()
    return None
