"""add_multi_guard_shift_support

Revision ID: 9959f537859a
Revises: 2ad6664712f2
Create Date: 2025-11-17 13:30:32.757412

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9959f537859a'
down_revision = '2ad6664712f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add multi-guard shift support - Phase 2 of MVP."""

    # Step 1: Add required_staff column to shifts table
    op.add_column('shifts', sa.Column('required_staff', sa.Integer(), nullable=True, server_default='1'))

    # Step 2: Add status column to shift_assignments table for workflow
    op.add_column('shift_assignments', sa.Column('status', sa.String(20), nullable=True, server_default='pending'))

    # Step 3: Add unique constraint to prevent duplicate assignments
    op.create_unique_constraint(
        'uq_shift_employee_assignment',
        'shift_assignments',
        ['shift_id', 'employee_id']
    )

    # Step 4: Migrate existing data from assigned_employee_id to shift_assignments
    # This will be done with a data migration script after this

    # Step 5: Drop assigned_employee_id column from shifts table
    # First, drop the foreign key constraint
    op.drop_constraint('shifts_assigned_employee_id_fkey', 'shifts', type_='foreignkey')
    # Then drop the column
    op.drop_column('shifts', 'assigned_employee_id')

    # Step 6: Update default value for required_staff to NOT NULL
    op.alter_column('shifts', 'required_staff',
                    existing_type=sa.Integer(),
                    nullable=False,
                    server_default='1')

    # Step 7: Update status column to NOT NULL
    op.alter_column('shift_assignments', 'status',
                    existing_type=sa.String(20),
                    nullable=False,
                    server_default='pending')


def downgrade() -> None:
    """Revert multi-guard shift changes."""

    # Reverse the changes
    op.add_column('shifts', sa.Column('assigned_employee_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'shifts_assigned_employee_id_fkey',
        'shifts', 'employees',
        ['assigned_employee_id'], ['employee_id']
    )

    op.drop_constraint('uq_shift_employee_assignment', 'shift_assignments', type_='unique')
    op.drop_column('shift_assignments', 'status')
    op.drop_column('shifts', 'required_staff')
