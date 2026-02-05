"""Add biometric and attendance models.

Revision ID: b3c4d5e6f7g8
Revises: a252123c5aa5
Create Date: 2026-02-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

# revision identifiers, used by Alembic.
revision = 'b3c4d5e6f7g8'
down_revision = 'a252123c5aa5'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create biometric and attendance tables with pgcrypto extension.
    """

    # Enable pgcrypto extension for encrypted biometric templates
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # ===== BIOMETRIC TEMPLATES =====
    op.create_table(
        'biometric_templates',
        sa.Column('template_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('template_type', sa.String(50), nullable=False),
        sa.Column('encrypted_template', sa.LargeBinary(), nullable=False),
        sa.Column('embedding_dimensions', sa.Integer(), nullable=False),
        sa.Column('quality_score', sa.Numeric(5, 2), nullable=True),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('enrolled_by', sa.Integer(), sa.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.UniqueConstraint('employee_id', 'template_type', name='uq_employee_template_type')
    )

    # ===== ENROLLMENT SESSIONS =====
    op.create_table(
        'enrollment_sessions',
        sa.Column('session_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('initiated_by', sa.Integer(), sa.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('template_type', sa.String(50), nullable=False),
        sa.Column('attempts', sa.Integer(), server_default='0'),
        sa.Column('last_attempt_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('quality_feedback', sa.Text(), nullable=True),
        sa.Column('grace_period_end', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
    )

    # ===== VERIFICATION ATTEMPTS =====
    op.create_table(
        'verification_attempts',
        sa.Column('attempt_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('template_type', sa.String(50), nullable=False),
        sa.Column('confidence', sa.Numeric(5, 2), nullable=False),
        sa.Column('threshold_used', sa.Numeric(5, 2), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('requires_hr_review', sa.Boolean(), server_default='false'),
        sa.Column('gps_lat', sa.Numeric(10, 7), nullable=True),
        sa.Column('gps_lng', sa.Numeric(10, 7), nullable=True),
        sa.Column('gps_accuracy', sa.Numeric(8, 2), nullable=True),
        sa.Column('device_type', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # Composite index for adaptive threshold queries
    op.create_index(
        'ix_verification_employee_created',
        'verification_attempts',
        ['employee_id', 'created_at']
    )

    # ===== ATTENDANCE RECORDS =====
    op.create_table(
        'attendance_records',
        sa.Column('record_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('site_id', sa.Integer(), sa.ForeignKey('sites.site_id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('clock_in_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('clock_out_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verification_method', sa.String(30), nullable=False),
        sa.Column('biometric_confidence', sa.Numeric(5, 2), nullable=True),
        sa.Column('gps_lat', sa.Numeric(10, 7), nullable=True),
        sa.Column('gps_lng', sa.Numeric(10, 7), nullable=True),
        sa.Column('gps_accuracy', sa.Numeric(8, 2), nullable=True),
        sa.Column('gps_validated', sa.Boolean(), server_default='false'),
        sa.Column('device_type', sa.String(50), nullable=True),
        sa.Column('requires_hr_review', sa.Boolean(), server_default='false'),
        sa.Column('hr_reviewed_by', sa.Integer(), sa.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True),
        sa.Column('hr_reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
    )

    # ===== SITE GEOFENCES =====
    op.create_table(
        'site_geofences',
        sa.Column('geofence_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('site_id', sa.Integer(), sa.ForeignKey('sites.site_id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('center_lat', sa.Numeric(10, 7), nullable=False),
        sa.Column('center_lng', sa.Numeric(10, 7), nullable=False),
        sa.Column('radius_meters', sa.Integer(), nullable=False, server_default='200'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
    )


def downgrade():
    """
    Drop all biometric and attendance tables.
    """
    op.drop_table('site_geofences')
    op.drop_table('attendance_records')
    op.drop_index('ix_verification_employee_created', 'verification_attempts')
    op.drop_table('verification_attempts')
    op.drop_table('enrollment_sessions')
    op.drop_table('biometric_templates')
    # Note: Not dropping pgcrypto extension as other tables might use it
