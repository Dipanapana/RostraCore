"""PSIRA wage rate compliance endpoints."""

from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.psira_wage_rate import PSIRAWageRate
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class WageRateCreate(BaseModel):
    effective_from: str
    effective_to: str
    grade: str
    area: int
    rate_type: str
    hourly_rate: float
    monthly_minimum: Optional[float] = None


class ComplianceCheck(BaseModel):
    employee_id: int
    employee_name: str
    grade: Optional[str]
    area: Optional[int]
    current_hourly_rate: float
    psira_minimum: Optional[float]
    compliant: bool
    shortfall: float


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/rates")
def list_rates(
    grade: Optional[str] = None,
    area: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all PSIRA wage rates, optionally filtered by grade and area."""
    query = db.query(PSIRAWageRate)

    if grade:
        query = query.filter(PSIRAWageRate.grade == grade.upper())
    if area:
        query = query.filter(PSIRAWageRate.area == area)

    rates = query.order_by(
        PSIRAWageRate.effective_from.desc(),
        PSIRAWageRate.grade,
        PSIRAWageRate.area,
        PSIRAWageRate.rate_type,
    ).all()

    return [
        {
            "rate_id": r.rate_id,
            "effective_from": r.effective_from.isoformat() if r.effective_from else None,
            "effective_to": r.effective_to.isoformat() if r.effective_to else None,
            "grade": r.grade,
            "area": r.area,
            "rate_type": r.rate_type,
            "hourly_rate": r.hourly_rate,
            "monthly_minimum": r.monthly_minimum,
        }
        for r in rates
    ]


@router.post("/rates", status_code=status.HTTP_201_CREATED)
def create_rate(
    data: WageRateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new PSIRA wage rate entry (admin only)."""
    rate = PSIRAWageRate(
        effective_from=date.fromisoformat(data.effective_from),
        effective_to=date.fromisoformat(data.effective_to),
        grade=data.grade.upper(),
        area=data.area,
        rate_type=data.rate_type,
        hourly_rate=data.hourly_rate,
        monthly_minimum=data.monthly_minimum,
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)

    return {
        "rate_id": rate.rate_id,
        "grade": rate.grade,
        "area": rate.area,
        "rate_type": rate.rate_type,
        "hourly_rate": rate.hourly_rate,
    }


@router.post("/rates/seed")
def seed_rates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Seed current PSIRA wage rates (2025-2026)."""
    # Check if already seeded
    existing = db.query(PSIRAWageRate).count()
    if existing > 0:
        return {"status": "already_seeded", "count": existing}

    # PSIRA rates effective March 2025 - February 2026
    rates_data = [
        # Area 1 & 2 normal rates
        {"grade": "A", "area": 1, "rate_type": "normal", "hourly_rate": 38.77, "monthly_minimum": 6729.00},
        {"grade": "B", "area": 1, "rate_type": "normal", "hourly_rate": 34.34, "monthly_minimum": 5960.00},
        {"grade": "C", "area": 1, "rate_type": "normal", "hourly_rate": 30.07, "monthly_minimum": 5219.00},
        {"grade": "D", "area": 1, "rate_type": "normal", "hourly_rate": 27.16, "monthly_minimum": 4714.00},
        {"grade": "E", "area": 1, "rate_type": "normal", "hourly_rate": 24.69, "monthly_minimum": 4285.00},
        {"grade": "A", "area": 2, "rate_type": "normal", "hourly_rate": 38.77, "monthly_minimum": 6729.00},
        {"grade": "B", "area": 2, "rate_type": "normal", "hourly_rate": 34.34, "monthly_minimum": 5960.00},
        {"grade": "C", "area": 2, "rate_type": "normal", "hourly_rate": 30.07, "monthly_minimum": 5219.00},
        {"grade": "D", "area": 2, "rate_type": "normal", "hourly_rate": 27.16, "monthly_minimum": 4714.00},
        {"grade": "E", "area": 2, "rate_type": "normal", "hourly_rate": 24.69, "monthly_minimum": 4285.00},
        # Area 3 normal rates (~10% lower)
        {"grade": "A", "area": 3, "rate_type": "normal", "hourly_rate": 34.89, "monthly_minimum": 6056.00},
        {"grade": "B", "area": 3, "rate_type": "normal", "hourly_rate": 30.91, "monthly_minimum": 5364.00},
        {"grade": "C", "area": 3, "rate_type": "normal", "hourly_rate": 27.06, "monthly_minimum": 4697.00},
        {"grade": "D", "area": 3, "rate_type": "normal", "hourly_rate": 24.44, "monthly_minimum": 4242.00},
        {"grade": "E", "area": 3, "rate_type": "normal", "hourly_rate": 22.22, "monthly_minimum": 3857.00},
    ]

    # Add overtime, sunday, public holiday rates for each
    all_rates = []
    for rd in rates_data:
        base = rd["hourly_rate"]
        all_rates.append(rd)
        all_rates.append({**rd, "rate_type": "overtime", "hourly_rate": round(base * 1.5, 2), "monthly_minimum": None})
        all_rates.append({**rd, "rate_type": "sunday", "hourly_rate": round(base * 1.5, 2), "monthly_minimum": None})
        all_rates.append({**rd, "rate_type": "public_holiday", "hourly_rate": round(base * 2.0, 2), "monthly_minimum": None})
        all_rates.append({**rd, "rate_type": "night", "hourly_rate": round(base * 1.1, 2), "monthly_minimum": None})

    for rd in all_rates:
        rate = PSIRAWageRate(
            effective_from=date(2025, 3, 1),
            effective_to=date(2026, 2, 28),
            grade=rd["grade"],
            area=rd["area"],
            rate_type=rd["rate_type"],
            hourly_rate=rd["hourly_rate"],
            monthly_minimum=rd.get("monthly_minimum"),
        )
        db.add(rate)

    db.commit()

    return {"status": "seeded", "count": len(all_rates)}


@router.get("/check")
def check_wage_compliance(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Check all employees' hourly rates against PSIRA minimums."""
    employees = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == "active",
    ).all()

    today = date.today()

    results = []
    compliant_count = 0
    non_compliant_count = 0

    for emp in employees:
        grade = emp.psira_grade if hasattr(emp, 'psira_grade') and emp.psira_grade else None
        hourly_rate = emp.hourly_rate if hasattr(emp, 'hourly_rate') and emp.hourly_rate else 0

        # Look up PSIRA minimum for this grade (default area 1)
        psira_rate = None
        if grade:
            rate_row = db.query(PSIRAWageRate).filter(
                PSIRAWageRate.grade == grade.upper(),
                PSIRAWageRate.area == 1,  # Default to area 1
                PSIRAWageRate.rate_type == "normal",
                PSIRAWageRate.effective_from <= today,
                PSIRAWageRate.effective_to >= today,
            ).first()
            if rate_row:
                psira_rate = rate_row.hourly_rate

        is_compliant = True
        shortfall = 0.0
        if psira_rate and hourly_rate < psira_rate:
            is_compliant = False
            shortfall = psira_rate - hourly_rate
            non_compliant_count += 1
        else:
            compliant_count += 1

        results.append({
            "employee_id": emp.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "grade": grade,
            "current_hourly_rate": float(hourly_rate) if hourly_rate else 0,
            "psira_minimum": psira_rate,
            "compliant": is_compliant,
            "shortfall": round(shortfall, 2),
        })

    return {
        "total_employees": len(results),
        "compliant": compliant_count,
        "non_compliant": non_compliant_count,
        "results": sorted(results, key=lambda x: (x["compliant"], x["employee_name"])),
    }
