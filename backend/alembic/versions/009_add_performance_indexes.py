"""add performance indexes

Revision ID: 009
Revises: 008
Create Date: 2025-11-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add performance indexes to frequently queried columns

    Focus areas:
    1. Shifts table - Heavy roster generation queries
    2. Employees table - Availability and assignment lookups
    3. Analytics tables - Time-based aggregations
    4. Foreign key relationships
    """

    # ===== SHIFTS TABLE INDEXES =====
    # Composite index for shift queries by date range and site
    op.create_index(
        'idx_shifts_date_range_site',
        'shifts',
        ['start_time', 'end_time', 'site_id'],
        unique=False
    )

    # Index for unassigned shifts (frequently queried)
    op.create_index(
        'idx_shifts_assigned_employee',
        'shifts',
        ['assigned_employee_id'],
        unique=False,
        postgresql_where=sa.text('assigned_employee_id IS NULL')
    )

    # Composite index for roster generation (status + dates)
    op.create_index(
        'idx_shifts_status_dates',
        'shifts',
        ['status', 'start_time'],
        unique=False
    )

    # Index for shift type lookups
    op.create_index(
        'idx_shifts_shift_type',
        'shifts',
        ['shift_type_id'],
        unique=False
    )

    # ===== EMPLOYEES TABLE INDEXES =====
    # Index for active employees (frequently filtered)
    op.create_index(
        'idx_employees_status',
        'employees',
        ['status'],
        unique=False
    )

    # Composite index for organization + active status
    op.create_index(
        'idx_employees_org_status',
        'employees',
        ['org_id', 'status'],
        unique=False
    )

    # Index for location-based queries
    op.create_index(
        'idx_employees_location',
        'employees',
        ['latitude', 'longitude'],
        unique=False,
        postgresql_where=sa.text('latitude IS NOT NULL AND longitude IS NOT NULL')
    )

    # ===== AVAILABILITY TABLE INDEXES =====
    # Composite index for availability lookups
    op.create_index(
        'idx_availability_employee_date',
        'availability',
        ['employee_id', 'date'],
        unique=False
    )

    # Index for date range queries
    op.create_index(
        'idx_availability_date_range',
        'availability',
        ['date'],
        unique=False
    )

    # ===== CERTIFICATIONS TABLE INDEXES =====
    # Index for expiring certifications (alerts)
    op.create_index(
        'idx_certifications_expiry',
        'certifications',
        ['expiry_date'],
        unique=False,
        postgresql_where=sa.text('expiry_date IS NOT NULL')
    )

    # Composite index for employee certifications
    op.create_index(
        'idx_certifications_employee_type',
        'certifications',
        ['employee_id', 'cert_type'],
        unique=False
    )

    # ===== SITES TABLE INDEXES =====
    # Index for organization sites
    op.create_index(
        'idx_sites_org',
        'sites',
        ['org_id'],
        unique=False
    )

    # Index for active sites
    op.create_index(
        'idx_sites_active',
        'sites',
        ['is_active'],
        unique=False
    )

    # ===== ANALYTICS_EVENTS TABLE INDEXES =====
    # Composite index for event queries (org + event type + time)
    op.create_index(
        'idx_analytics_events_org_name_time',
        'analytics_events',
        ['org_id', 'event_name', 'timestamp'],
        unique=False
    )

    # Index for user activity tracking
    op.create_index(
        'idx_analytics_events_user_time',
        'analytics_events',
        ['user_id', 'timestamp'],
        unique=False
    )

    # ===== ANALYTICS_DAILY_METRICS TABLE INDEXES =====
    # Composite index for metrics retrieval
    op.create_index(
        'idx_analytics_daily_metrics_org_date',
        'analytics_daily_metrics',
        ['org_id', 'metric_date'],
        unique=False
    )

    # ===== CUSTOMER_HEALTH_SCORES TABLE INDEXES =====
    # Index for at-risk customer queries
    op.create_index(
        'idx_health_scores_churn_risk',
        'customer_health_scores',
        ['churn_risk'],
        unique=False,
        postgresql_where=sa.text('churn_risk > 0.5')
    )

    # Index for health status
    op.create_index(
        'idx_health_scores_status',
        'customer_health_scores',
        ['health_status'],
        unique=False
    )

    # ===== ATTENDANCE TABLE INDEXES =====
    # Composite index for attendance queries
    op.create_index(
        'idx_attendance_shift_employee',
        'attendance',
        ['shift_id', 'employee_id'],
        unique=False
    )

    # Index for attendance date range queries
    op.create_index(
        'idx_attendance_clock_in',
        'attendance',
        ['clock_in_time'],
        unique=False
    )

    # ===== PAYROLL TABLE INDEXES =====
    # Composite index for payroll period queries
    op.create_index(
        'idx_payroll_employee_period',
        'payroll',
        ['employee_id', 'pay_period_start', 'pay_period_end'],
        unique=False
    )

    # Index for organization payroll
    op.create_index(
        'idx_payroll_org_period',
        'payroll',
        ['org_id', 'pay_period_start'],
        unique=False
    )

    print("✅ Performance indexes created successfully!")


def downgrade():
    """Remove performance indexes"""

    # Shifts
    op.drop_index('idx_shifts_date_range_site', table_name='shifts')
    op.drop_index('idx_shifts_assigned_employee', table_name='shifts')
    op.drop_index('idx_shifts_status_dates', table_name='shifts')
    op.drop_index('idx_shifts_shift_type', table_name='shifts')

    # Employees
    op.drop_index('idx_employees_status', table_name='employees')
    op.drop_index('idx_employees_org_status', table_name='employees')
    op.drop_index('idx_employees_location', table_name='employees')

    # Availability
    op.drop_index('idx_availability_employee_date', table_name='availability')
    op.drop_index('idx_availability_date_range', table_name='availability')

    # Certifications
    op.drop_index('idx_certifications_expiry', table_name='certifications')
    op.drop_index('idx_certifications_employee_type', table_name='certifications')

    # Sites
    op.drop_index('idx_sites_org', table_name='sites')
    op.drop_index('idx_sites_active', table_name='sites')

    # Analytics Events
    op.drop_index('idx_analytics_events_org_name_time', table_name='analytics_events')
    op.drop_index('idx_analytics_events_user_time', table_name='analytics_events')

    # Analytics Daily Metrics
    op.drop_index('idx_analytics_daily_metrics_org_date', table_name='analytics_daily_metrics')

    # Customer Health Scores
    op.drop_index('idx_health_scores_churn_risk', table_name='customer_health_scores')
    op.drop_index('idx_health_scores_status', table_name='customer_health_scores')

    # Attendance
    op.drop_index('idx_attendance_shift_employee', table_name='attendance')
    op.drop_index('idx_attendance_clock_in', table_name='attendance')

    # Payroll
    op.drop_index('idx_payroll_employee_period', table_name='payroll')
    op.drop_index('idx_payroll_org_period', table_name='payroll')

    print("Indexes removed")
