"""add analytics tables

Revision ID: 008_add_analytics
Revises: 007_add_shift_groups
Create Date: 2025-11-06

Adds comprehensive analytics infrastructure:
- analytics_events: User behavior event tracking
- analytics_daily_metrics: Aggregated metrics per organization
- customer_health_scores: Proactive retention scoring
- feature_usage_stats: Feature adoption tracking
- ab_tests: A/B testing framework
- ab_test_assignments: User variant assignments
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '008_add_analytics'
down_revision = '007_add_shift_groups'
branch_labels = None
depends_on = None


def upgrade():
    # Create analytics_events table
    op.create_table(
        'analytics_events',
        sa.Column('event_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id'), nullable=True),
        sa.Column('event_name', sa.String(100), nullable=False),
        sa.Column('event_properties', postgresql.JSONB(), server_default='{}'),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('ip_address', postgresql.INET(), nullable=True),
        sa.Column('device_type', sa.String(50), nullable=True),
        sa.Column('browser', sa.String(50), nullable=True),
        sa.Column('page_load_time_ms', sa.Integer(), nullable=True),
    )

    # Create indexes for analytics_events
    op.create_index('idx_event_name', 'analytics_events', ['event_name'])
    op.create_index('idx_event_timestamp', 'analytics_events', ['timestamp'])
    op.create_index('idx_event_name_timestamp', 'analytics_events', ['event_name', 'timestamp'])
    op.create_index('idx_event_org_timestamp', 'analytics_events', ['org_id', 'timestamp'])
    op.create_index('idx_event_user_timestamp', 'analytics_events', ['user_id', 'timestamp'])

    # Create analytics_daily_metrics table
    op.create_table(
        'analytics_daily_metrics',
        sa.Column('metric_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id'), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('active_users', sa.Integer(), server_default='0'),
        sa.Column('rosters_generated', sa.Integer(), server_default='0'),
        sa.Column('shifts_created', sa.Integer(), server_default='0'),
        sa.Column('employees_added', sa.Integer(), server_default='0'),
        sa.Column('avg_roster_fill_rate', sa.DECIMAL(5, 2), server_default='0.0'),
        sa.Column('avg_optimization_time_seconds', sa.DECIMAL(8, 2), server_default='0.0'),
        sa.Column('compliance_rate', sa.DECIMAL(5, 2), server_default='100.0'),
        sa.Column('total_cost_scheduled', sa.DECIMAL(12, 2), server_default='0.0'),
        sa.Column('avg_cost_per_shift', sa.DECIMAL(8, 2), server_default='0.0'),
        sa.Column('sessions_count', sa.Integer(), server_default='0'),
        sa.Column('avg_session_duration_minutes', sa.DECIMAL(8, 2), server_default='0.0'),
        sa.Column('features_used_count', sa.Integer(), server_default='0'),
    )

    # Create unique index for analytics_daily_metrics
    op.create_index('idx_org_date', 'analytics_daily_metrics', ['org_id', 'date'], unique=True)

    # Create customer_health_scores table
    op.create_table(
        'customer_health_scores',
        sa.Column('score_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id'), nullable=False),
        sa.Column('calculated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('overall_score', sa.Integer(), nullable=False),
        sa.Column('health_status', sa.String(20), nullable=False),
        sa.Column('usage_score', sa.Integer(), server_default='0'),
        sa.Column('adoption_score', sa.Integer(), server_default='0'),
        sa.Column('satisfaction_score', sa.Integer(), server_default='0'),
        sa.Column('growth_score', sa.Integer(), server_default='0'),
        sa.Column('churn_risk', sa.DECIMAL(3, 2), server_default='0.0'),
        sa.Column('recommendations', postgresql.JSONB(), server_default='[]'),
    )

    # Create indexes for customer_health_scores
    op.create_index('idx_org_health', 'customer_health_scores', ['org_id', 'calculated_at'])
    op.create_index('idx_health_status', 'customer_health_scores', ['health_status'])
    op.create_index('idx_churn_risk', 'customer_health_scores', ['churn_risk'])

    # Create feature_usage_stats table
    op.create_table(
        'feature_usage_stats',
        sa.Column('stat_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id'), nullable=False),
        sa.Column('feature_name', sa.String(100), nullable=False),
        sa.Column('usage_count', sa.Integer(), server_default='0'),
        sa.Column('unique_users_count', sa.Integer(), server_default='0'),
        sa.Column('first_used_at', sa.DateTime(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('avg_uses_per_week', sa.DECIMAL(8, 2), server_default='0.0'),
    )

    # Create unique index for feature_usage_stats
    op.create_index('idx_org_feature', 'feature_usage_stats', ['org_id', 'feature_name'], unique=True)

    # Create ab_tests table
    op.create_table(
        'ab_tests',
        sa.Column('test_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('test_name', sa.String(100), unique=True, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('variant_a_config', postgresql.JSONB(), server_default='{}'),
        sa.Column('variant_b_config', postgresql.JSONB(), server_default='{}'),
        sa.Column('status', sa.String(20), server_default='draft'),
        sa.Column('variant_a_conversions', sa.Integer(), server_default='0'),
        sa.Column('variant_a_exposures', sa.Integer(), server_default='0'),
        sa.Column('variant_b_conversions', sa.Integer(), server_default='0'),
        sa.Column('variant_b_exposures', sa.Integer(), server_default='0'),
        sa.Column('winner', sa.String(10), nullable=True),
    )

    # Create ab_test_assignments table
    op.create_table(
        'ab_test_assignments',
        sa.Column('assignment_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('test_id', sa.Integer(), sa.ForeignKey('ab_tests.test_id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('variant', sa.String(1), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('converted', sa.Boolean(), server_default='false'),
    )

    # Create unique index for ab_test_assignments
    op.create_index('idx_test_user', 'ab_test_assignments', ['test_id', 'user_id'], unique=True)

    print("✅ Analytics tables created successfully!")
    print("   - analytics_events (event tracking)")
    print("   - analytics_daily_metrics (aggregated metrics)")
    print("   - customer_health_scores (retention scoring)")
    print("   - feature_usage_stats (adoption tracking)")
    print("   - ab_tests (experimentation framework)")
    print("   - ab_test_assignments (variant assignments)")


def downgrade():
    # Drop tables in reverse order (to handle foreign keys)
    op.drop_table('ab_test_assignments')
    op.drop_table('ab_tests')
    op.drop_table('feature_usage_stats')
    op.drop_table('customer_health_scores')
    op.drop_table('analytics_daily_metrics')
    op.drop_table('analytics_events')

    print("✅ Analytics tables dropped successfully!")
