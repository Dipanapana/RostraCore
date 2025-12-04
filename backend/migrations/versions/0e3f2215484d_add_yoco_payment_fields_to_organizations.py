"""add_yoco_payment_fields_to_organizations

Revision ID: 0e3f2215484d
Revises: 8de17d5a7e69
Create Date: 2025-12-02 15:56:27.736513

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0e3f2215484d'
down_revision = '8de17d5a7e69'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add Yoco payment tracking fields to organizations table
    op.add_column('organizations', sa.Column('yoco_last_checkout_id', sa.String(length=100), nullable=True))
    op.add_column('organizations', sa.Column('last_payment_date', sa.DateTime(), nullable=True))
    op.add_column('organizations', sa.Column('last_payment_amount', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('organizations', sa.Column('last_payment_period', sa.String(length=10), nullable=True))


def downgrade() -> None:
    # Remove Yoco payment tracking fields
    op.drop_column('organizations', 'last_payment_period')
    op.drop_column('organizations', 'last_payment_amount')
    op.drop_column('organizations', 'last_payment_date')
    op.drop_column('organizations', 'yoco_last_checkout_id')
