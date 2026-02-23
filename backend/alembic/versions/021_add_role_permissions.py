"""Add organization role permissions table.

Revision ID: 021
Revises: 020
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_role_permissions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "org_id",
            sa.Integer(),
            sa.ForeignKey("organizations.org_id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("permission_key", sa.String(100), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.Column(
            "updated_by",
            sa.Integer(),
            sa.ForeignKey("users.user_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.UniqueConstraint("org_id", "role", "permission_key", name="uq_org_role_permission"),
    )
    op.create_index("ix_org_role_perm_org_role", "organization_role_permissions", ["org_id", "role"])


def downgrade() -> None:
    op.drop_index("ix_org_role_perm_org_role", table_name="organization_role_permissions")
    op.drop_table("organization_role_permissions")
