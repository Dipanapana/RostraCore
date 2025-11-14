"""merge_heads

Revision ID: 79ce11b0e76c
Revises: 0b3fcbf469e3, add_site_name_001
Create Date: 2025-11-14 12:20:23.396959

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '79ce11b0e76c'
down_revision = ('0b3fcbf469e3', 'add_site_name_001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
