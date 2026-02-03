"""Add industry templates and extend organizations

Revision ID: 963676eabe04
Revises: f91508aff94e
Create Date: 2026-02-04 01:51:07.047006

This migration:
1. Creates industry_templates table with 10 pre-seeded templates
2. Adds industry_template_id to organizations (nullable first)
3. Migrates existing orgs to 'security' template
4. Makes industry_template_id non-nullable
5. Adds template_overrides JSON column
6. Adds setup_wizard_data JSON column (for Plan 00-02 wizard draft state)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


# revision identifiers, used by Alembic.
revision = '963676eabe04'
down_revision = 'f91508aff94e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: Create industry_templates table
    op.create_table(
        'industry_templates',
        sa.Column('template_id', sa.String(50), primary_key=True),
        sa.Column('display_name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('template_json', sa.JSON, nullable=False),
        sa.Column('version', sa.String(20), default='1.0', nullable=False),
        sa.Column('display_order', sa.Integer, default=0, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )

    # Step 2: Seed 10 industry templates (template_json populated from JSON files by application)
    # For migration, we insert minimal placeholders that will be updated by the app
    op.execute("""
        INSERT INTO industry_templates (template_id, display_name, description, icon, template_json, version, display_order, is_active)
        VALUES
        ('security', 'Security Services', 'Security guard management with PSIRA compliance', 'shield', '{}', '1.0', 1, true),
        ('hospitality', 'Hospitality', 'Restaurants, hotels, catering', 'utensils', '{}', '1.0', 2, true),
        ('retail', 'Retail', 'Petrol stations, shops, supermarkets', 'shopping-cart', '{}', '1.0', 3, true),
        ('government', 'Government & Municipality', 'Public sector workforce management', 'building-columns', '{}', '1.0', 4, true),
        ('nonprofit', 'Non-Profit & NGO', 'Volunteer and donor tracking', 'heart-handshake', '{}', '1.0', 5, true),
        ('healthcare', 'Healthcare', 'Hospitals, clinics, nursing', 'stethoscope', '{}', '1.0', 6, true),
        ('manufacturing', 'Manufacturing', 'Factories, production lines', 'industry', '{}', '1.0', 7, true),
        ('education', 'Education', 'Schools, universities, training', 'graduation-cap', '{}', '1.0', 8, true),
        ('logistics', 'Logistics', 'Transport, warehousing, delivery', 'truck', '{}', '1.0', 9, true),
        ('professional', 'Professional Services', 'Consulting, IT services, legal', 'briefcase', '{}', '1.0', 10, true)
    """)

    # Step 3: Add industry_template_id to organizations (NULLABLE first!)
    op.add_column('organizations',
        sa.Column('industry_template_id', sa.String(50), nullable=True)
    )

    # Step 4: Data migration - assign ALL existing orgs to 'security' template
    # This preserves backward compatibility
    organizations = table('organizations',
        column('org_id', sa.Integer),
        column('industry_template_id', sa.String)
    )
    op.execute(
        organizations.update().values(industry_template_id='security')
    )

    # Step 5: NOW make it NOT NULL (all data is populated)
    op.alter_column('organizations', 'industry_template_id', nullable=False)

    # Step 6: Add foreign key constraint
    op.create_foreign_key(
        'fk_org_industry_template',
        'organizations', 'industry_templates',
        ['industry_template_id'], ['template_id']
    )

    # Step 7: Add template_overrides JSON column for org customizations
    op.add_column('organizations',
        sa.Column('template_overrides', sa.JSON, nullable=True)
    )

    # Step 8: Add setup_wizard_data JSON column for wizard draft state (used by Plan 00-02)
    op.add_column('organizations',
        sa.Column('setup_wizard_data', sa.JSON, nullable=True)
    )


def downgrade() -> None:
    # Remove foreign key first
    op.drop_constraint('fk_org_industry_template', 'organizations', type_='foreignkey')

    # Remove columns from organizations
    op.drop_column('organizations', 'setup_wizard_data')
    op.drop_column('organizations', 'template_overrides')
    op.drop_column('organizations', 'industry_template_id')

    # Drop industry_templates table
    op.drop_table('industry_templates')
