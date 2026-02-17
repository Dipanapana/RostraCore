"""UX Overhaul Wave 1: Add pay_type, monthly_salary, expanded roles, and org profile fields.

Revision ID: ux_wave1_001
Revises: h5i6j7k8l9m0
Create Date: 2026-02-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision = 'ux_wave1_001'
down_revision = None  # Will be auto-resolved by Alembic
branch_labels = None
depends_on = None


def upgrade():
    # =========================================================================
    # EMPLOYEE MODEL CHANGES
    # =========================================================================

    # 1. Add pay_type enum type
    pay_type_enum = sa.Enum('hourly', 'monthly_fixed', name='paytype')
    pay_type_enum.create(op.get_bind(), checkfirst=True)

    # 2. Add new employee role values to existing enum
    # PostgreSQL approach: add new values to existing enum
    op.execute("ALTER TYPE employeerole ADD VALUE IF NOT EXISTS 'manager'")
    op.execute("ALTER TYPE employeerole ADD VALUE IF NOT EXISTS 'admin'")
    op.execute("ALTER TYPE employeerole ADD VALUE IF NOT EXISTS 'office_staff'")
    op.execute("ALTER TYPE employeerole ADD VALUE IF NOT EXISTS 'field_worker'")
    op.execute("ALTER TYPE employeerole ADD VALUE IF NOT EXISTS 'contractor'")
    op.execute("ALTER TYPE employeerole ADD VALUE IF NOT EXISTS 'other'")

    # 3. Add pay_type column (default 'hourly' for all existing employees)
    op.add_column('employees', sa.Column('pay_type', sa.Enum('hourly', 'monthly_fixed', name='paytype'),
                                         nullable=False, server_default='hourly'))

    # 4. Add monthly_salary column
    op.add_column('employees', sa.Column('monthly_salary', sa.Numeric(10, 2), nullable=True))

    # 5. Make hourly_rate nullable (was NOT NULL, now optional for salaried employees)
    op.alter_column('employees', 'hourly_rate',
                    existing_type=sa.Float(),
                    nullable=True)

    # =========================================================================
    # ORGANIZATION MODEL CHANGES (Company profile for payslips)
    # =========================================================================

    op.add_column('organizations', sa.Column('logo_url', sa.String(500), nullable=True))
    op.add_column('organizations', sa.Column('address_line1', sa.String(200), nullable=True))
    op.add_column('organizations', sa.Column('address_line2', sa.String(200), nullable=True))
    op.add_column('organizations', sa.Column('city', sa.String(100), nullable=True))
    op.add_column('organizations', sa.Column('postal_code', sa.String(20), nullable=True))
    op.add_column('organizations', sa.Column('phone', sa.String(20), nullable=True))
    op.add_column('organizations', sa.Column('vat_number', sa.String(20), nullable=True))
    op.add_column('organizations', sa.Column('registration_number', sa.String(50), nullable=True))
    op.add_column('organizations', sa.Column('payslip_template', sa.String(50),
                                              nullable=False, server_default='professional'))


def downgrade():
    # Organization columns
    op.drop_column('organizations', 'payslip_template')
    op.drop_column('organizations', 'registration_number')
    op.drop_column('organizations', 'vat_number')
    op.drop_column('organizations', 'phone')
    op.drop_column('organizations', 'postal_code')
    op.drop_column('organizations', 'city')
    op.drop_column('organizations', 'address_line2')
    op.drop_column('organizations', 'address_line1')
    op.drop_column('organizations', 'logo_url')

    # Employee columns
    op.alter_column('employees', 'hourly_rate',
                    existing_type=sa.Float(),
                    nullable=False)
    op.drop_column('employees', 'monthly_salary')
    op.drop_column('employees', 'pay_type')

    # Drop pay_type enum
    sa.Enum(name='paytype').drop(op.get_bind(), checkfirst=True)

    # Note: Cannot remove values from PostgreSQL enum types in downgrade
    # The new role values (manager, admin, etc.) will remain in the enum
