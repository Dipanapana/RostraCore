"""add_roster_preferences_and_emergency_shifts

Revision ID: 64924d9129a8
Revises: d46efa506ca1
Create Date: 2025-11-26 09:31:48.598663

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '64924d9129a8'
down_revision = 'd46efa506ca1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create roster_preferences table
    op.create_table(
        'roster_preferences',
        sa.Column('preference_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('scope', sa.Enum('ORGANIZATION', 'CLIENT', 'SITE', 'EMPLOYEE', name='constraintscope'), nullable=False, index=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('clients.client_id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('site_id', sa.Integer(), sa.ForeignKey('sites.site_id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='CASCADE'), nullable=True, index=True),

        # Constraint enforcement levels
        sa.Column('psira_compliance_level', sa.Enum('HARD', 'SOFT', 'WARNING', 'DISABLED', name='constraintlevel'), default='WARNING'),
        sa.Column('skill_matching_level', sa.Enum('HARD', 'SOFT', 'WARNING', 'DISABLED', name='constraintlevel'), default='HARD'),
        sa.Column('availability_check_level', sa.Enum('HARD', 'SOFT', 'WARNING', 'DISABLED', name='constraintlevel'), default='HARD'),
        sa.Column('client_assignment_level', sa.Enum('HARD', 'SOFT', 'WARNING', 'DISABLED', name='constraintlevel'), default='HARD'),

        # BCEA compliance settings
        sa.Column('max_hours_week', sa.Integer(), default=48),
        sa.Column('max_hours_week_level', sa.Enum('HARD', 'SOFT', 'WARNING', 'DISABLED', name='constraintlevel'), default='HARD'),
        sa.Column('min_rest_hours', sa.Integer(), default=8),
        sa.Column('min_rest_hours_level', sa.Enum('HARD', 'SOFT', 'WARNING', 'DISABLED', name='constraintlevel'), default='HARD'),
        sa.Column('max_consecutive_days', sa.Integer(), default=6),
        sa.Column('max_consecutive_days_level', sa.Enum('HARD', 'SOFT', 'WARNING', 'DISABLED', name='constraintlevel'), default='HARD'),
        sa.Column('max_consecutive_nights', sa.Integer(), default=3),
        sa.Column('max_consecutive_nights_level', sa.Enum('HARD', 'SOFT', 'WARNING', 'DISABLED', name='constraintlevel'), default='SOFT'),

        # Soft constraints
        sa.Column('fairness_weight', sa.Float(), default=0.15),
        sa.Column('max_distance_km', sa.Float(), default=50.0),
        sa.Column('max_distance_level', sa.Enum('HARD', 'SOFT', 'WARNING', 'DISABLED', name='constraintlevel'), default='SOFT'),
        sa.Column('prefer_client_experience', sa.Boolean(), default=True),
        sa.Column('prefer_site_experience', sa.Boolean(), default=True),

        # Emergency mode
        sa.Column('allow_emergency_overrides', sa.Boolean(), default=True),
        sa.Column('emergency_relaxed_constraints', sa.JSON(), default=list),
        sa.Column('shift_pattern_preferences', sa.JSON(), nullable=True),
        sa.Column('notes', sa.String(500), nullable=True)
    )

    # Create emergency_shift_requests table
    op.create_table(
        'emergency_shift_requests',
        sa.Column('request_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('original_shift_id', sa.Integer(), sa.ForeignKey('shifts.shift_id', ondelete='CASCADE'), nullable=False),
        sa.Column('original_employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='SET NULL'), nullable=True),
        sa.Column('replacement_employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='SET NULL'), nullable=True),
        sa.Column('replacement_shift_assignment_id', sa.Integer(), sa.ForeignKey('shift_assignments.assignment_id', ondelete='SET NULL'), nullable=True),
        sa.Column('reason', sa.String(500), nullable=False),
        sa.Column('requested_by', sa.Integer(), sa.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True),
        sa.Column('requested_at', sa.Integer(), nullable=False),
        sa.Column('violated_constraints', sa.JSON(), default=list),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('resolved_at', sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    # Drop tables
    op.drop_table('emergency_shift_requests')
    op.drop_table('roster_preferences')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS constraintlevel CASCADE")
    op.execute("DROP TYPE IF EXISTS constraintscope CASCADE")
