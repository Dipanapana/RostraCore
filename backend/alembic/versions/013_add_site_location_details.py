"""add site location details

Revision ID: 013
Revises: 012
Create Date: 2025-11-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '013'
down_revision: Union[str, None] = '012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add detailed location fields to sites table
    op.add_column('sites', sa.Column('street_address', sa.String(length=300), nullable=True))
    op.add_column('sites', sa.Column('suburb', sa.String(length=100), nullable=True))
    op.add_column('sites', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('sites', sa.Column('postal_code', sa.String(length=20), nullable=True))
    op.add_column('sites', sa.Column('country', sa.String(length=100), nullable=False, server_default='South Africa'))
    op.add_column('sites', sa.Column('gps_accuracy', sa.Float(), nullable=True))  # GPS accuracy in meters
    op.add_column('sites', sa.Column('location_notes', sa.Text(), nullable=True))  # Specific location instructions


def downgrade() -> None:
    # Remove detailed location fields
    op.drop_column('sites', 'location_notes')
    op.drop_column('sites', 'gps_accuracy')
    op.drop_column('sites', 'country')
    op.drop_column('sites', 'postal_code')
    op.drop_column('sites', 'city')
    op.drop_column('sites', 'suburb')
    op.drop_column('sites', 'street_address')
