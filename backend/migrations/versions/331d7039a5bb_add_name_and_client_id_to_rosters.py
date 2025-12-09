"""Add name and client_id to rosters

Revision ID: 331d7039a5bb
Revises: 53bbaf1e3d54
Create Date: 2024-12-09 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '331d7039a5bb'
down_revision: Union[str, None] = '53bbaf1e3d54'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add name column to rosters for human-readable names
    op.add_column('rosters', sa.Column('name', sa.String(200), nullable=True))

    # Add client_id column to rosters for client-specific roster filtering
    op.add_column('rosters', sa.Column('client_id', sa.Integer(), nullable=True))

    # Create index on client_id for faster lookups
    op.create_index('ix_rosters_client_id', 'rosters', ['client_id'], unique=False)

    # Add foreign key constraint to clients table
    op.create_foreign_key(
        'fk_rosters_client_id_clients',
        'rosters', 'clients',
        ['client_id'], ['client_id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint('fk_rosters_client_id_clients', 'rosters', type_='foreignkey')

    # Remove index
    op.drop_index('ix_rosters_client_id', table_name='rosters')

    # Remove columns
    op.drop_column('rosters', 'client_id')
    op.drop_column('rosters', 'name')
