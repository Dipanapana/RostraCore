"""
Analytics API Endpoints
Provides event tracking, metrics viewing, and customer health insights
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.database import get_db
from app.services.analytics_service import AnalyticsService, track
from app.models.analytics import AnalyticsEvent, AnalyticsDailyMetrics, CustomerHealthScore


router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class EventTrackRequest(BaseModel):
    """Request model for tracking an event"""
    event_name: str
    user_id: Optional[int] = None
    org_id: Optional[int] = None
    session_id: Optional[str] = None
    properties: Optional[Dict[str, Any]] = {}
    device_type: Optional[str] = None
    browser: Optional[str] = None
    page_load_time_ms: Optional[int] = None


class EventResponse(BaseModel):
    """Response model for an event"""
    event_id: str
    event_name: str
    user_id: Optional[int]
    org_id: Optional[int]
    timestamp: datetime
    properties: Dict[str, Any]

    class Config:
        from_attributes = True


class DailyMetricsResponse(BaseModel):
    """Response model for daily metrics"""
    date: datetime
    active_users: int
    rosters_generated: int
    shifts_created: int
    employees_added: int
    avg_roster_fill_rate: float
    avg_optimization_time_seconds: float
    compliance_rate: float
    total_cost_scheduled: float
    avg_cost_per_shift: float
    sessions_count: int
    avg_session_duration_minutes: float
    features_used_count: int

    class Config:
        from_attributes = True


class HealthScoreResponse(BaseModel):
    """Response model for customer health score"""
    org_id: int
    overall_score: int
    health_status: str
    usage_score: int
    adoption_score: int
    satisfaction_score: int
    growth_score: int
    churn_risk: float
    recommendations: List[Dict[str, str]]
    calculated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# EVENT TRACKING ENDPOINTS
# ============================================

@router.post("/track", response_model=EventResponse, status_code=201)
async def track_event(
    event_data: EventTrackRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Track a user behavior event

    **Usage:**
    ```python
    POST /api/v1/analytics/track
    {
        "event_name": "roster_generated",
        "user_id": 1,
        "org_id": 1,
        "properties": {
            "fill_rate": 98,
            "duration_seconds": 8,
            "algorithm": "cpsat"
        }
    }
    ```

    **Common Events:**
    - `user_signup_started` - User begins registration
    - `user_signup_completed` - Account created
    - `first_employee_added` - First meaningful action
    - `first_site_added` - Second setup step
    - `first_shift_created` - Third setup step
    - `first_roster_generated` - "Aha!" moment
    - `roster_confirmed` - User accepts roster
    - `roster_manual_override` - User rejects algorithm
    - `export_triggered` - Export functionality used
    - `help_accessed` - User seeks help
    - `error_encountered` - Error occurred
    """
    try:
        # Extract user agent and IP from request
        user_agent = request.headers.get("user-agent", None)
        # Get IP from X-Forwarded-For or direct connection
        ip_address = request.headers.get("x-forwarded-for", request.client.host if request.client else None)

        event = AnalyticsService.track_event(
            db=db,
            event_name=event_data.event_name,
            user_id=event_data.user_id,
            org_id=event_data.org_id,
            session_id=event_data.session_id,
            properties=event_data.properties,
            user_agent=user_agent,
            ip_address=ip_address,
            device_type=event_data.device_type,
            browser=event_data.browser,
            page_load_time_ms=event_data.page_load_time_ms
        )

        return EventResponse(
            event_id=str(event.event_id),
            event_name=event.event_name,
            user_id=event.user_id,
            org_id=event.org_id,
            timestamp=event.timestamp,
            properties=event.event_properties
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track event: {str(e)}")


@router.get("/events/{org_id}", response_model=List[EventResponse])
async def get_organization_events(
    org_id: int,
    event_name: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get events for an organization with optional filters

    **Query Parameters:**
    - `event_name`: Filter by specific event type
    - `start_date`: Filter events after this date
    - `end_date`: Filter events before this date
    - `limit`: Maximum number of events (default: 100, max: 1000)

    **Example:**
    ```
    GET /api/v1/analytics/events/1?event_name=roster_generated&limit=50
    ```
    """
    if limit > 1000:
        limit = 1000

    try:
        events = AnalyticsService.get_events_for_org(
            db=db,
            org_id=org_id,
            event_name=event_name,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        return [
            EventResponse(
                event_id=str(event.event_id),
                event_name=event.event_name,
                user_id=event.user_id,
                org_id=event.org_id,
                timestamp=event.timestamp,
                properties=event.event_properties
            )
            for event in events
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch events: {str(e)}")


# ============================================
# METRICS ENDPOINTS
# ============================================

@router.get("/metrics/daily/{org_id}", response_model=List[DailyMetricsResponse])
async def get_daily_metrics(
    org_id: int,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get daily metrics for an organization

    **Query Parameters:**
    - `days`: Number of days to retrieve (default: 30, max: 365)

    **Returns:** List of daily metrics ordered by date (most recent first)

    **Example:**
    ```
    GET /api/v1/analytics/metrics/daily/1?days=14
    ```
    """
    if days > 365:
        days = 365

    try:
        start_date = datetime.utcnow() - timedelta(days=days)

        metrics = db.query(AnalyticsDailyMetrics).filter(
            AnalyticsDailyMetrics.org_id == org_id,
            AnalyticsDailyMetrics.date >= start_date.date()
        ).order_by(AnalyticsDailyMetrics.date.desc()).all()

        return metrics

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")


@router.post("/metrics/calculate/{org_id}", response_model=DailyMetricsResponse)
async def calculate_daily_metrics(
    org_id: int,
    date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """
    Calculate and store daily metrics for an organization

    **Query Parameters:**
    - `date`: Date to calculate metrics for (default: today)

    **Note:** This endpoint is typically called by a scheduled job.
    Manual use is for backfilling or testing.

    **Example:**
    ```
    POST /api/v1/analytics/metrics/calculate/1?date=2025-11-05
    ```
    """
    if not date:
        date = datetime.utcnow()

    try:
        metrics = AnalyticsService.calculate_daily_metrics(
            db=db,
            org_id=org_id,
            date=date
        )

        return metrics

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate metrics: {str(e)}")


# ============================================
# CUSTOMER HEALTH ENDPOINTS
# ============================================

@router.get("/health/{org_id}", response_model=HealthScoreResponse)
async def get_customer_health_score(
    org_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the latest customer health score for an organization

    **Returns:**
    - Overall health score (0-100)
    - Component scores (usage, adoption, satisfaction, growth)
    - Health status (healthy/at_risk/churning)
    - Churn risk probability (0-1)
    - Actionable recommendations

    **Example:**
    ```
    GET /api/v1/analytics/health/1
    ```
    """
    try:
        # Get most recent health score
        health_score = db.query(CustomerHealthScore).filter(
            CustomerHealthScore.org_id == org_id
        ).order_by(CustomerHealthScore.calculated_at.desc()).first()

        if not health_score:
            # Calculate if doesn't exist
            health_score = AnalyticsService.calculate_customer_health_score(
                db=db,
                org_id=org_id
            )

        return health_score

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch health score: {str(e)}")


@router.post("/health/calculate/{org_id}", response_model=HealthScoreResponse)
async def calculate_customer_health_score(
    org_id: int,
    db: Session = Depends(get_db)
):
    """
    Calculate and store customer health score for an organization

    **Note:** This endpoint is typically called by a scheduled job.
    Manual use is for testing or when immediate score is needed.

    **Example:**
    ```
    POST /api/v1/analytics/health/calculate/1
    ```
    """
    try:
        health_score = AnalyticsService.calculate_customer_health_score(
            db=db,
            org_id=org_id
        )

        return health_score

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate health score: {str(e)}")


@router.get("/health/at-risk", response_model=List[HealthScoreResponse])
async def get_at_risk_customers(
    churn_risk_threshold: float = 0.5,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get list of customers at risk of churning

    **Query Parameters:**
    - `churn_risk_threshold`: Minimum churn risk to include (default: 0.5)
    - `limit`: Maximum number of customers to return (default: 50)

    **Returns:** List of organizations with high churn risk, ordered by risk (highest first)

    **Example:**
    ```
    GET /api/v1/analytics/health/at-risk?churn_risk_threshold=0.6
    ```
    """
    try:
        # Get most recent health score for each org
        subquery = db.query(
            CustomerHealthScore.org_id,
            db.func.max(CustomerHealthScore.calculated_at).label('max_date')
        ).group_by(CustomerHealthScore.org_id).subquery()

        at_risk_customers = db.query(CustomerHealthScore).join(
            subquery,
            db.and_(
                CustomerHealthScore.org_id == subquery.c.org_id,
                CustomerHealthScore.calculated_at == subquery.c.max_date
            )
        ).filter(
            CustomerHealthScore.churn_risk >= churn_risk_threshold
        ).order_by(CustomerHealthScore.churn_risk.desc()).limit(limit).all()

        return at_risk_customers

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch at-risk customers: {str(e)}")


# ============================================
# SUMMARY ENDPOINT
# ============================================

@router.get("/summary/{org_id}")
async def get_analytics_summary(
    org_id: int,
    db: Session = Depends(get_db)
):
    """
    Get comprehensive analytics summary for an organization

    **Returns:**
    - Recent metrics (last 7 days)
    - Health score
    - Top events
    - Feature usage summary

    **Example:**
    ```
    GET /api/v1/analytics/summary/1
    ```
    """
    try:
        # Get last 7 days of metrics
        seven_days_ago = datetime.utcnow() - timedelta(days=7)

        metrics = db.query(AnalyticsDailyMetrics).filter(
            AnalyticsDailyMetrics.org_id == org_id,
            AnalyticsDailyMetrics.date >= seven_days_ago.date()
        ).order_by(AnalyticsDailyMetrics.date.desc()).all()

        # Get health score
        health_score = db.query(CustomerHealthScore).filter(
            CustomerHealthScore.org_id == org_id
        ).order_by(CustomerHealthScore.calculated_at.desc()).first()

        # Get top events (last 7 days)
        top_events = db.query(
            AnalyticsEvent.event_name,
            db.func.count(AnalyticsEvent.event_id).label('count')
        ).filter(
            AnalyticsEvent.org_id == org_id,
            AnalyticsEvent.timestamp >= seven_days_ago
        ).group_by(AnalyticsEvent.event_name).order_by(db.desc('count')).limit(10).all()

        return {
            "org_id": org_id,
            "period": "last_7_days",
            "metrics": [
                {
                    "date": m.date,
                    "active_users": m.active_users,
                    "rosters_generated": m.rosters_generated,
                    "shifts_created": m.shifts_created
                }
                for m in metrics
            ],
            "health_score": {
                "overall_score": health_score.overall_score if health_score else None,
                "health_status": health_score.health_status if health_score else None,
                "churn_risk": float(health_score.churn_risk) if health_score else None
            } if health_score else None,
            "top_events": [
                {"event_name": e.event_name, "count": e.count}
                for e in top_events
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics summary: {str(e)}")
