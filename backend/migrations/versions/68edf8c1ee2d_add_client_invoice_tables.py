"""Add client invoice tables

Revision ID: 68edf8c1ee2d
Revises: ea8c4d1db676
Create Date: 2025-11-17 23:13:26.532636

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '68edf8c1ee2d'
down_revision = 'ea8c4d1db676'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create client_invoices table
    op.create_table('client_invoices',
    sa.Column('invoice_id', sa.Integer(), nullable=False),
    sa.Column('client_id', sa.Integer(), nullable=False),
    sa.Column('org_id', sa.Integer(), nullable=False),
    sa.Column('invoice_number', sa.String(length=50), nullable=False),
    sa.Column('invoice_date', sa.Date(), nullable=False),
    sa.Column('period_start', sa.Date(), nullable=False),
    sa.Column('period_end', sa.Date(), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('total_hours', sa.Float(), nullable=False),
    sa.Column('total_shifts', sa.Integer(), nullable=False),
    sa.Column('subtotal', sa.Float(), nullable=False),
    sa.Column('tax_amount', sa.Float(), nullable=False),
    sa.Column('total_amount', sa.Float(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('paid_date', sa.Date(), nullable=True),
    sa.Column('payment_reference', sa.String(length=100), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ),
    sa.ForeignKeyConstraint(['org_id'], ['organizations.org_id'], ),
    sa.PrimaryKeyConstraint('invoice_id')
    )
    op.create_index(op.f('ix_client_invoices_client_id'), 'client_invoices', ['client_id'], unique=False)
    op.create_index(op.f('ix_client_invoices_invoice_date'), 'client_invoices', ['invoice_date'], unique=False)
    op.create_index(op.f('ix_client_invoices_invoice_id'), 'client_invoices', ['invoice_id'], unique=False)
    op.create_index(op.f('ix_client_invoices_invoice_number'), 'client_invoices', ['invoice_number'], unique=True)
    op.create_index(op.f('ix_client_invoices_org_id'), 'client_invoices', ['org_id'], unique=False)
    op.create_index(op.f('ix_client_invoices_period_start'), 'client_invoices', ['period_start'], unique=False)

    # Create invoice_line_items table
    op.create_table('invoice_line_items',
    sa.Column('line_item_id', sa.Integer(), nullable=False),
    sa.Column('invoice_id', sa.Integer(), nullable=False),
    sa.Column('site_id', sa.Integer(), nullable=True),
    sa.Column('description', sa.String(length=500), nullable=False),
    sa.Column('hours', sa.Float(), nullable=False),
    sa.Column('shifts', sa.Integer(), nullable=False),
    sa.Column('rate_per_hour', sa.Float(), nullable=False),
    sa.Column('amount', sa.Float(), nullable=False),
    sa.ForeignKeyConstraint(['invoice_id'], ['client_invoices.invoice_id'], ),
    sa.ForeignKeyConstraint(['site_id'], ['sites.site_id'], ),
    sa.PrimaryKeyConstraint('line_item_id')
    )
    op.create_index(op.f('ix_invoice_line_items_invoice_id'), 'invoice_line_items', ['invoice_id'], unique=False)
    op.create_index(op.f('ix_invoice_line_items_line_item_id'), 'invoice_line_items', ['line_item_id'], unique=False)
    op.create_index(op.f('ix_invoice_line_items_site_id'), 'invoice_line_items', ['site_id'], unique=False)


def downgrade() -> None:
    # Drop invoice tables
    op.drop_index(op.f('ix_invoice_line_items_site_id'), table_name='invoice_line_items')
    op.drop_index(op.f('ix_invoice_line_items_line_item_id'), table_name='invoice_line_items')
    op.drop_index(op.f('ix_invoice_line_items_invoice_id'), table_name='invoice_line_items')
    op.drop_table('invoice_line_items')

    op.drop_index(op.f('ix_client_invoices_period_start'), table_name='client_invoices')
    op.drop_index(op.f('ix_client_invoices_org_id'), table_name='client_invoices')
    op.drop_index(op.f('ix_client_invoices_invoice_number'), table_name='client_invoices')
    op.drop_index(op.f('ix_client_invoices_invoice_id'), table_name='client_invoices')
    op.drop_index(op.f('ix_client_invoices_invoice_date'), table_name='client_invoices')
    op.drop_index(op.f('ix_client_invoices_client_id'), table_name='client_invoices')
    op.drop_table('client_invoices')
