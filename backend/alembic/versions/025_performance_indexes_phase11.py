"""Add performance indexes for 10K scaling.

Revision ID: 025
Revises: 024
"""
from alembic import op
import sqlalchemy as sa

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # shift_assignments: composite (employee_id, status) — covers utilization, payroll queries
    op.create_index(
        "idx_shift_assignments_employee_status",
        "shift_assignments",
        ["employee_id", "status"],
    )

    # shift_assignments: partial index on status (excludes cancelled)
    op.create_index(
        "idx_shift_assignments_status_active",
        "shift_assignments",
        ["status"],
        postgresql_where=sa.text("status != 'cancelled'"),
    )

    # shifts: composite (org_id, start_time) — replaces site subquery pattern
    op.create_index(
        "idx_shifts_org_start_time",
        "shifts",
        ["org_id", "start_time"],
    )

    # payroll_summary: composite (employee_id, period_start) — payroll lookups
    op.create_index(
        "idx_payroll_summary_employee_period",
        "payroll_summary",
        ["employee_id", "period_start"],
    )

    # payroll_summary: composite (org_id, period_start) — org-level payroll list
    op.create_index(
        "idx_payroll_summary_org_period",
        "payroll_summary",
        ["org_id", "period_start"],
    )

    # availability: composite (employee_id, date) — optimizer query
    op.create_index(
        "idx_availability_employee_date_composite",
        "availability",
        ["employee_id", "date"],
    )

    # users: org_id — multi-tenant user queries
    op.create_index(
        "idx_users_org_id",
        "users",
        ["org_id"],
    )

    # leave_requests: status — HR analytics filter
    op.create_index(
        "idx_leave_requests_status",
        "leave_requests",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("idx_leave_requests_status", table_name="leave_requests")
    op.drop_index("idx_users_org_id", table_name="users")
    op.drop_index("idx_availability_employee_date_composite", table_name="availability")
    op.drop_index("idx_payroll_summary_org_period", table_name="payroll_summary")
    op.drop_index("idx_payroll_summary_employee_period", table_name="payroll_summary")
    op.drop_index("idx_shifts_org_start_time", table_name="shifts")
    op.drop_index("idx_shift_assignments_status_active", table_name="shift_assignments")
    op.drop_index("idx_shift_assignments_employee_status", table_name="shift_assignments")
