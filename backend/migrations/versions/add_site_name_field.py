"""add site_name field to sites table

Revision ID: add_site_name_001
Revises:
Create Date: 2025-11-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_site_name_001'
down_revision = '862c9ee16cef'  # Follows "Add users table for authentication"
branch_labels = None
depends_on = None


def upgrade():
    """Add site_name column to sites table"""
    # Add site_name column (nullable first to allow existing data)
    op.add_column('sites', sa.Column('site_name', sa.String(length=200), nullable=True))

    # Copy client_name to site_name for existing rows (as default)
    op.execute("UPDATE sites SET site_name = client_name WHERE site_name IS NULL")

    # Now make it non-nullable
    op.alter_column('sites', 'site_name', nullable=False)


def downgrade():
    """Remove site_name column from sites table"""
    op.drop_column('sites', 'site_name')
