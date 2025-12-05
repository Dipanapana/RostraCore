"""Add employee pattern assignment fields.

Revision ID: h5i6j7k8l9m0
Revises: g4h5i6j7k8l9
Create Date: 2025-12-05

Adds fields to employees table for shift pattern assignment:
- shift_pattern_id: FK to shift_pattern_templates
- rotation_group: A, B, C, D for rotation position
- pattern_start_date: When their rotation cycle starts
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'h5i6j7k8l9m0'
down_revision = 'g4h5i6j7k8l9'
branch_labels = None
depends_on = None


def upgrade():
    """Add pattern assignment fields to employees table."""

    # Add shift_pattern_id column with FK
    op.add_column(
        'employees',
        sa.Column('shift_pattern_id', sa.Integer(), nullable=True)
    )

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_employees_shift_pattern',
        'employees',
        'shift_pattern_templates',
        ['shift_pattern_id'],
        ['template_id'],
        ondelete='SET NULL'
    )

    # Add rotation_group column (A, B, C, D)
    op.add_column(
        'employees',
        sa.Column('rotation_group', sa.String(1), nullable=True)
    )

    # Add pattern_start_date column
    op.add_column(
        'employees',
        sa.Column('pattern_start_date', sa.Date(), nullable=True)
    )

    # Add index for efficient queries
    op.create_index(
        'ix_employees_shift_pattern',
        'employees',
        ['shift_pattern_id', 'rotation_group']
    )


def downgrade():
    """Remove pattern assignment fields from employees table."""

    # Drop index
    op.drop_index('ix_employees_shift_pattern', table_name='employees')

    # Drop foreign key
    op.drop_constraint('fk_employees_shift_pattern', 'employees', type_='foreignkey')

    # Drop columns
    op.drop_column('employees', 'pattern_start_date')
    op.drop_column('employees', 'rotation_group')
    op.drop_column('employees', 'shift_pattern_id')
