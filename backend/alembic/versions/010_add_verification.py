"""add_email_phone_verification_and_user_org_link

Revision ID: 010_add_verification
Revises: 009
Create Date: 2025-11-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010_add_verification'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to users table
    op.add_column('users', sa.Column('phone', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('org_id', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('is_phone_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('email_verification_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('email_verification_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('phone_verification_code', sa.String(length=10), nullable=True))
    op.add_column('users', sa.Column('phone_verification_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('password_reset_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('password_reset_sent_at', sa.DateTime(timezone=True), nullable=True))

    # Create foreign key constraint
    op.create_foreign_key('fk_users_org_id', 'users', 'organizations', ['org_id'], ['org_id'])

    # Create indexes for new columns
    op.create_index('ix_users_email_verification_token', 'users', ['email_verification_token'], unique=False)
    op.create_index('ix_users_password_reset_token', 'users', ['password_reset_token'], unique=False)


def downgrade():
    # Remove indexes
    op.drop_index('ix_users_password_reset_token', table_name='users')
    op.drop_index('ix_users_email_verification_token', table_name='users')

    # Remove foreign key
    op.drop_constraint('fk_users_org_id', 'users', type_='foreignkey')

    # Remove columns
    op.drop_column('users', 'password_reset_sent_at')
    op.drop_column('users', 'password_reset_token')
    op.drop_column('users', 'phone_verification_sent_at')
    op.drop_column('users', 'phone_verification_code')
    op.drop_column('users', 'email_verification_sent_at')
    op.drop_column('users', 'email_verification_token')
    op.drop_column('users', 'is_phone_verified')
    op.drop_column('users', 'is_email_verified')
    op.drop_column('users', 'org_id')
    op.drop_column('users', 'phone')
