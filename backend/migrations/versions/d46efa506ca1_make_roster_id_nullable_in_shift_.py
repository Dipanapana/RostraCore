"""make_roster_id_nullable_in_shift_assignments

Revision ID: d46efa506ca1
Revises: 533e06785570
Create Date: 2025-11-23 17:23:57.645383

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd46efa506ca1'
down_revision = '533e06785570'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make roster_id nullable to support manual shift assignments (not from roster)
    op.alter_column('shift_assignments', 'roster_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)


def downgrade() -> None:
    # Revert roster_id to NOT NULL
    op.alter_column('shift_assignments', 'roster_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
