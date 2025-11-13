"""
Prediction API Endpoints
Provides access to ML-based predictions and intelligence features
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.services.shift_prediction_service import ShiftFillPredictor, HistoricalPatternAnalyzer
from app.services.churn_prediction_service import ChurnPredictor, RetentionRecommendationEngine
from app.services.cache_service import CacheService

router = APIRouter(prefix="/api/v1/predictions")


# Request/Response Models
class ShiftPredictionRequest(BaseModel):
    shift_start: datetime
    shift_end: datetime
    site_id: int
    required_certifications: Optional[List[str]] = None
    org_id: Optional[int] = None


class RosterPredictionRequest(BaseModel):
    shifts: List[Dict]
    org_id: Optional[int] = None


# ========== Shift Fill Prediction Endpoints ==========

@router.post("/shift-fill", response_model=Dict)
async def predict_shift_fill(
    request: ShiftPredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Predict the probability that a specific shift will be filled

    Returns:
        - fill_probability: 0-1 probability score
        - confidence: high/medium/low
        - factors: detailed breakdown of contributing factors
        - recommendation: actionable advice
    """

    try:
        prediction = ShiftFillPredictor.predict_shift_fill_probability(
            db=db,
            shift_start=request.shift_start,
            shift_end=request.shift_end,
            site_id=request.site_id,
            required_certifications=request.required_certifications,
            org_id=request.org_id
        )

        return prediction

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/roster-success", response_model=Dict)
async def predict_roster_success(
    request: RosterPredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Predict overall success probability for a roster (multiple shifts)

    Returns:
        - overall_fill_probability: Average probability across all shifts
        - expected_fills: Number of shifts expected to be filled
        - high_risk_shifts: Count of shifts with low fill probability
        - shift_predictions: Detailed predictions for each shift
    """

    try:
        prediction = ShiftFillPredictor.predict_roster_success(
            db=db,
            shifts=request.shifts,
            org_id=request.org_id
        )

        return prediction

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/patterns/hourly", response_model=List[Dict])
async def get_hourly_patterns(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get historical fill rate patterns by hour of day

    Useful for identifying difficult-to-fill time slots

    Returns:
        List of {hour, fill_rate, shift_count}
    """

    # Check cache
    cache_key = f"patterns:hourly:{org_id or 'all'}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        return cached_data

    try:
        patterns = HistoricalPatternAnalyzer.get_fill_rate_by_time_of_day(db, org_id)

        # Cache for 1 hour
        CacheService.set(cache_key, patterns, ttl=3600)

        return patterns

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pattern analysis failed: {str(e)}")


@router.get("/patterns/daily", response_model=List[Dict])
async def get_daily_patterns(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get historical fill rate patterns by day of week

    Useful for identifying difficult-to-fill days

    Returns:
        List of {day, fill_rate, shift_count}
    """

    # Check cache
    cache_key = f"patterns:daily:{org_id or 'all'}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        return cached_data

    try:
        patterns = HistoricalPatternAnalyzer.get_fill_rate_by_day_of_week(db, org_id)

        # Cache for 1 hour
        CacheService.set(cache_key, patterns, ttl=3600)

        return patterns

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pattern analysis failed: {str(e)}")


@router.get("/patterns/difficult", response_model=Dict)
async def get_difficult_patterns(
    threshold: float = Query(0.7, ge=0.0, le=1.0),
    org_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Identify patterns that are historically difficult to fill

    Args:
        threshold: Fill rate threshold (default 0.7 = 70%)
                  Patterns below this are considered difficult

    Returns:
        {
            difficult_hours: List of hours (0-23),
            difficult_days: List of day names,
            difficult_sites: List of site details,
            threshold: threshold used
        }
    """

    # Check cache
    cache_key = f"patterns:difficult:{org_id or 'all'}:{threshold}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        return cached_data

    try:
        patterns = HistoricalPatternAnalyzer.identify_difficult_to_fill_patterns(
            db=db,
            threshold=threshold,
            org_id=org_id
        )

        # Cache for 1 hour
        CacheService.set(cache_key, patterns, ttl=3600)

        return patterns

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pattern analysis failed: {str(e)}")


# ========== Employee Churn Prediction Endpoints ==========

@router.get("/churn/employee/{employee_id}", response_model=Dict)
async def predict_employee_churn(
    employee_id: int,
    db: Session = Depends(get_db)
):
    """
    Predict churn risk for a specific employee

    Returns:
        - churn_risk: 0-1 probability score
        - risk_level: low/medium/high/critical
        - risk_factors: List of behavioral indicators
        - behavioral_indicators: Detailed metrics
        - recommendation: Actionable advice
    """

    try:
        prediction = ChurnPredictor.predict_employee_churn_risk(
            db=db,
            employee_id=employee_id
        )

        if 'error' in prediction:
            raise HTTPException(status_code=404, detail=prediction['error'])

        return prediction

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/churn/at-risk", response_model=List[Dict])
async def get_at_risk_employees(
    min_risk_level: str = Query('medium', regex='^(low|medium|high|critical)$'),
    org_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get all employees at risk of churning

    Args:
        min_risk_level: Minimum risk level to include (medium, high, critical)
        org_id: Filter by organization

    Returns:
        List of employee churn predictions sorted by risk (highest first)
    """

    # Check cache
    cache_key = f"churn:at_risk:{org_id or 'all'}:{min_risk_level}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        return cached_data

    try:
        at_risk = ChurnPredictor.identify_at_risk_employees(
            db=db,
            org_id=org_id,
            min_risk_level=min_risk_level
        )

        # Cache for 1 hour
        CacheService.set(cache_key, at_risk, ttl=3600)

        return at_risk

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/churn/statistics", response_model=Dict)
async def get_churn_statistics(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get overall churn statistics for the organization

    Returns:
        - total_active_employees
        - critical_risk, high_risk, medium_risk, low_risk counts
        - overall_retention_health: good/fair/poor/critical
    """

    # Check cache
    cache_key = f"churn:statistics:{org_id or 'all'}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        return cached_data

    try:
        stats = ChurnPredictor.get_churn_statistics(db=db, org_id=org_id)

        # Cache for 30 minutes
        CacheService.set(cache_key, stats, ttl=1800)

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Statistics calculation failed: {str(e)}")


@router.get("/churn/retention-plan/{employee_id}", response_model=Dict)
async def get_retention_plan(
    employee_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate detailed retention plan for an at-risk employee

    Returns:
        - immediate_actions: Actions to take now
        - medium_term_actions: Actions for next 1-2 weeks
        - long_term_actions: Actions for next month+
        - talking_points: Conversation topics for manager
    """

    try:
        # First get churn prediction
        prediction = ChurnPredictor.predict_employee_churn_risk(db, employee_id)

        if 'error' in prediction:
            raise HTTPException(status_code=404, detail=prediction['error'])

        # Generate retention plan
        retention_plan = RetentionRecommendationEngine.generate_retention_plan(prediction)

        return {
            'employee_id': employee_id,
            'employee_name': prediction['employee_name'],
            'risk_level': prediction['risk_level'],
            'churn_risk_percentage': prediction['churn_risk_percentage'],
            **retention_plan
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {str(e)}")


# ========== Intelligence Overview Endpoint ==========

@router.get("/overview", response_model=Dict)
async def get_prediction_overview(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get comprehensive prediction overview

    Combines:
    - Churn statistics
    - Difficult-to-fill patterns
    - Recent prediction trends

    Useful for Intelligence Dashboard
    """

    # Check cache
    cache_key = f"predictions:overview:{org_id or 'all'}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        return cached_data

    try:
        # Get churn statistics
        churn_stats = ChurnPredictor.get_churn_statistics(db, org_id)

        # Get difficult patterns
        difficult_patterns = HistoricalPatternAnalyzer.identify_difficult_to_fill_patterns(
            db, threshold=0.7, org_id=org_id
        )

        # Get hourly and daily patterns
        hourly_patterns = HistoricalPatternAnalyzer.get_fill_rate_by_time_of_day(db, org_id)
        daily_patterns = HistoricalPatternAnalyzer.get_fill_rate_by_day_of_week(db, org_id)

        # Calculate average fill rates
        avg_hourly_fill = sum(h['fill_rate'] for h in hourly_patterns) / len(hourly_patterns) if hourly_patterns else 0
        avg_daily_fill = sum(d['fill_rate'] for d in daily_patterns) / len(daily_patterns) if daily_patterns else 0

        overview = {
            'workforce_health': {
                'total_active_employees': churn_stats['total_active_employees'],
                'retention_health': churn_stats['overall_retention_health'],
                'employees_at_risk': churn_stats['critical_risk'] + churn_stats['high_risk'],
                'critical_risk_percentage': churn_stats['critical_risk_percentage']
            },
            'scheduling_intelligence': {
                'average_fill_rate': round((avg_hourly_fill + avg_daily_fill) / 2, 2),
                'difficult_hours_count': len(difficult_patterns['difficult_hours']),
                'difficult_days_count': len(difficult_patterns['difficult_days']),
                'difficult_sites_count': len(difficult_patterns['difficult_sites'])
            },
            'recommendations': []
        }

        # Add recommendations
        if churn_stats['critical_risk'] > 0:
            overview['recommendations'].append({
                'type': 'CRITICAL',
                'message': f"{churn_stats['critical_risk']} employees at critical churn risk. Immediate action required."
            })

        if len(difficult_patterns['difficult_hours']) > 5:
            overview['recommendations'].append({
                'type': 'WARNING',
                'message': f"{len(difficult_patterns['difficult_hours'])} time slots are historically difficult to fill. Consider incentives."
            })

        if avg_hourly_fill < 0.8:
            overview['recommendations'].append({
                'type': 'INFO',
                'message': f"Overall fill rate is {round(avg_hourly_fill*100, 1)}%. Target is 90%+."
            })

        # Cache for 30 minutes
        CacheService.set(cache_key, overview, ttl=1800)

        return overview

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Overview generation failed: {str(e)}")
