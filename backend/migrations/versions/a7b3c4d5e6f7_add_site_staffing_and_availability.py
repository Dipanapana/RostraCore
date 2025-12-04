"""add_site_staffing_profiles_and_availability_patterns

Revision ID: a7b3c4d5e6f7
Revises: 0e3f2215484d
Create Date: 2025-12-02 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a7b3c4d5e6f7'
down_revision = '0e3f2215484d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create site_staffing_profiles table
    op.create_table(
        'site_staffing_profiles',
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('profile_name', sa.String(length=100), nullable=False),
        sa.Column('period_type', sa.Enum('day', 'night', 'all_day', 'custom', name='periodtype'), nullable=False),
        sa.Column('custom_start_time', sa.Time(), nullable=True),
        sa.Column('custom_end_time', sa.Time(), nullable=True),
        sa.Column('day_type', sa.Enum('weekday', 'weekend', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'public_holiday', 'all', name='daytype'), nullable=False),
        sa.Column('required_staff', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('required_skill', sa.String(length=100), nullable=True),
        sa.Column('required_psira_grade', sa.Enum('A', 'B', 'C', 'D', 'E', 'any', name='psiragraderequirement'), nullable=True),
        sa.Column('requires_firearm', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.org_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['site_id'], ['sites.site_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('profile_id')
    )
    op.create_index('ix_site_staffing_profiles_org_id', 'site_staffing_profiles', ['org_id'], unique=False)
    op.create_index('ix_site_staffing_profiles_site_id', 'site_staffing_profiles', ['site_id'], unique=False)
    op.create_index('ix_site_staffing_profiles_profile_id', 'site_staffing_profiles', ['profile_id'], unique=False)

    # Create availability_patterns table
    op.create_table(
        'availability_patterns',
        sa.Column('pattern_id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('pattern_name', sa.String(length=100), nullable=True),
        sa.Column('effective_from', sa.Date(), nullable=False),
        sa.Column('effective_to', sa.Date(), nullable=True),
        sa.Column('pattern_type', sa.Enum('recurring_weekly', 'date_range', 'exception', name='patterntype'), nullable=False),
        # Monday
        sa.Column('monday_available', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('monday_start', sa.Time(), nullable=True),
        sa.Column('monday_end', sa.Time(), nullable=True),
        # Tuesday
        sa.Column('tuesday_available', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('tuesday_start', sa.Time(), nullable=True),
        sa.Column('tuesday_end', sa.Time(), nullable=True),
        # Wednesday
        sa.Column('wednesday_available', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('wednesday_start', sa.Time(), nullable=True),
        sa.Column('wednesday_end', sa.Time(), nullable=True),
        # Thursday
        sa.Column('thursday_available', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('thursday_start', sa.Time(), nullable=True),
        sa.Column('thursday_end', sa.Time(), nullable=True),
        # Friday
        sa.Column('friday_available', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('friday_start', sa.Time(), nullable=True),
        sa.Column('friday_end', sa.Time(), nullable=True),
        # Saturday
        sa.Column('saturday_available', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('saturday_start', sa.Time(), nullable=True),
        sa.Column('saturday_end', sa.Time(), nullable=True),
        # Sunday
        sa.Column('sunday_available', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('sunday_start', sa.Time(), nullable=True),
        sa.Column('sunday_end', sa.Time(), nullable=True),
        # Date range time windows
        sa.Column('range_start_time', sa.Time(), nullable=True),
        sa.Column('range_end_time', sa.Time(), nullable=True),
        # Priority and status
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.org_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.employee_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('pattern_id')
    )
    op.create_index('ix_availability_patterns_org_id', 'availability_patterns', ['org_id'], unique=False)
    op.create_index('ix_availability_patterns_employee_id', 'availability_patterns', ['employee_id'], unique=False)
    op.create_index('ix_availability_patterns_pattern_id', 'availability_patterns', ['pattern_id'], unique=False)


def downgrade() -> None:
    # Drop availability_patterns table
    op.drop_index('ix_availability_patterns_pattern_id', table_name='availability_patterns')
    op.drop_index('ix_availability_patterns_employee_id', table_name='availability_patterns')
    op.drop_index('ix_availability_patterns_org_id', table_name='availability_patterns')
    op.drop_table('availability_patterns')

    # Drop site_staffing_profiles table
    op.drop_index('ix_site_staffing_profiles_profile_id', table_name='site_staffing_profiles')
    op.drop_index('ix_site_staffing_profiles_site_id', table_name='site_staffing_profiles')
    op.drop_index('ix_site_staffing_profiles_org_id', table_name='site_staffing_profiles')
    op.drop_table('site_staffing_profiles')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS patterntype')
    op.execute('DROP TYPE IF EXISTS psiragraderequirement')
    op.execute('DROP TYPE IF EXISTS daytype')
    op.execute('DROP TYPE IF EXISTS periodtype')
