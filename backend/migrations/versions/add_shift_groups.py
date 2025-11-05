"""Add shift groups table for multi-guard shift management

Revision ID: add_shift_groups
Revises: add_multi_guard_config
Create Date: 2025-11-05 11:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_shift_groups'
down_revision = 'add_multi_guard_config'
branch_labels = None
depends_on = None


def upgrade():
    # Create shift_groups table
    op.create_table(
        'shift_groups',
        sa.Column('shift_group_id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('group_name', sa.String(length=100), nullable=True),
        sa.Column('group_code', sa.String(length=50), nullable=True),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=False),
        sa.Column('required_guards', sa.Integer(), nullable=False),
        sa.Column('required_supervisors', sa.Integer(), server_default='0', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='draft', nullable=False),
        # status: draft, published, active, completed, cancelled
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.site_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['organizations.org_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('shift_group_id')
    )

    op.create_index('ix_shift_groups_tenant_id', 'shift_groups', ['tenant_id'])
    op.create_index('ix_shift_groups_site_id', 'shift_groups', ['site_id'])
    op.create_index('ix_shift_groups_status', 'shift_groups', ['status'])
    op.create_index('ix_shift_groups_start_time', 'shift_groups', ['start_time'])

    # Add shift_group_id to shifts table
    op.add_column('shifts', sa.Column('shift_group_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_shifts_shift_group_id',
        'shifts', 'shift_groups',
        ['shift_group_id'], ['shift_group_id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_shifts_shift_group_id', 'shifts', ['shift_group_id'])

    # Add position type to shifts (for multi-guard teams)
    op.add_column('shifts', sa.Column('position_type', sa.String(length=50), nullable=True))
    # position_type: supervisor, control_room, patrol, gate, armed_response, static

    op.add_column('shifts', sa.Column('required_psira_grade', sa.String(length=1), nullable=True))
    op.add_column('shifts', sa.Column('position_number', sa.Integer(), nullable=True))
    # position_number: For multiple guards in same position (e.g., Patrol 1, Patrol 2)

    # Create indexes
    op.create_index('ix_shifts_position_type', 'shifts', ['position_type'])
    op.create_index('ix_shifts_required_psira_grade', 'shifts', ['required_psira_grade'])

    # Add check constraint
    op.create_check_constraint(
        'ck_shifts_position_type',
        'shifts',
        "position_type IS NULL OR position_type IN ('supervisor', 'control_room', 'patrol', 'gate', 'armed_response', 'static')"
    )


def downgrade():
    op.drop_constraint('ck_shifts_position_type', 'shifts', type_='check')

    op.drop_index('ix_shifts_required_psira_grade', 'shifts')
    op.drop_index('ix_shifts_position_type', 'shifts')
    op.drop_column('shifts', 'position_number')
    op.drop_column('shifts', 'required_psira_grade')
    op.drop_column('shifts', 'position_type')

    op.drop_index('ix_shifts_shift_group_id', 'shifts')
    op.drop_constraint('fk_shifts_shift_group_id', 'shifts', type_='foreignkey')
    op.drop_column('shifts', 'shift_group_id')

    op.drop_index('ix_shift_groups_start_time', 'shift_groups')
    op.drop_index('ix_shift_groups_status', 'shift_groups')
    op.drop_index('ix_shift_groups_site_id', 'shift_groups')
    op.drop_index('ix_shift_groups_tenant_id', 'shift_groups')
    op.drop_table('shift_groups')
