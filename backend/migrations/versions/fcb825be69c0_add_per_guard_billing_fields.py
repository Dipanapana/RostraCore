"""add_per_guard_billing_fields

Revision ID: fcb825be69c0
Revises: 055070a42a63
Create Date: 2025-11-11 15:21:01.761887

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fcb825be69c0'
down_revision = '055070a42a63'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add per-guard billing fields to organizations table
    op.add_column('organizations', sa.Column('active_guard_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('organizations', sa.Column('monthly_rate_per_guard', sa.Numeric(precision=10, scale=2), nullable=False, server_default='45.00'))
    op.add_column('organizations', sa.Column('current_month_cost', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'))
    op.add_column('organizations', sa.Column('last_billing_calculation', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove per-guard billing fields
    op.drop_column('organizations', 'last_billing_calculation')
    op.drop_column('organizations', 'current_month_cost')
    op.drop_column('organizations', 'monthly_rate_per_guard')
    op.drop_column('organizations', 'active_guard_count')
