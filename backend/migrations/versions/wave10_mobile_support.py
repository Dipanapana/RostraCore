"""Wave 10: Add mobile app support tables — incidents, notifications, push_tokens.

Revision ID: wave10_mobile_001
Revises: wave7_invoice_001
Create Date: 2026-02-18

Creates:
- incidents: security incident reports from guards via mobile app
- notifications: in-app notifications per user
- push_tokens: Expo/FCM push notification device tokens
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision = 'wave10_mobile_001'
down_revision = 'wave7_invoice_001'
branch_labels = None
depends_on = None


def upgrade():
    # =========================================================================
    # INCIDENTS TABLE
    # =========================================================================
    op.create_table(
        'incidents',
        sa.Column('incident_id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=True),
        sa.Column('shift_id', sa.Integer(), nullable=True),
        sa.Column('reported_by_employee_id', sa.Integer(), nullable=True),
        sa.Column('reported_by_user_id', sa.Integer(), nullable=True),
        sa.Column('incident_type', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column(
            'severity',
            sa.Enum('low', 'medium', 'high', 'critical', name='incidentseverity'),
            nullable=False,
            server_default='medium',
        ),
        sa.Column(
            'status',
            sa.Enum('reported', 'investigating', 'resolved', 'closed', name='incidentstatus'),
            nullable=False,
            server_default='reported',
        ),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('photo_urls', ARRAY(sa.String()), nullable=True),
        sa.Column('reported_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('incident_id'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.org_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['site_id'], ['sites.site_id']),
        sa.ForeignKeyConstraint(['shift_id'], ['shifts.shift_id']),
        sa.ForeignKeyConstraint(['reported_by_employee_id'], ['employees.employee_id']),
        sa.ForeignKeyConstraint(['reported_by_user_id'], ['users.user_id']),
    )
    op.create_index('ix_incidents_incident_id', 'incidents', ['incident_id'])
    op.create_index('ix_incidents_org_id', 'incidents', ['org_id'])
    op.create_index('ix_incidents_site_id', 'incidents', ['site_id'])
    op.create_index('ix_incidents_shift_id', 'incidents', ['shift_id'])
    op.create_index('ix_incidents_reported_by_employee_id', 'incidents', ['reported_by_employee_id'])
    op.create_index('ix_incidents_reported_by_user_id', 'incidents', ['reported_by_user_id'])
    op.create_index('ix_incidents_status', 'incidents', ['status'])
    op.create_index('ix_incidents_reported_at', 'incidents', ['reported_at'])

    # =========================================================================
    # NOTIFICATIONS TABLE
    # =========================================================================
    op.create_table(
        'notifications',
        sa.Column('notification_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column(
            'notification_type',
            sa.Enum(
                'shift_reminder', 'shift_change', 'shift_cancelled',
                'incident', 'leave_update', 'general',
                name='notificationtype',
            ),
            nullable=False,
            server_default='general',
        ),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('notification_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.org_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_notifications_notification_id', 'notifications', ['notification_id'])
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_org_id', 'notifications', ['org_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])

    # =========================================================================
    # PUSH_TOKENS TABLE
    # =========================================================================
    op.create_table(
        'push_tokens',
        sa.Column('token_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(500), nullable=False),
        sa.Column('platform', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('token_id'),
        sa.UniqueConstraint('token', name='uq_push_tokens_token'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_push_tokens_token_id', 'push_tokens', ['token_id'])
    op.create_index('ix_push_tokens_user_id', 'push_tokens', ['user_id'])


def downgrade():
    # Drop in reverse order (no FK dependencies between these three)
    op.drop_index('ix_push_tokens_user_id', table_name='push_tokens')
    op.drop_index('ix_push_tokens_token_id', table_name='push_tokens')
    op.drop_table('push_tokens')

    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_is_read', table_name='notifications')
    op.drop_index('ix_notifications_org_id', table_name='notifications')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_index('ix_notifications_notification_id', table_name='notifications')
    op.drop_table('notifications')
    op.execute("DROP TYPE IF EXISTS notificationtype")

    op.drop_index('ix_incidents_reported_at', table_name='incidents')
    op.drop_index('ix_incidents_status', table_name='incidents')
    op.drop_index('ix_incidents_reported_by_user_id', table_name='incidents')
    op.drop_index('ix_incidents_reported_by_employee_id', table_name='incidents')
    op.drop_index('ix_incidents_shift_id', table_name='incidents')
    op.drop_index('ix_incidents_site_id', table_name='incidents')
    op.drop_index('ix_incidents_org_id', table_name='incidents')
    op.drop_index('ix_incidents_incident_id', table_name='incidents')
    op.drop_table('incidents')
    op.execute("DROP TYPE IF EXISTS incidentseverity")
    op.execute("DROP TYPE IF EXISTS incidentstatus")
