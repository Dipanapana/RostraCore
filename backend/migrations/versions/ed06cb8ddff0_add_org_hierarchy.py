"""Add organizational hierarchy tables

Revision ID: ed06cb8ddff0
Revises: 963676eabe04
Create Date: 2026-02-04

This migration:
1. Creates org_hierarchy_nodes table with adjacency list pattern
2. Adds assigned_node_id to users table (hierarchy-scoped access)
3. Adds node_id to employees table (location/department assignment)
4. All new fields are nullable for backward compatibility
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ed06cb8ddff0'
down_revision = '963676eabe04'
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Create org_hierarchy_nodes table
    op.create_table(
        'org_hierarchy_nodes',
        sa.Column('node_id', sa.Integer, primary_key=True, index=True),
        sa.Column('org_id', sa.Integer, sa.ForeignKey('organizations.org_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('parent_id', sa.Integer, sa.ForeignKey('org_hierarchy_nodes.node_id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('node_type', sa.String(50), nullable=False, default='department'),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(50), nullable=True, index=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('display_order', sa.Integer, nullable=False, default=0),
        sa.Column('is_active', sa.Boolean, nullable=False, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )

    # Create index for common query patterns
    op.create_index(
        'ix_org_hierarchy_org_parent',
        'org_hierarchy_nodes',
        ['org_id', 'parent_id']
    )
    op.create_index(
        'ix_org_hierarchy_org_type',
        'org_hierarchy_nodes',
        ['org_id', 'node_type']
    )

    # Step 2: Add assigned_node_id to users table (hierarchy-scoped access)
    op.add_column(
        'users',
        sa.Column('assigned_node_id', sa.Integer, sa.ForeignKey('org_hierarchy_nodes.node_id', ondelete='SET NULL'), nullable=True, index=True)
    )

    # Step 3: Add node_id to employees table (location/department assignment)
    op.add_column(
        'employees',
        sa.Column('node_id', sa.Integer, sa.ForeignKey('org_hierarchy_nodes.node_id', ondelete='SET NULL'), nullable=True, index=True)
    )


def downgrade():
    # Remove columns from employees
    op.drop_column('employees', 'node_id')

    # Remove columns from users
    op.drop_column('users', 'assigned_node_id')

    # Drop indexes
    op.drop_index('ix_org_hierarchy_org_type', table_name='org_hierarchy_nodes')
    op.drop_index('ix_org_hierarchy_org_parent', table_name='org_hierarchy_nodes')

    # Drop org_hierarchy_nodes table
    op.drop_table('org_hierarchy_nodes')
