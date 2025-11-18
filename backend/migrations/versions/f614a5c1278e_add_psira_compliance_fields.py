"""add_psira_compliance_fields

Revision ID: f614a5c1278e
Revises: 1af9fd120774
Create Date: 2025-11-18 14:25:06.227153

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'f614a5c1278e'
down_revision = '1af9fd120774'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create PSIRA grade enum type
    psira_grade_enum = postgresql.ENUM('GRADE_E', 'GRADE_D', 'GRADE_C', 'GRADE_B', 'GRADE_A', name='psiragrade')
    psira_grade_enum.create(op.get_bind(), checkfirst=True)

    # Create firearm competency enum type
    firearm_enum = postgresql.ENUM('HANDGUN', 'SHOTGUN', 'RIFLE', 'AUTOMATIC', name='firearmcompetencytype')
    firearm_enum.create(op.get_bind(), checkfirst=True)

    # Add PSIRA fields to certifications table
    op.add_column('certifications', sa.Column('psira_grade', sa.Enum('GRADE_E', 'GRADE_D', 'GRADE_C', 'GRADE_B', 'GRADE_A', name='psiragrade'), nullable=True))
    op.add_column('certifications', sa.Column('firearm_competency', sa.Enum('HANDGUN', 'SHOTGUN', 'RIFLE', 'AUTOMATIC', name='firearmcompetencytype'), nullable=True))
    op.create_index('ix_certifications_psira_grade', 'certifications', ['psira_grade'], unique=False)

    # Add PSIRA fields to shifts table
    op.add_column('shifts', sa.Column('required_psira_grade', sa.Enum('GRADE_E', 'GRADE_D', 'GRADE_C', 'GRADE_B', 'GRADE_A', name='psiragrade'), nullable=True))
    op.add_column('shifts', sa.Column('requires_firearm', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('shifts', sa.Column('required_firearm_type', sa.Enum('HANDGUN', 'SHOTGUN', 'RIFLE', 'AUTOMATIC', name='firearmcompetencytype'), nullable=True))
    op.create_index('ix_shifts_required_psira_grade', 'shifts', ['required_psira_grade'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_shifts_required_psira_grade', table_name='shifts')
    op.drop_index('ix_certifications_psira_grade', table_name='certifications')

    # Drop columns from shifts
    op.drop_column('shifts', 'required_firearm_type')
    op.drop_column('shifts', 'requires_firearm')
    op.drop_column('shifts', 'required_psira_grade')

    # Drop columns from certifications
    op.drop_column('certifications', 'firearm_competency')
    op.drop_column('certifications', 'psira_grade')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS firearmcompetencytype')
    op.execute('DROP TYPE IF EXISTS psiragrade')
