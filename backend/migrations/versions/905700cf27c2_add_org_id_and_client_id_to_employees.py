"""add_org_id_and_client_id_to_employees

Revision ID: 905700cf27c2
Revises: 79ce11b0e76c
Create Date: 2025-11-14 12:20:30.358025

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '905700cf27c2'
down_revision = '79ce11b0e76c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add org_id column (nullable temporarily for migration)
    op.add_column('employees', sa.Column('org_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_employees_org_id'), 'employees', ['org_id'], unique=False)
    op.create_foreign_key('fk_employees_org_id', 'employees', 'organizations', ['org_id'], ['org_id'], ondelete='CASCADE')

    # Set org_id to 1 for all existing employees (default organization)
    op.execute('UPDATE employees SET org_id = 1 WHERE org_id IS NULL')

    # Make org_id non-nullable after setting default values
    op.alter_column('employees', 'org_id', nullable=False)

    # Add assigned_client_id column (nullable - optional assignment)
    op.add_column('employees', sa.Column('assigned_client_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_employees_assigned_client_id'), 'employees', ['assigned_client_id'], unique=False)
    op.create_foreign_key('fk_employees_assigned_client_id', 'employees', 'clients', ['assigned_client_id'], ['client_id'], ondelete='SET NULL')


def downgrade() -> None:
    # Remove foreign keys and columns in reverse order
    op.drop_constraint('fk_employees_assigned_client_id', 'employees', type_='foreignkey')
    op.drop_index(op.f('ix_employees_assigned_client_id'), table_name='employees')
    op.drop_column('employees', 'assigned_client_id')

    op.drop_constraint('fk_employees_org_id', 'employees', type_='foreignkey')
    op.drop_index(op.f('ix_employees_org_id'), table_name='employees')
    op.drop_column('employees', 'org_id')
