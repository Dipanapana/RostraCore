"""add_assigned_client_id_to_employees

Revision ID: 2221f13b3761
Revises: 64924d9129a8
Create Date: 2025-11-26 13:36:52.815573

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2221f13b3761'
down_revision = '64924d9129a8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add assigned_client_id column to employees table
    op.add_column('employees', sa.Column('assigned_client_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_employees_assigned_client_id'), 'employees', ['assigned_client_id'], unique=False)
    op.create_foreign_key('fk_employees_assigned_client_id', 'employees', 'clients', ['assigned_client_id'], ['client_id'], ondelete='SET NULL')


def downgrade() -> None:
    # Remove assigned_client_id column from employees table
    op.drop_constraint('fk_employees_assigned_client_id', 'employees', type_='foreignkey')
    op.drop_index(op.f('ix_employees_assigned_client_id'), table_name='employees')
    op.drop_column('employees', 'assigned_client_id')
