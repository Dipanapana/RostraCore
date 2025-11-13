"""add supervisors and incident reporting

Revision ID: 012_add_supervisors_and_reporting
Revises: 011_add_clients_and_leave
Create Date: 2025-11-09 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '012_add_supervisors_and_reporting'
down_revision = '011_add_clients_and_leave'
branch_labels = None
depends_on = None


def upgrade():
    # Add supervisor fields to employees table
    op.add_column('employees', sa.Column('is_supervisor', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('employees', sa.Column('province', sa.String(length=50), nullable=True))

    # Update sites table with supervisor assignment
    op.add_column('sites', sa.Column('supervisor_id', sa.Integer(), nullable=True))
    op.add_column('sites', sa.Column('province', sa.String(length=50), nullable=True))
    op.create_foreign_key('fk_sites_supervisor_id', 'sites', 'employees', ['supervisor_id'], ['employee_id'], ondelete='SET NULL')

    # Create employee_clients junction table (guards assigned to specific clients)
    op.create_table(
        'employee_clients',
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('employee_id', 'client_id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.employee_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ondelete='CASCADE'),
    )

    # Create incident_reports table (PSIRA-compliant)
    op.create_table(
        'incident_reports',
        sa.Column('incident_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('supervisor_id', sa.Integer(), nullable=True),
        sa.Column('incident_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reported_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        # Incident classification
        sa.Column('incident_type', sa.String(length=50), nullable=False),
        # Types: theft, burglary, assault, trespassing, vandalism, suspicious_activity,
        # fire, medical_emergency, equipment_failure, access_control_breach, other
        sa.Column('severity', sa.String(length=20), nullable=False),  # low, medium, high, critical
        sa.Column('incident_category', sa.String(length=50), nullable=True),
        # Categories: crime, safety, operational, client_property, environmental

        # Location details
        sa.Column('location_details', sa.Text(), nullable=True),
        sa.Column('exact_location', sa.String(length=500), nullable=True),

        # Incident description
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('action_taken', sa.Text(), nullable=True),
        sa.Column('outcome', sa.Text(), nullable=True),

        # Parties involved
        sa.Column('suspect_details', sa.Text(), nullable=True),
        sa.Column('victim_details', sa.Text(), nullable=True),
        sa.Column('witness_details', sa.Text(), nullable=True),

        # Official response
        sa.Column('police_notified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('police_case_number', sa.String(length=100), nullable=True),
        sa.Column('police_station', sa.String(length=200), nullable=True),
        sa.Column('client_notified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('client_notified_at', sa.DateTime(timezone=True), nullable=True),

        # Medical/Emergency
        sa.Column('injuries_reported', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('medical_attention_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('ambulance_called', sa.Boolean(), nullable=False, server_default='false'),

        # Property/Evidence
        sa.Column('property_damage', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('property_damage_description', sa.Text(), nullable=True),
        sa.Column('estimated_loss_value', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('evidence_collected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('evidence_description', sa.Text(), nullable=True),

        # Attachments
        sa.Column('photos_attached', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('photo_urls', sa.JSON(), nullable=True),
        sa.Column('document_urls', sa.JSON(), nullable=True),

        # Supervisor review
        sa.Column('supervisor_reviewed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('supervisor_comments', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),

        # Follow-up
        sa.Column('follow_up_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('follow_up_notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='open'),
        # Status: open, under_investigation, resolved, closed

        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        sa.PrimaryKeyConstraint('incident_id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.employee_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['site_id'], ['sites.site_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['supervisor_id'], ['employees.employee_id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_incident_reports_employee_id'), 'incident_reports', ['employee_id'], unique=False)
    op.create_index(op.f('ix_incident_reports_site_id'), 'incident_reports', ['site_id'], unique=False)
    op.create_index(op.f('ix_incident_reports_incident_date'), 'incident_reports', ['incident_date'], unique=False)
    op.create_index(op.f('ix_incident_reports_incident_type'), 'incident_reports', ['incident_type'], unique=False)
    op.create_index(op.f('ix_incident_reports_status'), 'incident_reports', ['status'], unique=False)

    # Create daily_occurrence_books table (Daily OB)
    op.create_table(
        'daily_occurrence_books',
        sa.Column('ob_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('shift_id', sa.Integer(), nullable=True),
        sa.Column('ob_date', sa.Date(), nullable=False),
        sa.Column('shift_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('shift_end', sa.DateTime(timezone=True), nullable=True),

        # Weather and conditions
        sa.Column('weather_conditions', sa.String(length=100), nullable=True),
        sa.Column('site_conditions', sa.Text(), nullable=True),

        # Shift activities
        sa.Column('patrol_rounds_completed', sa.Integer(), nullable=True),
        sa.Column('patrol_notes', sa.Text(), nullable=True),
        sa.Column('visitors_logged', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('visitor_details', sa.JSON(), nullable=True),  # Array of visitor objects

        # Equipment checks
        sa.Column('equipment_checked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('equipment_status', sa.Text(), nullable=True),
        sa.Column('equipment_issues', sa.Text(), nullable=True),

        # Incidents
        sa.Column('incidents_reported', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('incident_summary', sa.Text(), nullable=True),

        # General observations
        sa.Column('observations', sa.Text(), nullable=True),
        sa.Column('unusual_activities', sa.Text(), nullable=True),

        # Handover
        sa.Column('handover_notes', sa.Text(), nullable=True),
        sa.Column('relieving_officer_id', sa.Integer(), nullable=True),
        sa.Column('relieving_officer_name', sa.String(length=200), nullable=True),
        sa.Column('handover_completed', sa.Boolean(), nullable=False, server_default='false'),

        # Keys and assets
        sa.Column('keys_handed_over', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('keys_description', sa.Text(), nullable=True),

        # Supervisor review
        sa.Column('supervisor_id', sa.Integer(), nullable=True),
        sa.Column('supervisor_reviewed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('supervisor_comments', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),

        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        sa.PrimaryKeyConstraint('ob_id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.employee_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['site_id'], ['sites.site_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shift_id'], ['shifts.shift_id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['relieving_officer_id'], ['employees.employee_id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['supervisor_id'], ['employees.employee_id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_daily_occurrence_books_employee_id'), 'daily_occurrence_books', ['employee_id'], unique=False)
    op.create_index(op.f('ix_daily_occurrence_books_site_id'), 'daily_occurrence_books', ['site_id'], unique=False)
    op.create_index(op.f('ix_daily_occurrence_books_ob_date'), 'daily_occurrence_books', ['ob_date'], unique=False)


def downgrade():
    # Drop tables
    op.drop_index(op.f('ix_daily_occurrence_books_ob_date'), table_name='daily_occurrence_books')
    op.drop_index(op.f('ix_daily_occurrence_books_site_id'), table_name='daily_occurrence_books')
    op.drop_index(op.f('ix_daily_occurrence_books_employee_id'), table_name='daily_occurrence_books')
    op.drop_table('daily_occurrence_books')

    op.drop_index(op.f('ix_incident_reports_status'), table_name='incident_reports')
    op.drop_index(op.f('ix_incident_reports_incident_type'), table_name='incident_reports')
    op.drop_index(op.f('ix_incident_reports_incident_date'), table_name='incident_reports')
    op.drop_index(op.f('ix_incident_reports_site_id'), table_name='incident_reports')
    op.drop_index(op.f('ix_incident_reports_employee_id'), table_name='incident_reports')
    op.drop_table('incident_reports')

    op.drop_table('employee_clients')

    op.drop_constraint('fk_sites_supervisor_id', 'sites', type_='foreignkey')
    op.drop_column('sites', 'province')
    op.drop_column('sites', 'supervisor_id')

    op.drop_column('employees', 'province')
    op.drop_column('employees', 'is_supervisor')
