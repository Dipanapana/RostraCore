"""Add shift pattern templates for rotation scheduling.

Revision ID: f3g4h5i6j7k8
Revises: e2f3g4h5i6j7
Create Date: 2025-12-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f3g4h5i6j7k8'
down_revision = 'e2f3g4h5i6j7'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create shift_pattern_templates table for managing rotation patterns.

    Supports common SA security industry patterns:
    - 4-on-4-off (most common for 24/7 sites)
    - 2-2-3 Continental
    - 6-on-3-off
    - 5-on-2-off (standard weekday)
    - Custom patterns

    Includes BCEA compliance validation fields.
    """

    # Create shift pattern type enum (different from availability patterntype)
    shift_pattern_type_enum = sa.Enum(
        '4_on_4_off', '2_2_3', '6_on_3_off', '5_on_2_off', 'custom',
        name='shiftpatterntype'
    )

    op.create_table(
        'shift_pattern_templates',
        sa.Column('template_id', sa.Integer(), primary_key=True, index=True),

        # Multi-tenancy
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'),
                  nullable=False, index=True),

        # Basic info
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('pattern_type', shift_pattern_type_enum, nullable=False, server_default='4_on_4_off'),

        # Shift duration (typically 8 or 12 hours)
        sa.Column('shift_duration_hours', sa.Integer(), nullable=False, server_default='12'),

        # Rotation configuration
        sa.Column('days_on', sa.Integer(), nullable=False, server_default='4'),
        sa.Column('nights_on', sa.Integer(), nullable=False, server_default='4'),
        sa.Column('rest_after_days', sa.Integer(), nullable=False, server_default='4'),
        sa.Column('rest_after_nights', sa.Integer(), nullable=False, server_default='4'),

        # Shift timing
        sa.Column('day_shift_start', sa.Time(), nullable=False),
        sa.Column('day_shift_end', sa.Time(), nullable=False),
        sa.Column('night_shift_start', sa.Time(), nullable=False),
        sa.Column('night_shift_end', sa.Time(), nullable=False),

        # BCEA Compliance constraints
        sa.Column('max_consecutive_days', sa.Integer(), nullable=False, server_default='6'),
        sa.Column('max_consecutive_nights', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('min_rest_between_shifts', sa.Integer(), nullable=False, server_default='12'),
        sa.Column('max_hours_per_week', sa.Integer(), nullable=False, server_default='45'),
        sa.Column('max_hours_per_month', sa.Integer(), nullable=True),

        # Meal break configuration
        sa.Column('include_meal_break', sa.Boolean(), server_default='true'),
        sa.Column('meal_break_duration_minutes', sa.Integer(), server_default='60'),

        # Usage settings
        sa.Column('is_default', sa.Boolean(), server_default='false'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # Create index for org lookups
    op.create_index('ix_shift_pattern_templates_org_active', 'shift_pattern_templates',
                    ['org_id', 'is_active'])


def downgrade():
    """Remove shift_pattern_templates table."""
    op.drop_index('ix_shift_pattern_templates_org_active', table_name='shift_pattern_templates')
    op.drop_table('shift_pattern_templates')

    # Drop enum type (using shiftpatterntype to avoid conflict with availability_pattern's patterntype)
    sa.Enum(name='shiftpatterntype').drop(op.get_bind(), checkfirst=True)
