"""add_banking_and_tax_fields_to_employees

Revision ID: 53bbaf1e3d54
Revises: h5i6j7k8l9m0
Create Date: 2025-12-09 12:01:45.880277

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '53bbaf1e3d54'
down_revision = 'h5i6j7k8l9m0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add banking fields
    op.add_column('employees', sa.Column('bank_name', sa.String(100), nullable=True))
    op.add_column('employees', sa.Column('account_number', sa.String(50), nullable=True))
    op.add_column('employees', sa.Column('branch_code', sa.String(20), nullable=True))
    op.add_column('employees', sa.Column('account_type', sa.String(20), nullable=True))

    # Add tax field
    op.add_column('employees', sa.Column('tax_number', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('employees', 'tax_number')
    op.drop_column('employees', 'account_type')
    op.drop_column('employees', 'branch_code')
    op.drop_column('employees', 'account_number')
    op.drop_column('employees', 'bank_name')
