"""Add leave management tables.

Revision ID: g4h5i6j7k8l9
Revises: f3g4h5i6j7k8
Create Date: 2025-12-05 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'g4h5i6j7k8l9'
down_revision = 'f3g4h5i6j7k8'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create leave management tables for SA BCEA compliance.

    Tables:
    - leave_requests: Individual leave requests from employees
    - leave_balances: Leave entitlement tracking per employee per year
    """

    # Create leave type enum
    leave_type_enum = sa.Enum(
        'annual', 'sick', 'family_responsibility', 'maternity', 'parental', 'unpaid', 'study', 'compassionate',
        name='leavetype'
    )

    # Create leave status enum
    leave_status_enum = sa.Enum(
        'pending', 'approved', 'rejected', 'cancelled',
        name='leavestatus'
    )

    # Create leave_requests table
    op.create_table(
        'leave_requests',
        sa.Column('leave_id', sa.Integer(), primary_key=True, index=True),

        # Multi-tenancy
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'),
                  nullable=False, index=True),

        # Employee
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='CASCADE'),
                  nullable=False, index=True),

        # Leave details
        sa.Column('leave_type', leave_type_enum, nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('total_days', sa.Integer(), nullable=False),

        # Request details
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('medical_certificate_required', sa.String(10), server_default='no'),

        # Status
        sa.Column('status', leave_status_enum, server_default='pending'),

        # Admin tracking
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # Create indexes for leave_requests
    op.create_index('ix_leave_requests_org_status', 'leave_requests', ['org_id', 'status'])
    op.create_index('ix_leave_requests_employee_year', 'leave_requests',
                    ['employee_id', sa.text("EXTRACT(YEAR FROM start_date)")])

    # Create leave_balances table
    op.create_table(
        'leave_balances',
        sa.Column('balance_id', sa.Integer(), primary_key=True, index=True),

        # Multi-tenancy
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'),
                  nullable=False, index=True),

        # Employee
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='CASCADE'),
                  nullable=False, index=True),

        # Year
        sa.Column('year', sa.Integer(), nullable=False),

        # Annual leave (BCEA: 15 days minimum)
        sa.Column('annual_entitlement', sa.Numeric(5, 1), server_default='15'),
        sa.Column('annual_used', sa.Numeric(5, 1), server_default='0'),
        sa.Column('annual_pending', sa.Numeric(5, 1), server_default='0'),

        # Sick leave (BCEA: 30 days per 36-month cycle)
        sa.Column('sick_entitlement', sa.Numeric(5, 1), server_default='30'),
        sa.Column('sick_used', sa.Numeric(5, 1), server_default='0'),
        sa.Column('sick_cycle_start', sa.Date(), nullable=True),

        # Family responsibility (BCEA: 3 days/year)
        sa.Column('family_entitlement', sa.Numeric(5, 1), server_default='3'),
        sa.Column('family_used', sa.Numeric(5, 1), server_default='0'),

        # Study leave (optional)
        sa.Column('study_entitlement', sa.Numeric(5, 1), server_default='0'),
        sa.Column('study_used', sa.Numeric(5, 1), server_default='0'),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # Create unique constraint for one balance per employee per year
    op.create_unique_constraint(
        'uq_leave_balance_employee_year',
        'leave_balances',
        ['org_id', 'employee_id', 'year']
    )


def downgrade():
    """Remove leave management tables."""
    op.drop_table('leave_balances')
    op.drop_table('leave_requests')

    # Drop enums
    sa.Enum(name='leavetype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='leavestatus').drop(op.get_bind(), checkfirst=True)
