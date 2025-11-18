"""add_bcea_premium_fields_to_shift_assignments

Revision ID: 533e06785570
Revises: f614a5c1278e
Create Date: 2025-11-18 18:10:42.887911

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '533e06785570'
down_revision = 'f614a5c1278e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add BCEA-compliant premium tracking fields to shift_assignments
    op.add_column('shift_assignments', sa.Column('sunday_premium', sa.Float(), nullable=False, server_default='0.0'))
    op.add_column('shift_assignments', sa.Column('holiday_premium', sa.Float(), nullable=False, server_default='0.0'))
    op.add_column('shift_assignments', sa.Column('premium_type', sa.String(50), nullable=True))


def downgrade() -> None:
    # Remove BCEA premium fields
    op.drop_column('shift_assignments', 'premium_type')
    op.drop_column('shift_assignments', 'holiday_premium')
    op.drop_column('shift_assignments', 'sunday_premium')
