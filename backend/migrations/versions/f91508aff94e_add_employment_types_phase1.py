"""add_employment_types_phase1

Add employment types for multi-type HR platform.
Phase 1: Expand from security-guard-only to comprehensive HR management
supporting office staff, contractors, consultants, part-time, temporary workers.

Revision ID: f91508aff94e
Revises: 331d7039a5bb
Create Date: 2026-02-02 21:47:35.542602

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision = 'f91508aff94e'
down_revision = '331d7039a5bb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add employment type fields to employees table for multi-type HR platform.
    All fields are nullable for backward compatibility.
    Existing employees will be auto-defaulted to permanent/shift_based.
    """

    # Add employment classification fields
    op.add_column('employees', sa.Column('employment_type', sa.String(50), nullable=True))
    op.add_column('employees', sa.Column('work_pattern_type', sa.String(50), nullable=True))

    # Add contractor/consultant specific fields
    op.add_column('employees', sa.Column('contract_start_date', sa.Date(), nullable=True))
    op.add_column('employees', sa.Column('contract_end_date', sa.Date(), nullable=True))
    op.add_column('employees', sa.Column('daily_rate', sa.Numeric(10, 2), nullable=True))
    op.add_column('employees', sa.Column('project_name', sa.String(200), nullable=True))
    op.add_column('employees', sa.Column('invoicing_frequency', sa.String(50), nullable=True))

    # Add skills and organizational fields
    op.add_column('employees', sa.Column('skills', ARRAY(sa.String()), nullable=True))
    op.add_column('employees', sa.Column('department', sa.String(100), nullable=True))
    op.add_column('employees', sa.Column('job_title', sa.String(100), nullable=True))

    # Add part-time specific fields
    op.add_column('employees', sa.Column('max_hours_month', sa.Integer(), nullable=True))
    op.add_column('employees', sa.Column('preferred_days', ARRAY(sa.String()), nullable=True))

    # Add office hours specific fields
    op.add_column('employees', sa.Column('standard_work_hours_start', sa.String(5), nullable=True))
    op.add_column('employees', sa.Column('standard_work_hours_end', sa.String(5), nullable=True))
    op.add_column('employees', sa.Column('core_hours_start', sa.String(5), nullable=True))
    op.add_column('employees', sa.Column('core_hours_end', sa.String(5), nullable=True))

    # Add tax classification field (SARS compliance)
    op.add_column('employees', sa.Column('is_independent_contractor', sa.Boolean(), server_default='false', nullable=False))

    # Set defaults for existing employees (backward compatibility)
    # All existing employees are assumed to be permanent, shift-based security guards
    op.execute("""
        UPDATE employees
        SET employment_type = 'permanent',
            work_pattern_type = 'shift_based'
        WHERE employment_type IS NULL
    """)

    # Add indexes for filtering performance
    op.create_index('idx_employees_employment_type', 'employees', ['employment_type'])
    op.create_index('idx_employees_work_pattern_type', 'employees', ['work_pattern_type'])
    op.create_index('idx_employees_department', 'employees', ['department'])
    op.create_index('idx_employees_is_independent_contractor', 'employees', ['is_independent_contractor'])


def downgrade() -> None:
    """
    Remove employment type fields from employees table.
    WARNING: This will drop all employment type data. Use with caution in production.
    """

    # Drop indexes
    op.drop_index('idx_employees_is_independent_contractor', 'employees')
    op.drop_index('idx_employees_department', 'employees')
    op.drop_index('idx_employees_work_pattern_type', 'employees')
    op.drop_index('idx_employees_employment_type', 'employees')

    # Drop all added columns
    op.drop_column('employees', 'is_independent_contractor')
    op.drop_column('employees', 'core_hours_end')
    op.drop_column('employees', 'core_hours_start')
    op.drop_column('employees', 'standard_work_hours_end')
    op.drop_column('employees', 'standard_work_hours_start')
    op.drop_column('employees', 'preferred_days')
    op.drop_column('employees', 'max_hours_month')
    op.drop_column('employees', 'job_title')
    op.drop_column('employees', 'department')
    op.drop_column('employees', 'skills')
    op.drop_column('employees', 'invoicing_frequency')
    op.drop_column('employees', 'project_name')
    op.drop_column('employees', 'daily_rate')
    op.drop_column('employees', 'contract_end_date')
    op.drop_column('employees', 'contract_start_date')
    op.drop_column('employees', 'work_pattern_type')
    op.drop_column('employees', 'employment_type')
