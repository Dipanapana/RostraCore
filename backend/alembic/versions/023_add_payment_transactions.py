"""Add payment_transactions table.

Revision ID: 023
Revises: 022
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payment_transactions",
        sa.Column("transaction_id", sa.Integer(), primary_key=True, index=True),
        sa.Column("org_id", sa.Integer(), sa.ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("gateway", sa.String(20), nullable=False),
        sa.Column("gateway_transaction_id", sa.String(200), nullable=True, index=True),
        sa.Column("gateway_status", sa.String(50), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="ZAR"),
        sa.Column("billing_period", sa.String(10), nullable=True),
        sa.Column("guard_count", sa.Integer(), nullable=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("payment_transactions")
