"""Add roster_upload_logs table, site_code, client_code columns.

Revision ID: 022
Revises: 021
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add site_code to sites table
    op.add_column("sites", sa.Column("site_code", sa.String(50), nullable=True))
    op.create_index("ix_sites_site_code", "sites", ["site_code"])

    # Add client_code to clients table
    op.add_column("clients", sa.Column("client_code", sa.String(50), nullable=True))
    op.create_index("ix_clients_client_code", "clients", ["client_code"])

    # Create roster_upload_logs table
    op.create_table(
        "roster_upload_logs",
        sa.Column("upload_id", sa.Integer(), primary_key=True, index=True),
        sa.Column("org_id", sa.Integer(), sa.ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("roster_id", sa.Integer(), sa.ForeignKey("rosters.roster_id", ondelete="SET NULL"), nullable=True),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=False, index=True),
        sa.Column("upload_format", sa.String(50), nullable=False, server_default="mafoko"),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("parsed_province", sa.String(100), nullable=True),
        sa.Column("parsed_client", sa.String(200), nullable=True),
        sa.Column("parsed_site_code", sa.String(50), nullable=True),
        sa.Column("parsed_site_name", sa.String(200), nullable=True),
        sa.Column("parsed_schedule", sa.String(50), nullable=True),
        sa.Column("parsed_start_date", sa.Date(), nullable=True),
        sa.Column("parsed_end_date", sa.Date(), nullable=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.client_id", ondelete="SET NULL"), nullable=True),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="processing"),
        sa.Column("employees_matched", sa.Integer(), server_default="0"),
        sa.Column("employees_unmatched", sa.Integer(), server_default="0"),
        sa.Column("shifts_created", sa.Integer(), server_default="0"),
        sa.Column("assignments_created", sa.Integer(), server_default="0"),
        sa.Column("total_cost", sa.Float(), server_default="0.0"),
        sa.Column("warnings", sa.JSON(), nullable=True),
        sa.Column("errors", sa.JSON(), nullable=True),
        sa.Column("suggestions", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("roster_upload_logs")
    op.drop_index("ix_clients_client_code", table_name="clients")
    op.drop_column("clients", "client_code")
    op.drop_index("ix_sites_site_code", table_name="sites")
    op.drop_column("sites", "site_code")
