"""add_premium_pay_fields_to_roster_preferences

Revision ID: bf471ee88f94
Revises: 2221f13b3761
Create Date: 2025-11-26 13:57:50.889828

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bf471ee88f94'
down_revision = '2221f13b3761'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add premium pay fields to roster_preferences table
    op.add_column('roster_preferences', sa.Column('night_shift_premium_amount', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('roster_preferences', sa.Column('sunday_premium_percentage', sa.Float(), nullable=True, server_default='50.0'))
    op.add_column('roster_preferences', sa.Column('holiday_premium_percentage', sa.Float(), nullable=True, server_default='100.0'))


def downgrade() -> None:
    # Remove premium pay fields from roster_preferences table
    op.drop_column('roster_preferences', 'holiday_premium_percentage')
    op.drop_column('roster_preferences', 'sunday_premium_percentage')
    op.drop_column('roster_preferences', 'night_shift_premium_amount')
