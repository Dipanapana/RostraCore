"""add_is_owner_and_user_client_assignments

Revision ID: 7e4083ad6b58
Revises: 5a8b507ff6d2
Create Date: 2025-12-03 16:00:49.082860

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision = '7e4083ad6b58'
down_revision = '5a8b507ff6d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_owner column to users table
    # Owners have full access to all org clients and can manage users
    op.add_column('users',
        sa.Column('is_owner', sa.Boolean(), server_default='false', nullable=False)
    )

    # Add managed_client_ids column to users table
    # For non-owners, this determines which clients they can access
    # NULL means no specific assignment (owners get all, non-owners get nothing)
    op.add_column('users',
        sa.Column('managed_client_ids', ARRAY(sa.Integer()), nullable=True)
    )

    # Set existing admin users as owners (they created the org originally)
    # This ensures backward compatibility
    op.execute("""
        UPDATE users
        SET is_owner = true
        WHERE role IN ('ADMIN', 'COMPANY_ADMIN')
        AND org_id IS NOT NULL
    """)


def downgrade() -> None:
    op.drop_column('users', 'managed_client_ids')
    op.drop_column('users', 'is_owner')
