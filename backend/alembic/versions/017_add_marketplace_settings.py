"""Add marketplace settings and revise commission deduction model.

Revision ID: 017
Revises: 016
Create Date: 2025-11-09 04:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '017'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create marketplace settings table for configurable pricing.
    Update commission model to deduct from guard salary.
    """

    # Marketplace Settings table - All configurable pricing
    op.create_table(
        'marketplace_settings',
        sa.Column('setting_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('setting_key', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('setting_value', JSON, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(50), nullable=False, index=True),  # pricing, features, limits
        sa.Column('updated_by', sa.Integer(), nullable=True),  # Admin user who updated
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Insert default pricing settings
    op.execute("""
        INSERT INTO marketplace_settings (setting_key, setting_value, description, category) VALUES
        -- CV Generation
        ('cv_generation_price', '{"amount": 60, "currency": "ZAR"}', 'One-time CV generation service fee', 'pricing'),

        -- Marketplace Commission (deducted from guard)
        ('marketplace_commission', '{"amount": 500, "currency": "ZAR", "deduction_method": "split", "installments": 3}',
         'Commission deducted from hired guard salary (first payment or split over 3)', 'pricing'),

        -- Premium Job Tiers
        ('premium_job_bronze', '{"price": 200, "duration_days": 7, "boost_multiplier": 2.0, "priority_rank": 3}',
         'Bronze premium job listing', 'pricing'),
        ('premium_job_silver', '{"price": 350, "duration_days": 14, "boost_multiplier": 3.0, "priority_rank": 2}',
         'Silver premium job listing', 'pricing'),
        ('premium_job_gold', '{"price": 500, "duration_days": 30, "boost_multiplier": 5.0, "priority_rank": 1}',
         'Gold premium job listing', 'pricing'),

        -- Bulk Hiring Packages (optional - for companies who want to sponsor guards)
        ('bulk_package_starter', '{"hires": 5, "price": 2000, "price_per_hire": 400, "discount_percent": 20}',
         'Starter bulk package (company sponsors guard fees)', 'pricing'),
        ('bulk_package_professional', '{"hires": 10, "price": 3500, "price_per_hire": 350, "discount_percent": 30}',
         'Professional bulk package (company sponsors guard fees)', 'pricing'),
        ('bulk_package_enterprise', '{"hires": 25, "price": 7500, "price_per_hire": 300, "discount_percent": 40}',
         'Enterprise bulk package (company sponsors guard fees)', 'pricing')
    """)

    # Update marketplace_commissions table to track salary deductions
    op.add_column('marketplace_commissions', sa.Column('deduction_method', sa.String(50), nullable=True))  # full, split
    op.add_column('marketplace_commissions', sa.Column('installments', sa.Integer(), nullable=True))  # Number of payments (1 or 3)
    op.add_column('marketplace_commissions', sa.Column('installments_paid', sa.Integer(), default=0))  # How many paid so far
    op.add_column('marketplace_commissions', sa.Column('amount_per_installment', sa.Numeric(10, 2), nullable=True))
    op.add_column('marketplace_commissions', sa.Column('next_deduction_date', sa.Date(), nullable=True))

    # Add tracking to employees table for marketplace commission
    op.add_column('employees', sa.Column('marketplace_commission_id', sa.Integer(), sa.ForeignKey('marketplace_commissions.commission_id', ondelete='SET NULL'), nullable=True))
    op.add_column('employees', sa.Column('marketplace_commission_status', sa.String(50), nullable=True))  # pending, in_progress, completed


def downgrade():
    """Revert marketplace settings changes."""

    # Remove employee columns
    op.drop_column('employees', 'marketplace_commission_status')
    op.drop_column('employees', 'marketplace_commission_id')

    # Remove commission deduction columns
    op.drop_column('marketplace_commissions', 'next_deduction_date')
    op.drop_column('marketplace_commissions', 'amount_per_installment')
    op.drop_column('marketplace_commissions', 'installments_paid')
    op.drop_column('marketplace_commissions', 'installments')
    op.drop_column('marketplace_commissions', 'deduction_method')

    # Drop settings table
    op.drop_table('marketplace_settings')
