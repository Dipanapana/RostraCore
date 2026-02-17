"""Wave 7: Add invoice-related fields to clients, client_invoices, and organizations.

Revision ID: wave7_invoice_001
Revises: ux_wave1_001
Create Date: 2026-02-17

Adds:
- clients: vat_number, billing_address, billing_email, billing_contact_name
- client_invoices: payment_terms, purchase_order_number
- organizations: bank_name, bank_account_number, bank_branch_code, bank_account_holder
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'wave7_invoice_001'
down_revision = 'ux_wave1_001'
branch_labels = None
depends_on = None


def upgrade():
    # =========================================================================
    # CLIENT TABLE - Invoice/billing fields
    # =========================================================================
    op.add_column('clients', sa.Column('vat_number', sa.String(20), nullable=True))
    op.add_column('clients', sa.Column('billing_address', sa.Text(), nullable=True))
    op.add_column('clients', sa.Column('billing_email', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('billing_contact_name', sa.String(200), nullable=True))

    # =========================================================================
    # CLIENT_INVOICES TABLE - Payment terms and PO reference
    # =========================================================================
    op.add_column('client_invoices', sa.Column('payment_terms', sa.String(50), nullable=True, server_default='Net 30'))
    op.add_column('client_invoices', sa.Column('purchase_order_number', sa.String(100), nullable=True))

    # =========================================================================
    # ORGANIZATIONS TABLE - Banking details for invoice payment instructions
    # =========================================================================
    op.add_column('organizations', sa.Column('bank_name', sa.String(100), nullable=True))
    op.add_column('organizations', sa.Column('bank_account_number', sa.String(50), nullable=True))
    op.add_column('organizations', sa.Column('bank_branch_code', sa.String(20), nullable=True))
    op.add_column('organizations', sa.Column('bank_account_holder', sa.String(200), nullable=True))


def downgrade():
    # Organizations - drop banking details
    op.drop_column('organizations', 'bank_account_holder')
    op.drop_column('organizations', 'bank_branch_code')
    op.drop_column('organizations', 'bank_account_number')
    op.drop_column('organizations', 'bank_name')

    # Client invoices - drop payment terms and PO
    op.drop_column('client_invoices', 'purchase_order_number')
    op.drop_column('client_invoices', 'payment_terms')

    # Clients - drop billing/invoice fields
    op.drop_column('clients', 'billing_contact_name')
    op.drop_column('clients', 'billing_email')
    op.drop_column('clients', 'billing_address')
    op.drop_column('clients', 'vat_number')
