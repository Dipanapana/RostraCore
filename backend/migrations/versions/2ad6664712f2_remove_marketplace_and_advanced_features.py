"""remove_marketplace_and_advanced_features

Revision ID: 2ad6664712f2
Revises: 905700cf27c2
Create Date: 2025-11-17 13:16:32.406830

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2ad6664712f2'
down_revision = '905700cf27c2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove marketplace and advanced feature tables from MVP."""

    # Marketplace Features
    op.drop_table('guard_applicants', if_exists=True)
    op.drop_table('job_applications', if_exists=True)
    op.drop_table('job_postings', if_exists=True)
    op.drop_table('guard_ratings', if_exists=True)
    op.drop_table('cv_generations', if_exists=True)
    op.drop_table('marketplace_commissions', if_exists=True)
    op.drop_table('marketplace_settings', if_exists=True)
    op.drop_table('bulk_hiring_packages', if_exists=True)
    op.drop_table('premium_job_postings', if_exists=True)
    op.drop_table('generated_cvs', if_exists=True)
    op.drop_table('cv_purchases', if_exists=True)

    # Advanced Features (Post-MVP)
    op.drop_table('attendance', if_exists=True)
    op.drop_table('incident_reports', if_exists=True)
    op.drop_table('daily_occurrence_books', if_exists=True)
    op.drop_table('ob_entries', if_exists=True)
    op.drop_table('leave_requests', if_exists=True)
    op.drop_table('expenses', if_exists=True)

    # Analytics Tables
    op.drop_table('analytics_events', if_exists=True)
    op.drop_table('analytics_daily_metrics', if_exists=True)
    op.drop_table('customer_health_scores', if_exists=True)
    op.drop_table('feature_usage_stats', if_exists=True)
    op.drop_table('ab_tests', if_exists=True)
    op.drop_table('ab_test_assignments', if_exists=True)

    # Unused/Duplicate Tables
    op.drop_table('shift_groups', if_exists=True)
    op.drop_table('skills_matrices', if_exists=True)
    op.drop_table('skills_matrix', if_exists=True)
    op.drop_table('rules_configs', if_exists=True)
    op.drop_table('rules_config', if_exists=True)
    op.drop_table('superadmin_users', if_exists=True)


def downgrade() -> None:
    """Recreate tables if needed (not implemented for cleanup migration)."""
    # Note: Downgrade not implemented as this is a cleanup migration
    # If tables need to be restored, use previous migration state
    pass
