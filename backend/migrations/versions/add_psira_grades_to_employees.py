"""Add PSIRA grade fields to employees

Revision ID: add_psira_grades
Revises: add_multi_tenancy
Create Date: 2025-11-05 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_psira_grades'
down_revision = 'add_multi_tenancy'
branch_labels = None
depends_on = None


def upgrade():
    # Add PSIRA-related fields
    op.add_column('employees', sa.Column('psira_grade', sa.String(length=1), nullable=True))
    op.add_column('employees', sa.Column('psira_number', sa.String(length=20), nullable=True))
    op.add_column('employees', sa.Column('psira_expiry_date', sa.Date(), nullable=True))

    # Add service type field
    op.add_column('employees', sa.Column('service_type', sa.String(length=20), nullable=True))
    # service_type: static, patrol, armed_response, control_room, supervisor

    # Add armed status and firearm competency
    op.add_column('employees', sa.Column('is_armed', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('employees', sa.Column('firearm_competency_number', sa.String(length=50), nullable=True))
    op.add_column('employees', sa.Column('firearm_competency_expiry', sa.Date(), nullable=True))

    # Add supervisor flag
    op.add_column('employees', sa.Column('is_supervisor', sa.Boolean(), server_default='false', nullable=False))

    # Add minimum monthly salary (BCEA sectoral determination)
    op.add_column('employees', sa.Column('monthly_salary', sa.Float(), nullable=True))

    # Create indexes
    op.create_index('ix_employees_psira_number', 'employees', ['psira_number'])
    op.create_index('ix_employees_psira_grade', 'employees', ['psira_grade'])
    op.create_index('ix_employees_is_supervisor', 'employees', ['is_supervisor'])

    # Add check constraints
    op.create_check_constraint(
        'ck_employees_psira_grade',
        'employees',
        "psira_grade IS NULL OR psira_grade IN ('A', 'B', 'C', 'D', 'E')"
    )

    op.create_check_constraint(
        'ck_employees_service_type',
        'employees',
        "service_type IS NULL OR service_type IN ('static', 'patrol', 'armed_response', 'control_room', 'supervisor')"
    )

    # Backfill existing data based on role (only if employees exist)
    from sqlalchemy import inspect, text
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'employees' in existing_tables:
        # Check if there are any employees
        result = conn.execute(text("SELECT COUNT(*) FROM employees"))
        employee_count = result.scalar()

        if employee_count > 0:
            # Supervisors -> Grade B (only if role column exists and has 'supervisor')
            try:
                op.execute("""
                    UPDATE employees
                    SET psira_grade = 'B',
                        service_type = 'supervisor',
                        is_supervisor = TRUE
                    WHERE role = 'supervisor'
                """)
            except:
                pass  # Role might not have this value

            # Armed -> Grade C
            try:
                op.execute("""
                    UPDATE employees
                    SET psira_grade = 'C',
                        service_type = 'patrol',
                        is_armed = TRUE
                    WHERE role = 'armed'
                """)
            except:
                pass

            # Unarmed -> Grade D
            try:
                op.execute("""
                    UPDATE employees
                    SET psira_grade = 'D',
                        service_type = 'static'
                    WHERE role = 'unarmed'
                """)
            except:
                pass


def downgrade():
    op.drop_index('ix_employees_is_supervisor', 'employees')
    op.drop_index('ix_employees_psira_grade', 'employees')
    op.drop_index('ix_employees_psira_number', 'employees')

    op.drop_constraint('ck_employees_service_type', 'employees', type_='check')
    op.drop_constraint('ck_employees_psira_grade', 'employees', type_='check')

    op.drop_column('employees', 'monthly_salary')
    op.drop_column('employees', 'is_supervisor')
    op.drop_column('employees', 'firearm_competency_expiry')
    op.drop_column('employees', 'firearm_competency_number')
    op.drop_column('employees', 'is_armed')
    op.drop_column('employees', 'service_type')
    op.drop_column('employees', 'psira_expiry_date')
    op.drop_column('employees', 'psira_number')
    op.drop_column('employees', 'psira_grade')
