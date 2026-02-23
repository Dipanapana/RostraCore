"""Create the 17 new tables from the Industry Gap Closure plan."""
import logging
logging.disable(logging.INFO)

from app.database import engine
from sqlalchemy import text

SQL = """
CREATE TABLE IF NOT EXISTS emergency_alerts (
    alert_id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(employee_id),
    triggered_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    alert_type VARCHAR(20) NOT NULL DEFAULT 'panic',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    latitude FLOAT, longitude FLOAT,
    site_id INTEGER REFERENCES sites(site_id),
    shift_id INTEGER REFERENCES shifts(shift_id),
    notes TEXT,
    related_incident_id INTEGER REFERENCES incidents(incident_id),
    acknowledged_by_user_id INTEGER REFERENCES users(user_id),
    acknowledged_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_ea_org ON emergency_alerts(org_id);
CREATE INDEX IF NOT EXISTS ix_ea_status ON emergency_alerts(status);

CREATE TABLE IF NOT EXISTS lone_worker_sessions (
    session_id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    shift_id INTEGER REFERENCES shifts(shift_id),
    site_id INTEGER REFERENCES sites(site_id),
    check_in_interval_minutes INTEGER NOT NULL DEFAULT 60,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_check_in_due TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    missed_check_ins INTEGER NOT NULL DEFAULT 0,
    escalation_level INTEGER NOT NULL DEFAULT 0,
    last_latitude FLOAT, last_longitude FLOAT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_lw_org ON lone_worker_sessions(org_id);
CREATE INDEX IF NOT EXISTS ix_lw_status ON lone_worker_sessions(status);

CREATE TABLE IF NOT EXISTS chat_channels (
    channel_id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    channel_type VARCHAR(20) NOT NULL DEFAULT 'group',
    name VARCHAR(200),
    site_id INTEGER REFERENCES sites(site_id),
    created_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_cc_org ON chat_channels(org_id);

CREATE TABLE IF NOT EXISTS channel_members (
    member_id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES chat_channels(channel_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chat_messages (
    message_id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES chat_channels(channel_id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(user_id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_by JSONB
);
CREATE INDEX IF NOT EXISTS ix_cm_channel ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS ix_cm_sent ON chat_messages(sent_at);

CREATE TABLE IF NOT EXISTS report_schedules (
    schedule_id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    report_type VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    day_of_week INTEGER, day_of_month INTEGER,
    time_of_day VARCHAR(5) NOT NULL DEFAULT '08:00',
    recipients JSONB NOT NULL DEFAULT '[]',
    client_id INTEGER REFERENCES clients(client_id),
    site_ids JSONB,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_sent_at TIMESTAMPTZ, last_error VARCHAR(500),
    created_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_rs_org ON report_schedules(org_id);

CREATE TABLE IF NOT EXISTS post_orders (
    post_order_id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    site_id INTEGER NOT NULL REFERENCES sites(site_id),
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    effective_from TIMESTAMPTZ, effective_until TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    requires_acknowledgment BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_po_org ON post_orders(org_id);
CREATE INDEX IF NOT EXISTS ix_po_site ON post_orders(site_id);

CREATE TABLE IF NOT EXISTS post_order_acknowledgments (
    ack_id SERIAL PRIMARY KEY,
    post_order_id INTEGER NOT NULL REFERENCES post_orders(post_order_id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psira_wage_rates (
    rate_id SERIAL PRIMARY KEY,
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    grade VARCHAR(2) NOT NULL,
    area INTEGER NOT NULL,
    rate_type VARCHAR(20) NOT NULL,
    hourly_rate FLOAT NOT NULL,
    monthly_minimum FLOAT
);
CREATE INDEX IF NOT EXISTS ix_pwr_grade ON psira_wage_rates(grade);

CREATE TABLE IF NOT EXISTS popia_consents (
    consent_id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(employee_id),
    consent_type VARCHAR(30) NOT NULL,
    purpose TEXT NOT NULL,
    lawful_basis VARCHAR(100) NOT NULL,
    data_categories VARCHAR(500),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ,
    is_active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_pc_org ON popia_consents(org_id);

CREATE TABLE IF NOT EXISTS data_subject_requests (
    request_id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    requestor_name VARCHAR(200) NOT NULL,
    requestor_email VARCHAR(200) NOT NULL,
    request_type VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'received',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    response_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    handled_by_user_id INTEGER REFERENCES users(user_id)
);
CREATE INDEX IF NOT EXISTS ix_dsr_org ON data_subject_requests(org_id);

CREATE TABLE IF NOT EXISTS firearms (
    firearm_id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    caliber VARCHAR(50),
    firearm_type VARCHAR(50) NOT NULL,
    license_number VARCHAR(100),
    license_expiry DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'in_armory',
    current_holder_id INTEGER REFERENCES employees(employee_id),
    purchase_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_fa_org ON firearms(org_id);
CREATE INDEX IF NOT EXISTS ix_fa_serial ON firearms(serial_number);

CREATE TABLE IF NOT EXISTS firearm_issues (
    issue_id SERIAL PRIMARY KEY,
    firearm_id INTEGER NOT NULL REFERENCES firearms(firearm_id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    issued_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    ammunition_issued INTEGER NOT NULL DEFAULT 0,
    ammunition_returned INTEGER,
    condition_on_issue VARCHAR(50) NOT NULL DEFAULT 'good',
    condition_on_return VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS firearm_inspections (
    inspection_id SERIAL PRIMARY KEY,
    firearm_id INTEGER NOT NULL REFERENCES firearms(firearm_id) ON DELETE CASCADE,
    inspected_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    inspection_date DATE NOT NULL,
    condition VARCHAR(50) NOT NULL,
    passed INTEGER NOT NULL DEFAULT 1,
    next_inspection_due DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_pings (
    ping_id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    shift_id INTEGER REFERENCES shifts(shift_id),
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    accuracy FLOAT,
    battery_level FLOAT,
    is_moving BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_lp_employee ON location_pings(employee_id);
CREATE INDEX IF NOT EXISTS ix_lp_timestamp ON location_pings(timestamp);

CREATE TABLE IF NOT EXISTS form_templates (
    template_id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    form_type VARCHAR(50) NOT NULL DEFAULT 'checklist',
    fields JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    requires_signature BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_ft_org ON form_templates(org_id);

CREATE TABLE IF NOT EXISTS form_submissions (
    submission_id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES form_templates(template_id) ON DELETE CASCADE,
    org_id INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    submitted_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    site_id INTEGER REFERENCES sites(site_id),
    shift_id INTEGER REFERENCES shifts(shift_id),
    data JSONB NOT NULL DEFAULT '{}',
    photos JSONB,
    gps_latitude FLOAT,
    gps_longitude FLOAT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_fs_template ON form_submissions(template_id);
CREATE INDEX IF NOT EXISTS ix_fs_org ON form_submissions(org_id);
"""

with engine.connect() as conn:
    conn.execute(text(SQL))
    conn.commit()
    print("All 17 tables created successfully!")

# Verify
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
new_tables = ['emergency_alerts', 'lone_worker_sessions', 'chat_channels', 'channel_members',
              'chat_messages', 'report_schedules', 'post_orders', 'post_order_acknowledgments',
              'psira_wage_rates', 'popia_consents', 'data_subject_requests', 'firearms',
              'firearm_issues', 'firearm_inspections', 'location_pings', 'form_templates', 'form_submissions']
ok = 0
for t in new_tables:
    status = 'OK' if t in tables else 'MISSING'
    if t in tables:
        ok += 1
    print(f'  {t}: {status}')
print(f'\n{ok}/{len(new_tables)} tables created. Total tables in DB: {len(tables)}')
