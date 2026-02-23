"""Add payroll status, org payroll config, audit logs, roster snapshots, biometric tables.

Revision ID: 019
Revises: 018
Create Date: 2026-02-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '019'
down_revision = '018'
branch_labels = None
depends_on = None


def upgrade():
    # --- Phase 1D: PayrollSummary status + org_id ---
    op.add_column('payroll_summary', sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id'), nullable=True))
    op.add_column('payroll_summary', sa.Column('status', sa.String(20), server_default='draft', nullable=False))
    op.add_column('payroll_summary', sa.Column('approved_by', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=True))
    op.add_column('payroll_summary', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('payroll_summary', sa.Column('paid_at', sa.DateTime(), nullable=True))
    op.create_index('ix_payroll_summary_status', 'payroll_summary', ['status'])
    op.create_index('ix_payroll_summary_org_id', 'payroll_summary', ['org_id'])

    # --- Phase 1F: Organization Payroll Config ---
    op.create_table(
        'organization_payroll_configs',
        sa.Column('config_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id'), nullable=False, unique=True),
        sa.Column('psira_deduction', sa.Numeric(10, 2), server_default='50.00'),
        sa.Column('bargaining_council', sa.Numeric(10, 2), server_default='25.00'),
        sa.Column('provident_fund_pct', sa.Numeric(5, 4), server_default='0.0500'),
        sa.Column('nucaaw', sa.Numeric(10, 2), server_default='0.00'),
        sa.Column('hospital_cover', sa.Numeric(10, 2), server_default='0.00'),
        sa.Column('supervisor_allowance', sa.Numeric(10, 2), server_default='500.00'),
        sa.Column('min_hourly_rate', sa.Numeric(10, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # --- Phase 2A: Audit Log ---
    op.create_table(
        'audit_logs',
        sa.Column('log_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id'), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(30), nullable=False),
        sa.Column('changes', JSON, nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('user_email', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('ip_address', sa.String(45), nullable=True),
    )
    op.create_index('ix_audit_logs_org_entity', 'audit_logs', ['org_id', 'entity_type', 'entity_id'])
    op.create_index('ix_audit_logs_org_created', 'audit_logs', ['org_id', 'created_at'])
    op.create_index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'])

    # --- Phase 2C: Roster Snapshots ---
    op.create_table(
        'roster_snapshots',
        sa.Column('snapshot_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('roster_id', sa.Integer(), sa.ForeignKey('rosters.roster_id'), nullable=False),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('snapshot_data', JSON, nullable=False),
        sa.Column('label', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=True),
    )
    op.create_index('ix_roster_snapshots_roster', 'roster_snapshots', ['roster_id'])
    op.create_index('ix_roster_snapshots_org', 'roster_snapshots', ['org_id'])

    # --- Phase 4A: Attendance Photos ---
    op.create_table(
        'attendance_photos',
        sa.Column('photo_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id'), nullable=False),
        sa.Column('assignment_id', sa.Integer(), sa.ForeignKey('shift_assignments.assignment_id'), nullable=False),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id'), nullable=False),
        sa.Column('photo_type', sa.String(20), nullable=False),
        sa.Column('storage_path', sa.String(500), nullable=True),
        sa.Column('file_hash', sa.String(64), nullable=True),
        sa.Column('verified', sa.Boolean(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('verified_by', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('captured_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('gps_lat', sa.Float(), nullable=True),
        sa.Column('gps_lng', sa.Float(), nullable=True),
    )
    op.create_index('ix_attendance_photos_assignment', 'attendance_photos', ['assignment_id'])
    op.create_index('ix_attendance_photos_employee', 'attendance_photos', ['employee_id'])

    # --- Phase 4B: Biometric Templates ---
    op.create_table(
        'biometric_templates',
        sa.Column('template_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id'), nullable=False),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id'), nullable=False),
        sa.Column('template_type', sa.String(30), nullable=False),
        sa.Column('storage_path', sa.String(500), nullable=True),
        sa.Column('file_hash', sa.String(64), nullable=True),
        sa.Column('enrolled_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('enrolled_by', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('deactivated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_biometric_templates_employee', 'biometric_templates', ['employee_id'])
    op.create_index('ix_biometric_templates_org', 'biometric_templates', ['org_id'])

    # --- Phase 4D: ShiftAssignment photo fields ---
    op.add_column('shift_assignments', sa.Column('check_in_photo_verified', sa.Boolean(), nullable=True))
    op.add_column('shift_assignments', sa.Column('check_in_photo_confidence', sa.Float(), nullable=True))
    op.add_column('shift_assignments', sa.Column('check_out_photo_verified', sa.Boolean(), nullable=True))


def downgrade():
    # Phase 4D
    op.drop_column('shift_assignments', 'check_out_photo_verified')
    op.drop_column('shift_assignments', 'check_in_photo_confidence')
    op.drop_column('shift_assignments', 'check_in_photo_verified')

    # Phase 4B
    op.drop_index('ix_biometric_templates_org')
    op.drop_index('ix_biometric_templates_employee')
    op.drop_table('biometric_templates')

    # Phase 4A
    op.drop_index('ix_attendance_photos_employee')
    op.drop_index('ix_attendance_photos_assignment')
    op.drop_table('attendance_photos')

    # Phase 2C
    op.drop_index('ix_roster_snapshots_org')
    op.drop_index('ix_roster_snapshots_roster')
    op.drop_table('roster_snapshots')

    # Phase 2A
    op.drop_index('ix_audit_logs_entity_type')
    op.drop_index('ix_audit_logs_org_created')
    op.drop_index('ix_audit_logs_org_entity')
    op.drop_table('audit_logs')

    # Phase 1F
    op.drop_table('organization_payroll_configs')

    # Phase 1D
    op.drop_index('ix_payroll_summary_org_id')
    op.drop_index('ix_payroll_summary_status')
    op.drop_column('payroll_summary', 'paid_at')
    op.drop_column('payroll_summary', 'approved_at')
    op.drop_column('payroll_summary', 'approved_by')
    op.drop_column('payroll_summary', 'status')
    op.drop_column('payroll_summary', 'org_id')
