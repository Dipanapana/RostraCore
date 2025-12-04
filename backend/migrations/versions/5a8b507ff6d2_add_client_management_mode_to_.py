"""add_client_management_mode_to_organizations

Revision ID: 5a8b507ff6d2
Revises: 93546c4dfcb1
Create Date: 2025-12-03 11:41:10.060004

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5a8b507ff6d2'
down_revision = '93546c4dfcb1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add client_management_mode column - 'all' or 'selected'
    op.add_column('organizations',
        sa.Column('client_management_mode', sa.String(length=20), server_default='all', nullable=False))

    # Add managed_client_ids column - array of client IDs when mode='selected'
    op.add_column('organizations',
        sa.Column('managed_client_ids', sa.ARRAY(sa.Integer()), nullable=True))


def downgrade() -> None:
    op.drop_column('organizations', 'managed_client_ids')
    op.drop_column('organizations', 'client_management_mode')
