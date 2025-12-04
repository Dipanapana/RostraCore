"""Add system_settings table for configurable pricing

Revision ID: 93546c4dfcb1
Revises: a7b3c4d5e6f7
Create Date: 2025-12-03 10:05:19.710901

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '93546c4dfcb1'
down_revision = 'a7b3c4d5e6f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create system_settings table
    op.create_table(
        'system_settings',
        sa.Column('setting_id', sa.Integer(), nullable=False),
        sa.Column('setting_key', sa.String(length=100), nullable=False),
        sa.Column('value_string', sa.String(length=500), nullable=True),
        sa.Column('value_numeric', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('value_boolean', sa.Boolean(), nullable=True),
        sa.Column('value_text', sa.Text(), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('category', sa.String(length=50), server_default='general', nullable=True),
        sa.Column('is_public', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('setting_id')
    )
    op.create_index(op.f('ix_system_settings_setting_id'), 'system_settings', ['setting_id'], unique=False)
    op.create_index(op.f('ix_system_settings_setting_key'), 'system_settings', ['setting_key'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_system_settings_setting_key'), table_name='system_settings')
    op.drop_index(op.f('ix_system_settings_setting_id'), table_name='system_settings')
    op.drop_table('system_settings')
