"""add cv generation service

Revision ID: 015
Revises: 014
Create Date: 2025-11-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision: str = '015'
down_revision: Union[str, None] = '014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # CV Generation Payments - Track R60 CV purchases
    op.create_table(
        'cv_purchases',
        sa.Column('purchase_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('applicant_id', sa.Integer(), sa.ForeignKey('guard_applicants.applicant_id', ondelete='CASCADE'), nullable=False, index=True),

        # Payment Details
        sa.Column('amount', sa.Numeric(10, 2), nullable=False, server_default='60.00'),
        sa.Column('payment_method', sa.String(length=50), nullable=False),  # card, eft, cash
        sa.Column('payment_reference', sa.String(length=200), nullable=True),
        sa.Column('payment_status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Generated CVs - Track all CVs generated
    op.create_table(
        'generated_cvs',
        sa.Column('cv_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('applicant_id', sa.Integer(), sa.ForeignKey('guard_applicants.applicant_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('purchase_id', sa.Integer(), sa.ForeignKey('cv_purchases.purchase_id', ondelete='SET NULL'), nullable=True),

        # CV Details
        sa.Column('template_name', sa.String(length=50), nullable=False),  # professional, modern, classic
        sa.Column('format', sa.String(length=10), nullable=False),  # pdf, docx
        sa.Column('file_url', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),  # In bytes

        # CV Content (stored for regeneration)
        sa.Column('cv_data', JSON, nullable=True),  # All the data used to generate CV

        # Download tracking
        sa.Column('download_count', sa.Integer(), default=0),
        sa.Column('last_downloaded', sa.DateTime(timezone=True), nullable=True),

        # Timestamps
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Add has_generated_cv flag to guard_applicants
    op.add_column('guard_applicants', sa.Column('has_generated_cv', sa.Boolean(), default=False))
    op.add_column('guard_applicants', sa.Column('cv_purchase_id', sa.Integer(), sa.ForeignKey('cv_purchases.purchase_id', ondelete='SET NULL'), nullable=True))

    # Create indexes
    op.create_index('idx_cv_purchases_status', 'cv_purchases', ['payment_status'])
    op.create_index('idx_generated_cvs_template', 'generated_cvs', ['template_name'])


def downgrade() -> None:
    # Remove indexes
    op.drop_index('idx_generated_cvs_template')
    op.drop_index('idx_cv_purchases_status')

    # Remove columns from guard_applicants
    op.drop_column('guard_applicants', 'cv_purchase_id')
    op.drop_column('guard_applicants', 'has_generated_cv')

    # Drop tables
    op.drop_table('generated_cvs')
    op.drop_table('cv_purchases')
