"""add_organization_approval_workflow

Revision ID: d172a1069629
Revises: add_shift_groups
Create Date: 2025-11-11 11:48:17.302925

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd172a1069629'
down_revision = 'add_shift_groups'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add organization approval workflow columns
    op.add_column('organizations', sa.Column('approval_status', sa.String(length=20), nullable=False, server_default='pending_approval'))
    op.add_column('organizations', sa.Column('approved_by', sa.Integer(), nullable=True))
    op.add_column('organizations', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('organizations', sa.Column('rejection_reason', sa.String(length=500), nullable=True))

    # Update existing organizations to 'approved' status (for backward compatibility)
    op.execute("UPDATE organizations SET approval_status = 'approved' WHERE approval_status = 'pending_approval'")

    # Change default subscription_status from 'active' to 'trial' for new organizations
    op.alter_column('organizations', 'subscription_status', server_default='trial')


def downgrade() -> None:
    # Remove organization approval workflow columns
    op.drop_column('organizations', 'rejection_reason')
    op.drop_column('organizations', 'approved_at')
    op.drop_column('organizations', 'approved_by')
    op.drop_column('organizations', 'approval_status')

    # Revert subscription_status default back to 'active'
    op.alter_column('organizations', 'subscription_status', server_default='active')
