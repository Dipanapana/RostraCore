"""add_account_lockout_fields

Revision ID: 055070a42a63
Revises: d172a1069629
Create Date: 2025-11-11 15:18:02.599170

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '055070a42a63'
down_revision = 'd172a1069629'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add account lockout fields to users table
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('account_locked_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('last_failed_login', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove account lockout fields
    op.drop_column('users', 'last_failed_login')
    op.drop_column('users', 'account_locked_until')
    op.drop_column('users', 'failed_login_attempts')
