"""Industry gap closure: emergency alerts, lone worker, chat, report schedules,
post orders, PSIRA rates, POPIA, firearms, location pings, forms, client portal.

Revision ID: 020
Revises: 019
Create Date: 2026-02-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '020'
down_revision = '019'
branch_labels = None
depends_on = None


def upgrade():
    # --- 1. Emergency Alerts ---
    op.create_table(
        'emergency_alerts',
        sa.Column('alert_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id'), nullable=True),
        sa.Column('triggered_by_user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('alert_type', sa.String(20), nullable=False, server_default='panic'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('site_id', sa.Integer(), sa.ForeignKey('sites.site_id'), nullable=True),
        sa.Column('shift_id', sa.Integer(), sa.ForeignKey('shifts.shift_id'), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('related_incident_id', sa.Integer(), sa.ForeignKey('incidents.incident_id'), nullable=True),
        sa.Column('acknowledged_by_user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('triggered_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_emergency_alerts_org_id', 'emergency_alerts', ['org_id'])
    op.create_index('ix_emergency_alerts_employee_id', 'emergency_alerts', ['employee_id'])
    op.create_index('ix_emergency_alerts_triggered_by', 'emergency_alerts', ['triggered_by_user_id'])
    op.create_index('ix_emergency_alerts_status', 'emergency_alerts', ['status'])
    op.create_index('ix_emergency_alerts_site_id', 'emergency_alerts', ['site_id'])
    op.create_index('ix_emergency_alerts_triggered_at', 'emergency_alerts', ['triggered_at'])

    # --- 2. Lone Worker Sessions ---
    op.create_table(
        'lone_worker_sessions',
        sa.Column('session_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('shift_id', sa.Integer(), sa.ForeignKey('shifts.shift_id'), nullable=True),
        sa.Column('site_id', sa.Integer(), sa.ForeignKey('sites.site_id'), nullable=True),
        sa.Column('check_in_interval_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('last_check_in', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('next_check_in_due', sa.DateTime(timezone=True), nullable=False),
        sa.Column('missed_check_ins', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('escalation_level', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_latitude', sa.Float(), nullable=True),
        sa.Column('last_longitude', sa.Float(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_lone_worker_sessions_org_id', 'lone_worker_sessions', ['org_id'])
    op.create_index('ix_lone_worker_sessions_employee_id', 'lone_worker_sessions', ['employee_id'])
    op.create_index('ix_lone_worker_sessions_site_id', 'lone_worker_sessions', ['site_id'])
    op.create_index('ix_lone_worker_sessions_status', 'lone_worker_sessions', ['status'])
    op.create_index('ix_lone_worker_sessions_started_at', 'lone_worker_sessions', ['started_at'])

    # --- 3. Chat Channels ---
    op.create_table(
        'chat_channels',
        sa.Column('channel_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('channel_type', sa.String(20), nullable=False, server_default='group'),
        sa.Column('name', sa.String(200), nullable=True),
        sa.Column('site_id', sa.Integer(), sa.ForeignKey('sites.site_id'), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_chat_channels_org_id', 'chat_channels', ['org_id'])
    op.create_index('ix_chat_channels_site_id', 'chat_channels', ['site_id'])

    # --- 4. Channel Members ---
    op.create_table(
        'channel_members',
        sa.Column('member_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('channel_id', sa.Integer(), sa.ForeignKey('chat_channels.channel_id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_channel_members_channel_id', 'channel_members', ['channel_id'])
    op.create_index('ix_channel_members_user_id', 'channel_members', ['user_id'])

    # --- 5. Chat Messages ---
    op.create_table(
        'chat_messages',
        sa.Column('message_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('channel_id', sa.Integer(), sa.ForeignKey('chat_channels.channel_id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(20), nullable=False, server_default='text'),
        sa.Column('sent_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('read_by', JSON, nullable=True),
    )
    op.create_index('ix_chat_messages_channel_id', 'chat_messages', ['channel_id'])
    op.create_index('ix_chat_messages_sender_id', 'chat_messages', ['sender_id'])
    op.create_index('ix_chat_messages_sent_at', 'chat_messages', ['sent_at'])

    # --- 6. Report Schedules ---
    op.create_table(
        'report_schedules',
        sa.Column('schedule_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('report_type', sa.String(30), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('frequency', sa.String(20), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=True),
        sa.Column('day_of_month', sa.Integer(), nullable=True),
        sa.Column('time_of_day', sa.String(5), nullable=False, server_default='08:00'),
        sa.Column('recipients', JSON, nullable=False),
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('clients.client_id'), nullable=True),
        sa.Column('site_ids', JSON, nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.String(500), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_report_schedules_org_id', 'report_schedules', ['org_id'])

    # --- 7. Post Orders ---
    op.create_table(
        'post_orders',
        sa.Column('post_order_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('site_id', sa.Integer(), sa.ForeignKey('sites.site_id'), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('effective_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('effective_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('requires_acknowledgment', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by_user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_post_orders_org_id', 'post_orders', ['org_id'])
    op.create_index('ix_post_orders_site_id', 'post_orders', ['site_id'])
    op.create_index('ix_post_orders_status', 'post_orders', ['status'])

    # --- 8. Post Order Acknowledgments ---
    op.create_table(
        'post_order_acknowledgments',
        sa.Column('ack_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('post_order_id', sa.Integer(), sa.ForeignKey('post_orders.post_order_id', ondelete='CASCADE'), nullable=False),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id'), nullable=False),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_post_order_acks_post_order_id', 'post_order_acknowledgments', ['post_order_id'])
    op.create_index('ix_post_order_acks_employee_id', 'post_order_acknowledgments', ['employee_id'])

    # --- 9. PSIRA Wage Rates ---
    op.create_table(
        'psira_wage_rates',
        sa.Column('rate_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('effective_from', sa.Date(), nullable=False),
        sa.Column('effective_to', sa.Date(), nullable=False),
        sa.Column('grade', sa.String(2), nullable=False),
        sa.Column('area', sa.Integer(), nullable=False),
        sa.Column('rate_type', sa.String(20), nullable=False),
        sa.Column('hourly_rate', sa.Float(), nullable=False),
        sa.Column('monthly_minimum', sa.Float(), nullable=True),
    )
    op.create_index('ix_psira_wage_rates_grade', 'psira_wage_rates', ['grade'])
    op.create_index('ix_psira_wage_rates_area', 'psira_wage_rates', ['area'])
    op.create_index('ix_psira_wage_rates_rate_type', 'psira_wage_rates', ['rate_type'])

    # --- 10. POPIA Consents ---
    op.create_table(
        'popia_consents',
        sa.Column('consent_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id'), nullable=True),
        sa.Column('consent_type', sa.String(30), nullable=False),
        sa.Column('purpose', sa.Text(), nullable=False),
        sa.Column('lawful_basis', sa.String(100), nullable=False),
        sa.Column('data_categories', sa.String(500), nullable=True),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('withdrawn_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Integer(), nullable=False, server_default='1'),
    )
    op.create_index('ix_popia_consents_org_id', 'popia_consents', ['org_id'])
    op.create_index('ix_popia_consents_employee_id', 'popia_consents', ['employee_id'])

    # --- 11. Data Subject Requests ---
    op.create_table(
        'data_subject_requests',
        sa.Column('request_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('requestor_name', sa.String(200), nullable=False),
        sa.Column('requestor_email', sa.String(200), nullable=False),
        sa.Column('request_type', sa.String(20), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='received'),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('response_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('handled_by_user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=True),
    )
    op.create_index('ix_data_subject_requests_org_id', 'data_subject_requests', ['org_id'])
    op.create_index('ix_data_subject_requests_status', 'data_subject_requests', ['status'])

    # --- 12. Firearms ---
    op.create_table(
        'firearms',
        sa.Column('firearm_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('serial_number', sa.String(100), nullable=False),
        sa.Column('make', sa.String(100), nullable=False),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('caliber', sa.String(50), nullable=True),
        sa.Column('firearm_type', sa.String(50), nullable=False),
        sa.Column('license_number', sa.String(100), nullable=True),
        sa.Column('license_expiry', sa.Date(), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='in_armory'),
        sa.Column('current_holder_id', sa.Integer(), sa.ForeignKey('employees.employee_id'), nullable=True),
        sa.Column('purchase_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_firearms_org_id', 'firearms', ['org_id'])
    op.create_index('ix_firearms_serial_number', 'firearms', ['serial_number'])
    op.create_index('ix_firearms_status', 'firearms', ['status'])

    # --- 13. Firearm Issues ---
    op.create_table(
        'firearm_issues',
        sa.Column('issue_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('firearm_id', sa.Integer(), sa.ForeignKey('firearms.firearm_id', ondelete='CASCADE'), nullable=False),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id'), nullable=False),
        sa.Column('issued_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('returned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('issued_by_user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('ammunition_issued', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ammunition_returned', sa.Integer(), nullable=True),
        sa.Column('condition_on_issue', sa.String(50), nullable=False, server_default='good'),
        sa.Column('condition_on_return', sa.String(50), nullable=True),
    )
    op.create_index('ix_firearm_issues_firearm_id', 'firearm_issues', ['firearm_id'])
    op.create_index('ix_firearm_issues_employee_id', 'firearm_issues', ['employee_id'])

    # --- 14. Firearm Inspections ---
    op.create_table(
        'firearm_inspections',
        sa.Column('inspection_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('firearm_id', sa.Integer(), sa.ForeignKey('firearms.firearm_id', ondelete='CASCADE'), nullable=False),
        sa.Column('inspected_by_user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('inspection_date', sa.Date(), nullable=False),
        sa.Column('condition', sa.String(50), nullable=False),
        sa.Column('passed', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('next_inspection_due', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_firearm_inspections_firearm_id', 'firearm_inspections', ['firearm_id'])

    # --- 15. Location Pings ---
    op.create_table(
        'location_pings',
        sa.Column('ping_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id'), nullable=False),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('shift_id', sa.Integer(), sa.ForeignKey('shifts.shift_id'), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('accuracy', sa.Float(), nullable=True),
        sa.Column('battery_level', sa.Float(), nullable=True),
        sa.Column('is_moving', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_location_pings_employee_id', 'location_pings', ['employee_id'])
    op.create_index('ix_location_pings_org_id', 'location_pings', ['org_id'])
    op.create_index('ix_location_pings_shift_id', 'location_pings', ['shift_id'])
    op.create_index('ix_location_pings_timestamp', 'location_pings', ['timestamp'])

    # --- 16. Form Templates ---
    op.create_table(
        'form_templates',
        sa.Column('template_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('form_type', sa.String(50), nullable=False, server_default='checklist'),
        sa.Column('fields', JSON, nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('requires_signature', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_by_user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_form_templates_org_id', 'form_templates', ['org_id'])
    op.create_index('ix_form_templates_status', 'form_templates', ['status'])

    # --- 17. Form Submissions ---
    op.create_table(
        'form_submissions',
        sa.Column('submission_id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('form_templates.template_id', ondelete='CASCADE'), nullable=False),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False),
        sa.Column('submitted_by_user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('site_id', sa.Integer(), sa.ForeignKey('sites.site_id'), nullable=True),
        sa.Column('shift_id', sa.Integer(), sa.ForeignKey('shifts.shift_id'), nullable=True),
        sa.Column('data', JSON, nullable=False),
        sa.Column('photos', JSON, nullable=True),
        sa.Column('gps_latitude', sa.Float(), nullable=True),
        sa.Column('gps_longitude', sa.Float(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_form_submissions_template_id', 'form_submissions', ['template_id'])
    op.create_index('ix_form_submissions_org_id', 'form_submissions', ['org_id'])
    op.create_index('ix_form_submissions_submitted_by', 'form_submissions', ['submitted_by_user_id'])
    op.create_index('ix_form_submissions_site_id', 'form_submissions', ['site_id'])
    op.create_index('ix_form_submissions_submitted_at', 'form_submissions', ['submitted_at'])

    # --- 18. Add client_id to users table (client portal access) ---
    op.add_column('users', sa.Column('client_id', sa.Integer(), sa.ForeignKey('clients.client_id'), nullable=True))


def downgrade():
    # --- 18. Remove client_id from users ---
    op.drop_column('users', 'client_id')

    # --- 17. Form Submissions ---
    op.drop_index('ix_form_submissions_submitted_at')
    op.drop_index('ix_form_submissions_site_id')
    op.drop_index('ix_form_submissions_submitted_by')
    op.drop_index('ix_form_submissions_org_id')
    op.drop_index('ix_form_submissions_template_id')
    op.drop_table('form_submissions')

    # --- 16. Form Templates ---
    op.drop_index('ix_form_templates_status')
    op.drop_index('ix_form_templates_org_id')
    op.drop_table('form_templates')

    # --- 15. Location Pings ---
    op.drop_index('ix_location_pings_timestamp')
    op.drop_index('ix_location_pings_shift_id')
    op.drop_index('ix_location_pings_org_id')
    op.drop_index('ix_location_pings_employee_id')
    op.drop_table('location_pings')

    # --- 14. Firearm Inspections ---
    op.drop_index('ix_firearm_inspections_firearm_id')
    op.drop_table('firearm_inspections')

    # --- 13. Firearm Issues ---
    op.drop_index('ix_firearm_issues_employee_id')
    op.drop_index('ix_firearm_issues_firearm_id')
    op.drop_table('firearm_issues')

    # --- 12. Firearms ---
    op.drop_index('ix_firearms_status')
    op.drop_index('ix_firearms_serial_number')
    op.drop_index('ix_firearms_org_id')
    op.drop_table('firearms')

    # --- 11. Data Subject Requests ---
    op.drop_index('ix_data_subject_requests_status')
    op.drop_index('ix_data_subject_requests_org_id')
    op.drop_table('data_subject_requests')

    # --- 10. POPIA Consents ---
    op.drop_index('ix_popia_consents_employee_id')
    op.drop_index('ix_popia_consents_org_id')
    op.drop_table('popia_consents')

    # --- 9. PSIRA Wage Rates ---
    op.drop_index('ix_psira_wage_rates_rate_type')
    op.drop_index('ix_psira_wage_rates_area')
    op.drop_index('ix_psira_wage_rates_grade')
    op.drop_table('psira_wage_rates')

    # --- 8. Post Order Acknowledgments ---
    op.drop_index('ix_post_order_acks_employee_id')
    op.drop_index('ix_post_order_acks_post_order_id')
    op.drop_table('post_order_acknowledgments')

    # --- 7. Post Orders ---
    op.drop_index('ix_post_orders_status')
    op.drop_index('ix_post_orders_site_id')
    op.drop_index('ix_post_orders_org_id')
    op.drop_table('post_orders')

    # --- 6. Report Schedules ---
    op.drop_index('ix_report_schedules_org_id')
    op.drop_table('report_schedules')

    # --- 5. Chat Messages ---
    op.drop_index('ix_chat_messages_sent_at')
    op.drop_index('ix_chat_messages_sender_id')
    op.drop_index('ix_chat_messages_channel_id')
    op.drop_table('chat_messages')

    # --- 4. Channel Members ---
    op.drop_index('ix_channel_members_user_id')
    op.drop_index('ix_channel_members_channel_id')
    op.drop_table('channel_members')

    # --- 3. Chat Channels ---
    op.drop_index('ix_chat_channels_site_id')
    op.drop_index('ix_chat_channels_org_id')
    op.drop_table('chat_channels')

    # --- 2. Lone Worker Sessions ---
    op.drop_index('ix_lone_worker_sessions_started_at')
    op.drop_index('ix_lone_worker_sessions_status')
    op.drop_index('ix_lone_worker_sessions_site_id')
    op.drop_index('ix_lone_worker_sessions_employee_id')
    op.drop_index('ix_lone_worker_sessions_org_id')
    op.drop_table('lone_worker_sessions')

    # --- 1. Emergency Alerts ---
    op.drop_index('ix_emergency_alerts_triggered_at')
    op.drop_index('ix_emergency_alerts_site_id')
    op.drop_index('ix_emergency_alerts_status')
    op.drop_index('ix_emergency_alerts_triggered_by')
    op.drop_index('ix_emergency_alerts_employee_id')
    op.drop_index('ix_emergency_alerts_org_id')
    op.drop_table('emergency_alerts')
