"""Wave 12 — Patrol tour tables (patrol_tours, patrol_checkpoints, patrol_runs, patrol_scans).

Revision ID: wave12_patrol_001
Revises: wave10_mobile_001
Create Date: 2026-02-19
"""

from alembic import op
import sqlalchemy as sa

revision = 'wave12_patrol_001'
down_revision = 'wave10_mobile_001'
branch_labels = None
depends_on = None


def upgrade():
    # ------------------------------------------------------------------
    # patrol_tours
    # ------------------------------------------------------------------
    op.create_table(
        'patrol_tours',
        sa.Column('tour_id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.org_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['site_id'], ['sites.site_id']),
        sa.PrimaryKeyConstraint('tour_id'),
    )
    op.create_index('ix_patrol_tours_tour_id', 'patrol_tours', ['tour_id'])
    op.create_index('ix_patrol_tours_org_id', 'patrol_tours', ['org_id'])
    op.create_index('ix_patrol_tours_site_id', 'patrol_tours', ['site_id'])

    # ------------------------------------------------------------------
    # patrol_checkpoints
    # ------------------------------------------------------------------
    op.create_table(
        'patrol_checkpoints',
        sa.Column('checkpoint_id', sa.Integer(), nullable=False),
        sa.Column('tour_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order_num', sa.Integer(), nullable=False),
        sa.Column('qr_code', sa.String(500), nullable=True),
        sa.Column('nfc_tag', sa.String(500), nullable=True),
        sa.Column('gps_lat', sa.Float(), nullable=True),
        sa.Column('gps_lng', sa.Float(), nullable=True),
        sa.Column('photo_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['tour_id'], ['patrol_tours.tour_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('checkpoint_id'),
    )
    op.create_index('ix_patrol_checkpoints_checkpoint_id', 'patrol_checkpoints', ['checkpoint_id'])
    op.create_index('ix_patrol_checkpoints_tour_id', 'patrol_checkpoints', ['tour_id'])

    # ------------------------------------------------------------------
    # patrol_run_status enum
    # ------------------------------------------------------------------
    patrol_run_status = sa.Enum('in_progress', 'completed', 'abandoned', name='patrolrunstatus')
    patrol_run_status.create(op.get_bind())

    # ------------------------------------------------------------------
    # patrol_runs
    # ------------------------------------------------------------------
    op.create_table(
        'patrol_runs',
        sa.Column('run_id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('tour_id', sa.Integer(), nullable=False),
        sa.Column('assignment_id', sa.Integer(), nullable=True),
        sa.Column('started_by_employee_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum('in_progress', 'completed', 'abandoned', name='patrolrunstatus'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.org_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tour_id'], ['patrol_tours.tour_id']),
        sa.ForeignKeyConstraint(['assignment_id'], ['shift_assignments.assignment_id']),
        sa.ForeignKeyConstraint(['started_by_employee_id'], ['employees.employee_id']),
        sa.PrimaryKeyConstraint('run_id'),
    )
    op.create_index('ix_patrol_runs_run_id', 'patrol_runs', ['run_id'])
    op.create_index('ix_patrol_runs_org_id', 'patrol_runs', ['org_id'])
    op.create_index('ix_patrol_runs_tour_id', 'patrol_runs', ['tour_id'])
    op.create_index('ix_patrol_runs_assignment_id', 'patrol_runs', ['assignment_id'])
    op.create_index('ix_patrol_runs_started_by_employee_id', 'patrol_runs', ['started_by_employee_id'])
    op.create_index('ix_patrol_runs_status', 'patrol_runs', ['status'])

    # ------------------------------------------------------------------
    # patrol_scans
    # ------------------------------------------------------------------
    op.create_table(
        'patrol_scans',
        sa.Column('scan_id', sa.Integer(), nullable=False),
        sa.Column('run_id', sa.Integer(), nullable=False),
        sa.Column('checkpoint_id', sa.Integer(), nullable=False),
        sa.Column('scanned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('photo_url', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['run_id'], ['patrol_runs.run_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['checkpoint_id'], ['patrol_checkpoints.checkpoint_id']),
        sa.PrimaryKeyConstraint('scan_id'),
    )
    op.create_index('ix_patrol_scans_scan_id', 'patrol_scans', ['scan_id'])
    op.create_index('ix_patrol_scans_run_id', 'patrol_scans', ['run_id'])
    op.create_index('ix_patrol_scans_checkpoint_id', 'patrol_scans', ['checkpoint_id'])


def downgrade():
    op.drop_table('patrol_scans')
    op.drop_table('patrol_runs')
    op.drop_table('patrol_checkpoints')
    op.drop_table('patrol_tours')
    sa.Enum(name='patrolrunstatus').drop(op.get_bind())
