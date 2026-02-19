"""merge_wave12_and_main

Revision ID: d1e1f2043ef1
Revises: 331d7039a5bb, wave12_patrol_001
Create Date: 2026-02-19 11:23:12.273169

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd1e1f2043ef1'
down_revision = ('331d7039a5bb', 'wave12_patrol_001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
