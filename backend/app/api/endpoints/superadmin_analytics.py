"""Superadmin analytics endpoints - Platform-wide metrics."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db
from app.services.superadmin_analytics_service import SuperadminAnalyticsService

router = APIRouter()


@router.get("/overview", response_model=Dict[str, Any])
async def get_platform_overview(db: Session = Depends(get_db)):
    """
    Get platform overview for superadmin dashboard.

    Returns:
        - Total organizations (active/inactive)
        - Total guards (verified/available)
        - Total jobs (active/premium)
        - Total applications and hires
    """
    return SuperadminAnalyticsService.get_platform_overview(db)


@router.get("/revenue", response_model=Dict[str, Any])
async def get_revenue_summary(
    period_days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get revenue summary across all streams.

    Query params:
        - period_days: Number of days to look back (default 30)

    Returns:
        - Total revenue
        - Revenue by stream (CV, commissions, premium jobs, bulk packages)
        - Counts and averages
    """
    return SuperadminAnalyticsService.get_revenue_summary(db, period_days)


@router.get("/commissions", response_model=Dict[str, Any])
async def get_commission_analytics(db: Session = Depends(get_db)):
    """
    Get marketplace commission analytics.

    Returns:
        - Total commissions created
        - Pending/in-progress/paid breakdown
        - Waived commissions (bulk package sponsorship)
        - Collection rate percentage
    """
    return SuperadminAnalyticsService.get_commission_analytics(db)


@router.get("/cv-stats", response_model=Dict[str, Any])
async def get_cv_generation_stats(db: Session = Depends(get_db)):
    """
    Get CV generation statistics.

    Returns:
        - Total purchases and completions
        - Total CVs generated
        - Template popularity breakdown
        - Total downloads
        - Average CVs per purchase
    """
    return SuperadminAnalyticsService.get_cv_generation_stats(db)


@router.get("/bulk-packages", response_model=Dict[str, Any])
async def get_bulk_package_stats(db: Session = Depends(get_db)):
    """
    Get bulk package utilization statistics.

    Returns:
        - Active packages by type (starter/professional/enterprise)
        - Quota utilization percentages
        - Total hires sponsored
    """
    return SuperadminAnalyticsService.get_bulk_package_stats(db)


@router.get("/recent-activity", response_model=Dict[str, Any])
async def get_recent_activity(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get recent platform activity for dashboard feed.

    Query params:
        - limit: Number of items per category (default 10)

    Returns:
        - Recent hires
        - Recent CV purchases
        - Recent premium job upgrades
    """
    return SuperadminAnalyticsService.get_recent_activity(db, limit)


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_complete_dashboard(
    revenue_period_days: int = 30,
    activity_limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get complete superadmin dashboard data in one call.

    Combines all analytics endpoints for dashboard display.
    """
    return {
        "overview": SuperadminAnalyticsService.get_platform_overview(db),
        "revenue": SuperadminAnalyticsService.get_revenue_summary(db, revenue_period_days),
        "commissions": SuperadminAnalyticsService.get_commission_analytics(db),
        "cv_stats": SuperadminAnalyticsService.get_cv_generation_stats(db),
        "bulk_packages": SuperadminAnalyticsService.get_bulk_package_stats(db),
        "recent_activity": SuperadminAnalyticsService.get_recent_activity(db, activity_limit)
    }
