"""Add multi-tenancy foundation with organizations table

Revision ID: add_multi_tenancy
Revises: 110e433d0604
Create Date: 2025-11-05 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_multi_tenancy'
down_revision = '110e433d0604'
branch_labels = None
depends_on = None


def upgrade():
    # Create organizations table (tenants)
    op.create_table(
        'organizations',
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('org_code', sa.String(length=20), nullable=False),
        sa.Column('company_name', sa.String(length=200), nullable=False),
        sa.Column('psira_company_registration', sa.String(length=50), nullable=True),
        sa.Column('subscription_tier', sa.String(length=20), nullable=False, server_default='starter'),
        sa.Column('subscription_status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('max_employees', sa.Integer(), nullable=True),
        sa.Column('max_sites', sa.Integer(), nullable=True),
        sa.Column('max_shifts_per_month', sa.Integer(), nullable=True),
        sa.Column('features_enabled', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('billing_email', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.PrimaryKeyConstraint('org_id'),
        sa.UniqueConstraint('org_code')
    )
    op.create_index('ix_organizations_org_code', 'organizations', ['org_code'])

    # Add tenant_id to all existing tables
    tables_to_update = [
        'employees',
        'sites',
        'shifts',
        'rosters',
        'shift_assignments',
        'availability',
        'certifications',
        'skills_matrix',
        'expenses',
        'attendance',
        'payroll'
    ]

    for table_name in tables_to_update:
        op.add_column(table_name, sa.Column('tenant_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            f'fk_{table_name}_tenant_id',
            table_name, 'organizations',
            ['tenant_id'], ['org_id'],
            ondelete='CASCADE'
        )
        op.create_index(f'ix_{table_name}_tenant_id', table_name, ['tenant_id'])

    # Create default organization for existing data
    op.execute("""
        INSERT INTO organizations (org_code, company_name, subscription_tier, subscription_status)
        VALUES ('DEFAULT', 'Default Organization', 'enterprise', 'active')
    """)

    # Update existing records to belong to default organization
    for table_name in tables_to_update:
        op.execute(f"""
            UPDATE {table_name}
            SET tenant_id = (SELECT org_id FROM organizations WHERE org_code = 'DEFAULT')
            WHERE tenant_id IS NULL
        """)

    # Make tenant_id NOT NULL after backfill
    for table_name in tables_to_update:
        op.alter_column(table_name, 'tenant_id', nullable=False)


def downgrade():
    tables_to_update = [
        'employees',
        'sites',
        'shifts',
        'rosters',
        'shift_assignments',
        'availability',
        'certifications',
        'skills_matrix',
        'expenses',
        'attendance',
        'payroll'
    ]

    for table_name in tables_to_update:
        op.drop_index(f'ix_{table_name}_tenant_id', table_name)
        op.drop_constraint(f'fk_{table_name}_tenant_id', table_name, type_='foreignkey')
        op.drop_column(table_name, 'tenant_id')

    op.drop_index('ix_organizations_org_code', 'organizations')
    op.drop_table('organizations')
