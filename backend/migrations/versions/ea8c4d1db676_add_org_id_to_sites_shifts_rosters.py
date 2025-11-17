"""add_org_id_to_sites_shifts_rosters

Revision ID: ea8c4d1db676
Revises: 9959f537859a
Create Date: 2025-11-17 13:53:09.981921

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ea8c4d1db676'
down_revision = '9959f537859a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add org_id to sites, shifts, and rosters tables for multi-tenancy."""

    # Add org_id to sites table
    # Sites belong to clients, which belong to organizations
    # We'll populate from clients.org_id
    op.add_column('sites', sa.Column('org_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_sites_org_id'), 'sites', ['org_id'], unique=False)
    op.create_foreign_key('fk_sites_org_id', 'sites', 'organizations', ['org_id'], ['org_id'], ondelete='CASCADE')

    # Populate org_id from clients table
    op.execute('''
        UPDATE sites
        SET org_id = clients.org_id
        FROM clients
        WHERE sites.client_id = clients.client_id
    ''')

    # For sites without clients, set to org_id=1 (default organization)
    op.execute('UPDATE sites SET org_id = 1 WHERE org_id IS NULL')

    # Make org_id non-nullable after populating
    op.alter_column('sites', 'org_id', nullable=False)

    # Add org_id to shifts table
    # Shifts belong to sites, which belong to organizations
    # We'll populate from sites.org_id
    op.add_column('shifts', sa.Column('org_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_shifts_org_id'), 'shifts', ['org_id'], unique=False)
    op.create_foreign_key('fk_shifts_org_id', 'shifts', 'organizations', ['org_id'], ['org_id'], ondelete='CASCADE')

    # Populate org_id from sites table
    op.execute('''
        UPDATE shifts
        SET org_id = sites.org_id
        FROM sites
        WHERE shifts.site_id = sites.site_id
    ''')

    # For shifts without sites, set to org_id=1 (shouldn't happen, but safe)
    op.execute('UPDATE shifts SET org_id = 1 WHERE org_id IS NULL')

    # Make org_id non-nullable after populating
    op.alter_column('shifts', 'org_id', nullable=False)

    # Add org_id to rosters table
    # Rosters are created by users who belong to organizations
    # We'll populate from the first shift assignment in the roster
    op.add_column('rosters', sa.Column('org_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_rosters_org_id'), 'rosters', ['org_id'], unique=False)
    op.create_foreign_key('fk_rosters_org_id', 'rosters', 'organizations', ['org_id'], ['org_id'], ondelete='CASCADE')

    # Populate org_id from shift_assignments -> shifts
    op.execute('''
        UPDATE rosters
        SET org_id = (
            SELECT shifts.org_id
            FROM shift_assignments
            JOIN shifts ON shift_assignments.shift_id = shifts.shift_id
            WHERE shift_assignments.roster_id = rosters.roster_id
            LIMIT 1
        )
        WHERE org_id IS NULL
    ''')

    # For rosters without assignments, set to org_id=1
    op.execute('UPDATE rosters SET org_id = 1 WHERE org_id IS NULL')

    # Make org_id non-nullable after populating
    op.alter_column('rosters', 'org_id', nullable=False)


def downgrade() -> None:
    """Remove org_id from sites, shifts, and rosters tables."""

    # Drop rosters.org_id
    op.drop_constraint('fk_rosters_org_id', 'rosters', type_='foreignkey')
    op.drop_index(op.f('ix_rosters_org_id'), table_name='rosters')
    op.drop_column('rosters', 'org_id')

    # Drop shifts.org_id
    op.drop_constraint('fk_shifts_org_id', 'shifts', type_='foreignkey')
    op.drop_index(op.f('ix_shifts_org_id'), table_name='shifts')
    op.drop_column('shifts', 'org_id')

    # Drop sites.org_id
    op.drop_constraint('fk_sites_org_id', 'sites', type_='foreignkey')
    op.drop_index(op.f('ix_sites_org_id'), table_name='sites')
    op.drop_column('sites', 'org_id')
