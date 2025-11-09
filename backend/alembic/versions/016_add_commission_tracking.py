"""Add commission tracking for marketplace revenue.

Revision ID: 016
Revises: 015
Create Date: 2025-11-09 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create commission tracking tables for marketplace revenue models.

    Revenue Streams:
    1. Per-hire commission (R500 per successful hire)
    2. Premium job postings (featured listings)
    3. Bulk hiring packages
    """

    # Marketplace Commissions table
    op.create_table(
        'marketplace_commissions',
        sa.Column('commission_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('commission_type', sa.String(50), nullable=False, index=True),  # hire, premium_job, bulk_package

        # Commission details
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='ZAR'),
        sa.Column('description', sa.Text(), nullable=True),

        # Related records
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('job_postings.job_id', ondelete='SET NULL'), nullable=True),
        sa.Column('application_id', sa.Integer(), sa.ForeignKey('job_applications.application_id', ondelete='SET NULL'), nullable=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='SET NULL'), nullable=True),

        # Payment tracking
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),  # pending, paid, waived, refunded
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('payment_reference', sa.String(200), nullable=True),

        # Metadata
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Premium Job Postings table
    op.create_table(
        'premium_job_postings',
        sa.Column('premium_job_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('job_postings.job_id', ondelete='CASCADE'), nullable=False, unique=True, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),

        # Premium features
        sa.Column('featured', sa.Boolean(), default=True),  # Highlighted in search results
        sa.Column('priority_rank', sa.Integer(), default=1),  # Higher = appears first
        sa.Column('badge_color', sa.String(50), nullable=True),  # Gold, silver, bronze
        sa.Column('boost_multiplier', sa.Float(), default=2.0),  # Visibility multiplier

        # Duration
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('auto_renew', sa.Boolean(), default=False),

        # Pricing
        sa.Column('price_paid', sa.Numeric(10, 2), nullable=False),
        sa.Column('payment_status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),

        # Analytics
        sa.Column('views_count', sa.Integer(), default=0),
        sa.Column('applications_count', sa.Integer(), default=0),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Bulk Hiring Packages table
    op.create_table(
        'bulk_hiring_packages',
        sa.Column('package_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),

        # Package details
        sa.Column('package_type', sa.String(50), nullable=False, index=True),  # starter, professional, enterprise
        sa.Column('hires_quota', sa.Integer(), nullable=False),  # Number of hires included
        sa.Column('hires_used', sa.Integer(), default=0),  # Hires consumed
        sa.Column('price_paid', sa.Numeric(10, 2), nullable=False),
        sa.Column('discount_percentage', sa.Float(), nullable=True),  # Discount given

        # Validity
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),  # NULL = unlimited validity
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),  # active, expired, cancelled

        # Payment
        sa.Column('payment_status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payment_reference', sa.String(200), nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Add commission tracking fields to job_applications
    op.add_column('job_applications', sa.Column('commission_charged', sa.Boolean(), default=False))
    op.add_column('job_applications', sa.Column('commission_id', sa.Integer(), sa.ForeignKey('marketplace_commissions.commission_id', ondelete='SET NULL'), nullable=True))
    op.add_column('job_applications', sa.Column('package_id', sa.Integer(), sa.ForeignKey('bulk_hiring_packages.package_id', ondelete='SET NULL'), nullable=True))

    # Add premium indicator to job_postings
    op.add_column('job_postings', sa.Column('is_premium', sa.Boolean(), default=False, index=True))


def downgrade():
    """Revert commission tracking changes."""

    # Remove added columns
    op.drop_column('job_postings', 'is_premium')
    op.drop_column('job_applications', 'package_id')
    op.drop_column('job_applications', 'commission_id')
    op.drop_column('job_applications', 'commission_charged')

    # Drop tables
    op.drop_table('bulk_hiring_packages')
    op.drop_table('premium_job_postings')
    op.drop_table('marketplace_commissions')
