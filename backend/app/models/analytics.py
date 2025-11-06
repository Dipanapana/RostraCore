"""
Analytics Models for RostraCore
Comprehensive event tracking, metrics, and customer health scoring
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, DECIMAL, JSON, Text, Index, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID, INET
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class AnalyticsEvent(Base):
    """
    User behavior event tracking
    Captures all critical user actions for product analytics
    """
    __tablename__ = "analytics_events"

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    org_id = Column(Integer, ForeignKey('organizations.org_id'), nullable=True)

    # Event details
    event_name = Column(String(100), nullable=False, index=True)
    event_properties = Column(JSONB, default={})  # Flexible key-value pairs

    # Session tracking
    session_id = Column(UUID(as_uuid=True), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Device context
    user_agent = Column(Text, nullable=True)
    ip_address = Column(INET, nullable=True)
    device_type = Column(String(50), nullable=True)  # mobile/tablet/desktop
    browser = Column(String(50), nullable=True)

    # Performance metrics
    page_load_time_ms = Column(Integer, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    organization = relationship("Organization", foreign_keys=[org_id])

    # Indexes for common queries
    __table_args__ = (
        Index('idx_event_name_timestamp', 'event_name', 'timestamp'),
        Index('idx_org_timestamp', 'org_id', 'timestamp'),
        Index('idx_user_timestamp', 'user_id', 'timestamp'),
    )

    def __repr__(self):
        return f"<AnalyticsEvent(event_id={self.event_id}, event_name={self.event_name}, user_id={self.user_id})>"


class AnalyticsDailyMetrics(Base):
    """
    Aggregated daily metrics per organization
    Pre-computed for fast dashboard loading
    """
    __tablename__ = "analytics_daily_metrics"

    metric_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey('organizations.org_id'), nullable=False)
    date = Column(DateTime, nullable=False)

    # Usage metrics
    active_users = Column(Integer, default=0)
    rosters_generated = Column(Integer, default=0)
    shifts_created = Column(Integer, default=0)
    employees_added = Column(Integer, default=0)

    # Quality metrics
    avg_roster_fill_rate = Column(DECIMAL(5, 2), default=0.0)
    avg_optimization_time_seconds = Column(DECIMAL(8, 2), default=0.0)
    compliance_rate = Column(DECIMAL(5, 2), default=100.0)

    # Financial metrics
    total_cost_scheduled = Column(DECIMAL(12, 2), default=0.0)
    avg_cost_per_shift = Column(DECIMAL(8, 2), default=0.0)

    # Engagement metrics
    sessions_count = Column(Integer, default=0)
    avg_session_duration_minutes = Column(DECIMAL(8, 2), default=0.0)
    features_used_count = Column(Integer, default=0)

    # Relationships
    organization = relationship("Organization", foreign_keys=[org_id])

    # Unique constraint and indexes
    __table_args__ = (
        Index('idx_org_date', 'org_id', 'date', unique=True),
    )

    def __repr__(self):
        return f"<AnalyticsDailyMetrics(org_id={self.org_id}, date={self.date}, rosters={self.rosters_generated})>"


class CustomerHealthScore(Base):
    """
    Customer health scoring for proactive retention
    Composite score based on usage, adoption, satisfaction, and growth
    """
    __tablename__ = "customer_health_scores"

    score_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey('organizations.org_id'), nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Composite score (0-100)
    overall_score = Column(Integer, nullable=False)
    health_status = Column(String(20), nullable=False)  # healthy/at_risk/churning

    # Component scores (0-100 each)
    usage_score = Column(Integer, default=0)  # How often they use it
    adoption_score = Column(Integer, default=0)  # How many features they use
    satisfaction_score = Column(Integer, default=0)  # Based on behavior proxies
    growth_score = Column(Integer, default=0)  # Increasing usage trend

    # Actionable insights
    churn_risk = Column(DECIMAL(3, 2), default=0.0)  # 0-1 probability
    recommendations = Column(JSONB, default=[])  # Suggested actions

    # Relationships
    organization = relationship("Organization", foreign_keys=[org_id])

    # Indexes
    __table_args__ = (
        Index('idx_org_health', 'org_id', 'calculated_at'),
        Index('idx_health_status', 'health_status'),
        Index('idx_churn_risk', 'churn_risk'),
    )

    def __repr__(self):
        return f"<CustomerHealthScore(org_id={self.org_id}, overall={self.overall_score}, status={self.health_status})>"


class FeatureUsageStats(Base):
    """
    Feature usage tracking per organization
    Helps identify which features drive value
    """
    __tablename__ = "feature_usage_stats"

    stat_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey('organizations.org_id'), nullable=False)
    feature_name = Column(String(100), nullable=False)

    # Usage counts
    usage_count = Column(Integer, default=0)
    unique_users_count = Column(Integer, default=0)

    # Timing
    first_used_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)

    # Engagement
    avg_uses_per_week = Column(DECIMAL(8, 2), default=0.0)

    # Relationships
    organization = relationship("Organization", foreign_keys=[org_id])

    # Unique constraint and indexes
    __table_args__ = (
        Index('idx_org_feature', 'org_id', 'feature_name', unique=True),
    )

    def __repr__(self):
        return f"<FeatureUsageStats(org_id={self.org_id}, feature={self.feature_name}, count={self.usage_count})>"


class ABTest(Base):
    """
    A/B testing framework for experimentation
    """
    __tablename__ = "ab_tests"

    test_id = Column(Integer, primary_key=True, autoincrement=True)
    test_name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    # Test period
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)

    # Configuration
    variant_a_config = Column(JSONB, default={})
    variant_b_config = Column(JSONB, default={})

    # Status
    status = Column(String(20), default='draft')  # draft/running/completed/cancelled

    # Results
    variant_a_conversions = Column(Integer, default=0)
    variant_a_exposures = Column(Integer, default=0)
    variant_b_conversions = Column(Integer, default=0)
    variant_b_exposures = Column(Integer, default=0)

    winner = Column(String(10), nullable=True)  # A/B/inconclusive

    def __repr__(self):
        return f"<ABTest(test_name={self.test_name}, status={self.status})>"


class ABTestAssignment(Base):
    """
    User assignments to A/B test variants
    """
    __tablename__ = "ab_test_assignments"

    assignment_id = Column(Integer, primary_key=True, autoincrement=True)
    test_id = Column(Integer, ForeignKey('ab_tests.test_id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    variant = Column(String(1), nullable=False)  # A or B
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    converted = Column(Boolean, default=False)

    # Relationships
    test = relationship("ABTest", foreign_keys=[test_id])
    user = relationship("User", foreign_keys=[user_id])

    # Unique constraint
    __table_args__ = (
        Index('idx_test_user', 'test_id', 'user_id', unique=True),
    )

    def __repr__(self):
        return f"<ABTestAssignment(test_id={self.test_id}, user_id={self.user_id}, variant={self.variant})>"
