"""Settings management API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings
from typing import Optional

router = APIRouter()


class ConstraintSettings(BaseModel):
    """Constraint settings model"""
    max_hours_week: int
    min_rest_hours: int
    max_distance_km: float
    fairness_weight: float
    milp_time_limit: int
    testing_mode: bool
    skip_certification_check: bool
    skip_skill_matching: bool
    skip_availability_check: bool


@router.get("/constraints", response_model=ConstraintSettings)
async def get_constraints():
    """Get current constraint settings"""
    return ConstraintSettings(
        max_hours_week=settings.MAX_HOURS_WEEK,
        min_rest_hours=settings.MIN_REST_HOURS,
        max_distance_km=settings.MAX_DISTANCE_KM,
        fairness_weight=settings.FAIRNESS_WEIGHT,
        milp_time_limit=settings.MILP_TIME_LIMIT,
        testing_mode=settings.TESTING_MODE,
        skip_certification_check=settings.SKIP_CERTIFICATION_CHECK,
        skip_skill_matching=settings.SKIP_SKILL_MATCHING,
        skip_availability_check=settings.SKIP_AVAILABILITY_CHECK
    )


@router.put("/constraints")
async def update_constraints(constraints: ConstraintSettings):
    """
    Update constraint settings (runtime only - does not persist to file).

    Note: Settings are updated in memory for the current session.
    To persist changes, modify backend/app/config.py directly.
    """
    try:
        # Update settings in memory
        settings.MAX_HOURS_WEEK = constraints.max_hours_week
        settings.MIN_REST_HOURS = constraints.min_rest_hours
        settings.MAX_DISTANCE_KM = constraints.max_distance_km
        settings.FAIRNESS_WEIGHT = constraints.fairness_weight
        settings.MILP_TIME_LIMIT = constraints.milp_time_limit
        settings.TESTING_MODE = constraints.testing_mode
        settings.SKIP_CERTIFICATION_CHECK = constraints.skip_certification_check
        settings.SKIP_SKILL_MATCHING = constraints.skip_skill_matching
        settings.SKIP_AVAILABILITY_CHECK = constraints.skip_availability_check

        return {
            "success": True,
            "message": "Constraints updated successfully (in memory only)",
            "constraints": constraints
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update constraints: {str(e)}"
        )


@router.post("/constraints/reset")
async def reset_constraints():
    """Reset constraints to production-safe BCEA-compliant defaults"""
    settings.MAX_HOURS_WEEK = 48
    settings.MIN_REST_HOURS = 8
    settings.MAX_DISTANCE_KM = 50.0
    settings.FAIRNESS_WEIGHT = 0.2
    settings.MILP_TIME_LIMIT = 180
    settings.TESTING_MODE = False
    settings.SKIP_CERTIFICATION_CHECK = False
    settings.SKIP_SKILL_MATCHING = False
    settings.SKIP_AVAILABILITY_CHECK = False

    return {
        "success": True,
        "message": "Constraints reset to BCEA-compliant defaults"
    }
