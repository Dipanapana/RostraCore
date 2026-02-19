"""Wave 36: Add guard_restrictions table (personnel blacklisting)

Revision ID: wave36_guard_restrictions
Revises: d1e1f2043ef1
Create Date: 2026-02-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'wave36_guard_restrictions'
down_revision = 'd1e1f2043ef1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'guard_restrictions',
        sa.Column('restriction_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=True),
        sa.Column('site_id', sa.Integer(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(
            ['employee_id'], ['employees.employee_id'],
            name='fk_guard_restrictions_employee', ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['client_id'], ['clients.client_id'],
            name='fk_guard_restrictions_client', ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['site_id'], ['sites.site_id'],
            name='fk_guard_restrictions_site', ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('restriction_id'),
    )

    op.create_index('ix_guard_restrictions_org_id', 'guard_restrictions', ['org_id'])
    op.create_index('ix_guard_restrictions_employee_id', 'guard_restrictions', ['employee_id'])
    op.create_index('ix_guard_restrictions_client_id', 'guard_restrictions', ['client_id'])
    op.create_index('ix_guard_restrictions_site_id', 'guard_restrictions', ['site_id'])


def downgrade():
    op.drop_index('ix_guard_restrictions_site_id', table_name='guard_restrictions')
    op.drop_index('ix_guard_restrictions_client_id', table_name='guard_restrictions')
    op.drop_index('ix_guard_restrictions_employee_id', table_name='guard_restrictions')
    op.drop_index('ix_guard_restrictions_org_id', table_name='guard_restrictions')
    op.drop_table('guard_restrictions')
