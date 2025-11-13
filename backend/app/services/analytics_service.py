"""
Analytics Service for RostraCore
Handles event tracking, metrics calculation, and customer health scoring
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import uuid

from app.models.analytics import (
    AnalyticsEvent,
    AnalyticsDailyMetrics,
    CustomerHealthScore,
    FeatureUsageStats
)


class AnalyticsService:
    """
    Service for tracking user behavior and calculating metrics
    """

    @staticmethod
    def track_event(
        db: Session,
        event_name: str,
        user_id: Optional[int] = None,
        org_id: Optional[int] = None,
        session_id: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_type: Optional[str] = None,
        browser: Optional[str] = None,
        page_load_time_ms: Optional[int] = None
    ) -> AnalyticsEvent:
        """
        Track a user behavior event

        Args:
            db: Database session
            event_name: Name of the event (e.g., "user_signup_completed")
            user_id: ID of the user (optional for anonymous events)
            org_id: ID of the organization (optional)
            session_id: Session identifier
            properties: Custom event properties (dict)
            user_agent: Browser user agent string
            ip_address: User's IP address
            device_type: Device type (mobile/tablet/desktop)
            browser: Browser name
            page_load_time_ms: Page load time in milliseconds

        Returns:
            Created AnalyticsEvent instance
        """
        event = AnalyticsEvent(
            event_id=uuid.uuid4(),
            user_id=user_id,
            org_id=org_id,
            event_name=event_name,
            event_properties=properties or {},
            session_id=uuid.UUID(session_id) if session_id else None,
            timestamp=datetime.utcnow(),
            user_agent=user_agent,
            ip_address=ip_address,
            device_type=device_type,
            browser=browser,
            page_load_time_ms=page_load_time_ms
        )

        db.add(event)
        db.commit()
        db.refresh(event)

        return event

    @staticmethod
    def track_feature_usage(
        db: Session,
        org_id: int,
        feature_name: str,
        user_id: int
    ) -> FeatureUsageStats:
        """
        Track feature usage for an organization

        Args:
            db: Database session
            org_id: Organization ID
            feature_name: Name of the feature
            user_id: User ID

        Returns:
            Updated FeatureUsageStats instance
        """
        # Get or create feature usage record
        stats = db.query(FeatureUsageStats).filter(
            FeatureUsageStats.org_id == org_id,
            FeatureUsageStats.feature_name == feature_name
        ).first()

        if not stats:
            stats = FeatureUsageStats(
                org_id=org_id,
                feature_name=feature_name,
                usage_count=0,
                unique_users_count=0,
                first_used_at=datetime.utcnow()
            )
            db.add(stats)

        # Increment usage count
        stats.usage_count += 1
        stats.last_used_at = datetime.utcnow()

        # Track unique users (simplified - in production, use a Set or separate table)
        # For now, we'll just increment on first use

        db.commit()
        db.refresh(stats)

        return stats

    @staticmethod
    def calculate_daily_metrics(
        db: Session,
        org_id: int,
        date: datetime
    ) -> AnalyticsDailyMetrics:
        """
        Calculate and store daily metrics for an organization

        Args:
            db: Database session
            org_id: Organization ID
            date: Date to calculate metrics for

        Returns:
            AnalyticsDailyMetrics instance
        """
        # Get or create metrics record
        metrics = db.query(AnalyticsDailyMetrics).filter(
            AnalyticsDailyMetrics.org_id == org_id,
            AnalyticsDailyMetrics.date == date.date()
        ).first()

        if not metrics:
            metrics = AnalyticsDailyMetrics(
                org_id=org_id,
                date=date.date()
            )
            db.add(metrics)

        # Calculate metrics from events
        start_of_day = datetime.combine(date.date(), datetime.min.time())
        end_of_day = datetime.combine(date.date(), datetime.max.time())

        # Active users (unique users who had events today)
        active_users_count = db.query(AnalyticsEvent.user_id).filter(
            AnalyticsEvent.org_id == org_id,
            AnalyticsEvent.timestamp >= start_of_day,
            AnalyticsEvent.timestamp <= end_of_day,
            AnalyticsEvent.user_id.isnot(None)
        ).distinct().count()

        metrics.active_users = active_users_count

        # Rosters generated (count roster_generated events)
        rosters_generated = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.org_id == org_id,
            AnalyticsEvent.event_name == 'roster_generated',
            AnalyticsEvent.timestamp >= start_of_day,
            AnalyticsEvent.timestamp <= end_of_day
        ).count()

        metrics.rosters_generated = rosters_generated

        # Shifts created
        shifts_created = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.org_id == org_id,
            AnalyticsEvent.event_name == 'shift_created',
            AnalyticsEvent.timestamp >= start_of_day,
            AnalyticsEvent.timestamp <= end_of_day
        ).count()

        metrics.shifts_created = shifts_created

        # Employees added
        employees_added = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.org_id == org_id,
            AnalyticsEvent.event_name == 'employee_added',
            AnalyticsEvent.timestamp >= start_of_day,
            AnalyticsEvent.timestamp <= end_of_day
        ).count()

        metrics.employees_added = employees_added

        # TODO: Calculate other metrics from database (fill rate, compliance, costs, etc.)
        # This would require joining with rosters, shifts, etc.

        db.commit()
        db.refresh(metrics)

        return metrics

    @staticmethod
    def calculate_customer_health_score(
        db: Session,
        org_id: int
    ) -> CustomerHealthScore:
        """
        Calculate customer health score for an organization

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            CustomerHealthScore instance
        """
        # Get recent activity (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        # Calculate usage score (0-100)
        # Based on frequency of key actions
        roster_events = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.org_id == org_id,
            AnalyticsEvent.event_name == 'roster_generated',
            AnalyticsEvent.timestamp >= thirty_days_ago
        ).count()

        # Normalize to 0-100 (assuming 12 rosters/month = 100%)
        usage_score = min(100, int((roster_events / 12) * 100))

        # Calculate adoption score (0-100)
        # Based on feature diversity
        unique_features = db.query(FeatureUsageStats.feature_name).filter(
            FeatureUsageStats.org_id == org_id,
            FeatureUsageStats.last_used_at >= thirty_days_ago
        ).distinct().count()

        # Normalize to 0-100 (assuming 10 features = 100%)
        adoption_score = min(100, int((unique_features / 10) * 100))

        # Calculate satisfaction score (0-100)
        # Based on behavior proxies (errors, support requests, manual overrides)
        error_events = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.org_id == org_id,
            AnalyticsEvent.event_name == 'error_encountered',
            AnalyticsEvent.timestamp >= thirty_days_ago
        ).count()

        # Inverse relationship (fewer errors = higher satisfaction)
        satisfaction_score = max(0, 100 - (error_events * 5))

        # Calculate growth score (0-100)
        # Compare current 15 days vs. previous 15 days
        fifteen_days_ago = datetime.utcnow() - timedelta(days=15)

        recent_events = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.org_id == org_id,
            AnalyticsEvent.timestamp >= fifteen_days_ago
        ).count()

        older_events = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.org_id == org_id,
            AnalyticsEvent.timestamp >= thirty_days_ago,
            AnalyticsEvent.timestamp < fifteen_days_ago
        ).count()

        if older_events > 0:
            growth_rate = ((recent_events - older_events) / older_events) * 100
            growth_score = min(100, max(0, 50 + int(growth_rate)))  # Normalize around 50
        else:
            growth_score = 50  # Neutral if no historical data

        # Calculate overall score (weighted average)
        overall_score = int(
            (usage_score * 0.4) +       # 40% weight on usage
            (adoption_score * 0.3) +    # 30% weight on adoption
            (satisfaction_score * 0.2) + # 20% weight on satisfaction
            (growth_score * 0.1)        # 10% weight on growth
        )

        # Determine health status
        if overall_score >= 70:
            health_status = "healthy"
            churn_risk = 0.1
        elif overall_score >= 50:
            health_status = "at_risk"
            churn_risk = 0.4
        else:
            health_status = "churning"
            churn_risk = 0.8

        # Generate recommendations
        recommendations = []
        if usage_score < 50:
            recommendations.append({
                "issue": "Low usage frequency",
                "action": "Reach out to understand barriers to adoption"
            })
        if adoption_score < 50:
            recommendations.append({
                "issue": "Limited feature adoption",
                "action": "Provide feature training or onboarding"
            })
        if satisfaction_score < 70:
            recommendations.append({
                "issue": "High error rate or issues",
                "action": "Proactive support outreach"
            })
        if growth_score < 40:
            recommendations.append({
                "issue": "Declining usage trend",
                "action": "Urgent intervention required"
            })

        # Create or update health score
        health_score = CustomerHealthScore(
            org_id=org_id,
            calculated_at=datetime.utcnow(),
            overall_score=overall_score,
            health_status=health_status,
            usage_score=usage_score,
            adoption_score=adoption_score,
            satisfaction_score=satisfaction_score,
            growth_score=growth_score,
            churn_risk=churn_risk,
            recommendations=recommendations
        )

        db.add(health_score)
        db.commit()
        db.refresh(health_score)

        return health_score

    @staticmethod
    def get_events_for_org(
        db: Session,
        org_id: int,
        event_name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[AnalyticsEvent]:
        """
        Get events for an organization with optional filters

        Args:
            db: Database session
            org_id: Organization ID
            event_name: Filter by event name (optional)
            start_date: Filter by start date (optional)
            end_date: Filter by end date (optional)
            limit: Maximum number of events to return

        Returns:
            List of AnalyticsEvent instances
        """
        query = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.org_id == org_id
        )

        if event_name:
            query = query.filter(AnalyticsEvent.event_name == event_name)

        if start_date:
            query = query.filter(AnalyticsEvent.timestamp >= start_date)

        if end_date:
            query = query.filter(AnalyticsEvent.timestamp <= end_date)

        query = query.order_by(AnalyticsEvent.timestamp.desc()).limit(limit)

        return query.all()


# Convenience function for quick event tracking
def track(
    db: Session,
    event_name: str,
    user_id: Optional[int] = None,
    org_id: Optional[int] = None,
    **properties
) -> AnalyticsEvent:
    """
    Quick event tracking helper

    Usage:
        track(db, "roster_generated", user_id=1, org_id=1, fill_rate=98, duration=8)
    """
    return AnalyticsService.track_event(
        db=db,
        event_name=event_name,
        user_id=user_id,
        org_id=org_id,
        properties=properties
    )
