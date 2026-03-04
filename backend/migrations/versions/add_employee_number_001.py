"""Add employee_number field to employees table.

Revision ID: add_employee_number_001
Revises: wave36_guard_restrictions
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "add_employee_number_001"
down_revision = "wave36_guard_restrictions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column("employee_number", sa.String(50), nullable=True),
    )
    op.create_index("ix_employees_employee_number", "employees", ["employee_number"])


def downgrade() -> None:
    op.drop_index("ix_employees_employee_number", table_name="employees")
    op.drop_column("employees", "employee_number")
