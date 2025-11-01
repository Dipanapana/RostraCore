"""Roster generation API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.models.schemas import RosterGenerateRequest, RosterGenerateResponse, ShiftResponse
from app.algorithms.roster_generator import RosterGenerator
from app.algorithms.milp_roster_generator import MILPRosterGenerator
from app.services.shift_service import ShiftService
from app.config import settings

router = APIRouter()


@router.post("/generate", response_model=RosterGenerateResponse)
async def generate_roster(
    request: RosterGenerateRequest,
    algorithm: Optional[str] = Query(None, description="Algorithm to use: 'hungarian', 'milp', or 'auto'"),
    db: Session = Depends(get_db)
):
    """
    Generate optimized roster using algorithmic approach.

    This is the main endpoint for auto-rostering.

    Args:
        request: Roster generation request with dates and site IDs
        algorithm: Optional algorithm selection ('hungarian', 'milp', 'auto')
                  If not specified, uses ROSTER_ALGORITHM from settings
        db: Database session

    Returns:
        Roster assignments with summary and unfilled shifts
    """
    try:
        # Convert dates to datetime
        start_datetime = datetime.combine(request.start_date, datetime.min.time())
        end_datetime = datetime.combine(request.end_date, datetime.max.time())

        # Determine which algorithm to use
        selected_algorithm = algorithm or settings.ROSTER_ALGORITHM

        print(f"[ROSTER DEBUG] ROSTER_ALGORITHM from settings: {settings.ROSTER_ALGORITHM}")
        print(f"[ROSTER DEBUG] Selected algorithm before auto-select: {selected_algorithm}")

        # Auto-select based on roster period length
        if selected_algorithm == "auto":
            period_days = (end_datetime - start_datetime).days
            # Use MILP for periods > 3 days, Hungarian for shorter periods
            selected_algorithm = "milp" if period_days > 3 else "hungarian"
            print(f"[ROSTER DEBUG] Auto-selected {selected_algorithm} based on {period_days} days")

        print(f"[ROSTER DEBUG] Final selected algorithm: {selected_algorithm}")

        # Initialize appropriate generator
        if selected_algorithm == "milp":
            print("[ROSTER DEBUG] Initializing MILPRosterGenerator")
            generator = MILPRosterGenerator(db)
        else:
            print("[ROSTER DEBUG] Initializing RosterGenerator (Hungarian)")
            generator = RosterGenerator(db)

        # Generate roster
        result = generator.generate_roster(
            start_date=start_datetime,
            end_date=end_datetime,
            site_ids=request.site_ids
        )

        # Add algorithm info to result
        result["algorithm_used"] = selected_algorithm

        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating roster: {str(e)}"
        )


@router.post("/confirm")
async def confirm_roster(
    assignments: List[dict],
    db: Session = Depends(get_db)
):
    """Confirm and save generated roster assignments."""
    try:
        confirmed_count = 0
        for assignment in assignments:
            shift = ShiftService.assign_employee(
                db,
                assignment["shift_id"],
                assignment["employee_id"]
            )
            if shift:
                confirmed_count += 1

        return {
            "success": True,
            "confirmed_shifts": confirmed_count,
            "total_assignments": len(assignments)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error confirming roster: {str(e)}"
        )


@router.get("/unfilled-shifts", response_model=List[ShiftResponse])
async def get_unfilled_shifts(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    site_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get list of shifts without assigned employees."""
    if not start_date:
        start_date = datetime.now()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    site_ids = [site_id] if site_id else None

    shifts = ShiftService.get_unassigned_shifts(
        db,
        start_date=start_date,
        end_date=end_date,
        site_ids=site_ids
    )

    return shifts


@router.get("/employee-hours")
async def get_employee_hours(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get hours breakdown per employee."""
    if not start_date:
        start_date = datetime.now()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    shifts = ShiftService.get_all(
        db,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        limit=1000
    )

    # Calculate hours per employee
    employee_hours = {}
    for shift in shifts:
        if shift.assigned_employee_id:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            if shift.assigned_employee_id not in employee_hours:
                employee_hours[shift.assigned_employee_id] = {
                    "employee_id": shift.assigned_employee_id,
                    "total_hours": 0,
                    "shift_count": 0
                }
            employee_hours[shift.assigned_employee_id]["total_hours"] += duration
            employee_hours[shift.assigned_employee_id]["shift_count"] += 1

    return {"employee_hours": list(employee_hours.values())}


@router.get("/budget-summary")
async def get_budget_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    site_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get budget summary for a roster period."""
    if not start_date:
        start_date = datetime.now()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    shifts = ShiftService.get_all(
        db,
        site_id=site_id,
        start_date=start_date,
        end_date=end_date,
        limit=1000
    )

    total_cost = 0
    total_hours = 0
    filled_shifts = 0

    for shift in shifts:
        if shift.assigned_employee_id and shift.employee:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            cost = duration * shift.employee.hourly_rate
            total_cost += cost
            total_hours += duration
            filled_shifts += 1

    return {
        "total_cost": round(total_cost, 2),
        "total_hours": round(total_hours, 2),
        "filled_shifts": filled_shifts,
        "total_shifts": len(shifts),
        "fill_rate": round(filled_shifts / len(shifts) * 100, 2) if shifts else 0
    }
