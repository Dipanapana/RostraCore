"""add psira job market

Revision ID: 014
Revises: 013
Create Date: 2025-11-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision: str = '014'
down_revision: Union[str, None] = '013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Guard Applicants table - PSIRA-certified guards seeking employment
    op.create_table(
        'guard_applicants',
        sa.Column('applicant_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('full_name', sa.String(length=200), nullable=False),
        sa.Column('email', sa.String(length=200), nullable=False, unique=True, index=True),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('password_hash', sa.String(length=200), nullable=False),

        # PSIRA Details
        sa.Column('psira_number', sa.String(length=50), nullable=False, unique=True, index=True),
        sa.Column('psira_grade', sa.String(length=20), nullable=False),  # A, B, C, D, E
        sa.Column('psira_expiry_date', sa.Date(), nullable=False),
        sa.Column('psira_certificate_url', sa.String(length=500), nullable=True),

        # Personal Details
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(length=20), nullable=True),
        sa.Column('id_number', sa.String(length=50), nullable=True),

        # Location
        sa.Column('street_address', sa.String(length=300), nullable=True),
        sa.Column('suburb', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('province', sa.String(length=50), nullable=False),
        sa.Column('postal_code', sa.String(length=20), nullable=True),

        # Work Preferences
        sa.Column('provinces_willing_to_work', JSON, nullable=True),  # Array of provinces
        sa.Column('available_for_work', sa.Boolean(), default=True),
        sa.Column('hourly_rate_expectation', sa.Numeric(10, 2), nullable=True),
        sa.Column('years_experience', sa.Integer(), nullable=True),
        sa.Column('skills', JSON, nullable=True),  # Array of skills
        sa.Column('languages', JSON, nullable=True),  # Array of languages

        # Additional Qualifications
        sa.Column('has_drivers_license', sa.Boolean(), default=False),
        sa.Column('drivers_license_code', sa.String(length=10), nullable=True),
        sa.Column('has_firearm_competency', sa.Boolean(), default=False),
        sa.Column('firearm_competency_expiry', sa.Date(), nullable=True),

        # Documents
        sa.Column('cv_url', sa.String(length=500), nullable=True),
        sa.Column('profile_photo_url', sa.String(length=500), nullable=True),
        sa.Column('references', JSON, nullable=True),  # Array of reference objects

        # Status
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending_verification'),
        sa.Column('verification_notes', sa.Text(), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verified_by', sa.Integer(), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()')),
    )

    # Job Postings table
    op.create_table(
        'job_postings',
        sa.Column('job_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.organization_id', ondelete='CASCADE'), nullable=False),
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('clients.client_id', ondelete='SET NULL'), nullable=True),
        sa.Column('site_id', sa.Integer(), sa.ForeignKey('sites.site_id', ondelete='SET NULL'), nullable=True),

        # Job Details
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('required_psira_grade', sa.String(length=20), nullable=False),
        sa.Column('required_skills', JSON, nullable=True),
        sa.Column('required_experience_years', sa.Integer(), nullable=True),

        # Location
        sa.Column('province', sa.String(length=50), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('remote_possible', sa.Boolean(), default=False),

        # Employment Details
        sa.Column('shift_pattern', sa.String(length=50), nullable=True),
        sa.Column('hourly_rate', sa.Numeric(10, 2), nullable=True),
        sa.Column('salary_min', sa.Numeric(10, 2), nullable=True),
        sa.Column('salary_max', sa.Numeric(10, 2), nullable=True),
        sa.Column('positions_available', sa.Integer(), nullable=False, default=1),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('contract_type', sa.String(length=50), nullable=False),  # permanent, temporary, contract
        sa.Column('contract_duration_months', sa.Integer(), nullable=True),

        # Additional Requirements
        sa.Column('requires_drivers_license', sa.Boolean(), default=False),
        sa.Column('requires_firearm_competency', sa.Boolean(), default=False),

        # Status
        sa.Column('status', sa.String(length=50), nullable=False, server_default='open'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('filled_count', sa.Integer(), default=0),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()')),
    )

    # Job Applications table
    op.create_table(
        'job_applications',
        sa.Column('application_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('job_postings.job_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('applicant_id', sa.Integer(), sa.ForeignKey('guard_applicants.applicant_id', ondelete='CASCADE'), nullable=False, index=True),

        # Application Details
        sa.Column('cover_letter', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='submitted'),

        # Review Process
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), sa.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('interview_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('interview_notes', sa.Text(), nullable=True),

        # Hiring Outcome
        sa.Column('hired', sa.Boolean(), default=False),
        sa.Column('hired_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('hired_as_employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='SET NULL'), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),

        # Timestamps
        sa.Column('applied_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()')),
    )

    # Guard Ratings table - For rating employees after they've worked
    op.create_table(
        'guard_ratings',
        sa.Column('rating_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('rated_by', sa.Integer(), sa.ForeignKey('employees.employee_id', ondelete='SET NULL'), nullable=True),  # Supervisor
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('job_postings.job_id', ondelete='SET NULL'), nullable=True),

        # Ratings (1-5 scale)
        sa.Column('overall_rating', sa.Integer(), nullable=False),
        sa.Column('punctuality_rating', sa.Integer(), nullable=True),
        sa.Column('professionalism_rating', sa.Integer(), nullable=True),
        sa.Column('competence_rating', sa.Integer(), nullable=True),
        sa.Column('reliability_rating', sa.Integer(), nullable=True),

        # Comments
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('strengths', sa.Text(), nullable=True),
        sa.Column('areas_for_improvement', sa.Text(), nullable=True),

        # Would hire again?
        sa.Column('would_rehire', sa.Boolean(), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Add average_rating field to employees table
    op.add_column('employees', sa.Column('average_rating', sa.Numeric(3, 2), nullable=True))
    op.add_column('employees', sa.Column('total_ratings', sa.Integer(), default=0))
    op.add_column('employees', sa.Column('hired_from_marketplace', sa.Boolean(), default=False))
    op.add_column('employees', sa.Column('marketplace_applicant_id', sa.Integer(), sa.ForeignKey('guard_applicants.applicant_id', ondelete='SET NULL'), nullable=True))

    # Create indexes for performance
    op.create_index('idx_job_postings_status', 'job_postings', ['status'])
    op.create_index('idx_job_postings_province', 'job_postings', ['province'])
    op.create_index('idx_job_applications_status', 'job_applications', ['status'])
    op.create_index('idx_guard_applicants_status', 'guard_applicants', ['status'])
    op.create_index('idx_guard_applicants_province', 'guard_applicants', ['province'])
    op.create_index('idx_guard_applicants_available', 'guard_applicants', ['available_for_work'])


def downgrade() -> None:
    # Remove indexes
    op.drop_index('idx_guard_applicants_available')
    op.drop_index('idx_guard_applicants_province')
    op.drop_index('idx_guard_applicants_status')
    op.drop_index('idx_job_applications_status')
    op.drop_index('idx_job_postings_province')
    op.drop_index('idx_job_postings_status')

    # Remove employee columns
    op.drop_column('employees', 'marketplace_applicant_id')
    op.drop_column('employees', 'hired_from_marketplace')
    op.drop_column('employees', 'total_ratings')
    op.drop_column('employees', 'average_rating')

    # Drop tables in reverse order
    op.drop_table('guard_ratings')
    op.drop_table('job_applications')
    op.drop_table('job_postings')
    op.drop_table('guard_applicants')
