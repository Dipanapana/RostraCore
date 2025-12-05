"""add_default_hourly_rates

Revision ID: d1a2b3c4d5e6
Revises: cb73ce156487
Create Date: 2025-12-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1a2b3c4d5e6'
down_revision: Union[str, None] = 'cb73ce156487'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create default_hourly_rates table
    op.create_table(
        'default_hourly_rates',
        sa.Column('rate_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('psira_grade', sa.String(10), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('default_hourly_rate', sa.Numeric(10, 2), nullable=False),
        sa.UniqueConstraint('org_id', 'psira_grade', 'role', name='uq_org_grade_role')
    )


def downgrade() -> None:
    op.drop_table('default_hourly_rates')
