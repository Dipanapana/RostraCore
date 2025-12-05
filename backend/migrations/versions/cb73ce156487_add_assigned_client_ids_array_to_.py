"""add_assigned_client_ids_array_to_employees

Revision ID: cb73ce156487
Revises: 7e4083ad6b58
Create Date: 2025-12-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'cb73ce156487'
down_revision: Union[str, None] = '7e4083ad6b58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the new assigned_client_ids array column to employees
    op.add_column('employees', sa.Column('assigned_client_ids', postgresql.ARRAY(sa.Integer()), nullable=True))

    # Migrate existing data: copy assigned_client_id to assigned_client_ids array
    op.execute("""
        UPDATE employees
        SET assigned_client_ids = ARRAY[assigned_client_id]
        WHERE assigned_client_id IS NOT NULL
    """)


def downgrade() -> None:
    # Remove the assigned_client_ids column
    op.drop_column('employees', 'assigned_client_ids')
