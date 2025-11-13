"""add clients and leave requests

Revision ID: 011_add_clients_and_leave
Revises: 010_add_verification
Create Date: 2025-11-09 00:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '011_add_clients_and_leave'
down_revision = '010_add_verification'
branch_labels = None
depends_on = None


def upgrade():
    # Create clients table
    op.create_table(
        'clients',
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('client_name', sa.String(length=255), nullable=False),
        sa.Column('contact_person', sa.String(length=200), nullable=True),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('contact_phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('contract_start_date', sa.Date(), nullable=True),
        sa.Column('contract_end_date', sa.Date(), nullable=True),
        sa.Column('billing_rate', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('client_id'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.org_id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_clients_org_id'), 'clients', ['org_id'], unique=False)
    op.create_index(op.f('ix_clients_client_name'), 'clients', ['client_name'], unique=False)

    # Add client_id to sites table
    op.add_column('sites', sa.Column('client_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_sites_client_id', 'sites', 'clients', ['client_id'], ['client_id'], ondelete='SET NULL')
    op.create_index(op.f('ix_sites_client_id'), 'sites', ['client_id'], unique=False)

    # Update employees table for self-service
    op.add_column('employees', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('employees', sa.Column('hashed_password', sa.String(length=255), nullable=True))
    op.add_column('employees', sa.Column('phone', sa.String(length=20), nullable=True))
    op.add_column('employees', sa.Column('psira_number', sa.String(length=50), nullable=True))
    op.add_column('employees', sa.Column('psira_expiry_date', sa.Date(), nullable=True))
    op.add_column('employees', sa.Column('psira_grade', sa.String(length=50), nullable=True))
    op.add_column('employees', sa.Column('id_number', sa.String(length=50), nullable=True))
    op.add_column('employees', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('employees', sa.Column('emergency_contact_name', sa.String(length=200), nullable=True))
    op.add_column('employees', sa.Column('emergency_contact_phone', sa.String(length=20), nullable=True))
    op.add_column('employees', sa.Column('profile_photo_url', sa.String(length=500), nullable=True))
    op.add_column('employees', sa.Column('is_active_account', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('employees', sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_employees_email'), 'employees', ['email'], unique=True)

    # Create leave_requests table
    op.create_table(
        'leave_requests',
        sa.Column('leave_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('leave_type', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('leave_id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.employee_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.user_id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_leave_requests_employee_id'), 'leave_requests', ['employee_id'], unique=False)
    op.create_index(op.f('ix_leave_requests_status'), 'leave_requests', ['status'], unique=False)
    op.create_index(op.f('ix_leave_requests_start_date'), 'leave_requests', ['start_date'], unique=False)

    # Create employee_sites junction table for many-to-many relationship
    op.create_table(
        'employee_sites',
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('employee_id', 'site_id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.employee_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['site_id'], ['sites.site_id'], ondelete='CASCADE'),
    )


def downgrade():
    # Drop tables and columns in reverse order
    op.drop_table('employee_sites')
    op.drop_index(op.f('ix_leave_requests_start_date'), table_name='leave_requests')
    op.drop_index(op.f('ix_leave_requests_status'), table_name='leave_requests')
    op.drop_index(op.f('ix_leave_requests_employee_id'), table_name='leave_requests')
    op.drop_table('leave_requests')

    op.drop_index(op.f('ix_employees_email'), table_name='employees')
    op.drop_column('employees', 'last_login')
    op.drop_column('employees', 'is_active_account')
    op.drop_column('employees', 'profile_photo_url')
    op.drop_column('employees', 'emergency_contact_phone')
    op.drop_column('employees', 'emergency_contact_name')
    op.drop_column('employees', 'address')
    op.drop_column('employees', 'id_number')
    op.drop_column('employees', 'psira_grade')
    op.drop_column('employees', 'psira_expiry_date')
    op.drop_column('employees', 'psira_number')
    op.drop_column('employees', 'phone')
    op.drop_column('employees', 'hashed_password')
    op.drop_column('employees', 'email')

    op.drop_index(op.f('ix_sites_client_id'), table_name='sites')
    op.drop_constraint('fk_sites_client_id', 'sites', type_='foreignkey')
    op.drop_column('sites', 'client_id')

    op.drop_index(op.f('ix_clients_client_name'), table_name='clients')
    op.drop_index(op.f('ix_clients_org_id'), table_name='clients')
    op.drop_table('clients')
