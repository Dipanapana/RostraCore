"""Add multi-guard configuration to sites

Revision ID: add_multi_guard_config
Revises: add_psira_grades
Create Date: 2025-11-05 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_multi_guard_config'
down_revision = 'add_psira_grades'
branch_labels = None
depends_on = None


def upgrade():
    # Add multi-guard staffing configuration
    op.add_column('sites', sa.Column('min_guards_per_shift', sa.Integer(), server_default='1', nullable=False))
    op.add_column('sites', sa.Column('max_guards_per_shift', sa.Integer(), server_default='1', nullable=False))

    # Supervisor requirements
    op.add_column('sites', sa.Column('requires_supervisor', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('sites', sa.Column('supervisor_ratio', sa.Integer(), server_default='5', nullable=False))
    # supervisor_ratio: 1 supervisor per X guards (e.g., 5 = 1:5 ratio)

    # PSIRA grade requirements (PostgreSQL array)
    op.add_column('sites', sa.Column('required_psira_grades', postgresql.ARRAY(sa.String(1)), nullable=True))
    # Example: ['B', 'C', 'D'] means site needs mix of these grades

    # Armed response requirements
    op.add_column('sites', sa.Column('requires_armed', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('sites', sa.Column('min_armed_guards', sa.Integer(), server_default='0', nullable=False))

    # Site type and facilities
    op.add_column('sites', sa.Column('site_type', sa.String(50), nullable=True))
    # site_type: retail, industrial, residential, commercial, etc.

    op.add_column('sites', sa.Column('has_control_room', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('sites', sa.Column('has_panic_button', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('sites', sa.Column('has_access_control', sa.Boolean(), server_default='false', nullable=False))

    # Risk level (affects staffing requirements)
    op.add_column('sites', sa.Column('risk_level', sa.String(20), nullable=True))
    # risk_level: low, medium, high, critical

    # Create check constraints
    op.create_check_constraint(
        'ck_sites_guard_count',
        'sites',
        'min_guards_per_shift <= max_guards_per_shift'
    )

    op.create_check_constraint(
        'ck_sites_risk_level',
        'sites',
        "risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'critical')"
    )

    # Backfill existing sites with default values based on min_staff
    op.execute("""
        UPDATE sites
        SET min_guards_per_shift = COALESCE(min_staff, 1),
            max_guards_per_shift = COALESCE(min_staff, 1),
            site_type = 'commercial',
            risk_level = 'medium'
        WHERE min_guards_per_shift IS NULL
    """)


def downgrade():
    op.drop_constraint('ck_sites_risk_level', 'sites', type_='check')
    op.drop_constraint('ck_sites_guard_count', 'sites', type_='check')

    op.drop_column('sites', 'risk_level')
    op.drop_column('sites', 'has_access_control')
    op.drop_column('sites', 'has_panic_button')
    op.drop_column('sites', 'has_control_room')
    op.drop_column('sites', 'site_type')
    op.drop_column('sites', 'min_armed_guards')
    op.drop_column('sites', 'requires_armed')
    op.drop_column('sites', 'required_psira_grades')
    op.drop_column('sites', 'supervisor_ratio')
    op.drop_column('sites', 'requires_supervisor')
    op.drop_column('sites', 'max_guards_per_shift')
    op.drop_column('sites', 'min_guards_per_shift')
