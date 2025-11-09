"""Add subscription plans and role-based access control.

Revision ID: 018
Revises: 017
Create Date: 2025-11-09 05:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON
from passlib.context import CryptContext

# revision identifiers, used by Alembic.
revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def upgrade():
    """
    Create subscription plans, superadmin users, and role-based access control.
    """

    # ===== SUBSCRIPTION PLANS =====
    op.create_table(
        'subscription_plans',
        sa.Column('plan_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('plan_name', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('display_name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # Pricing
        sa.Column('monthly_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('annual_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='ZAR'),

        # Feature limits
        sa.Column('max_employees', sa.Integer(), nullable=True),  # NULL = unlimited
        sa.Column('max_sites', sa.Integer(), nullable=True),
        sa.Column('max_clients', sa.Integer(), nullable=True),
        sa.Column('max_supervisors', sa.Integer(), nullable=True),

        # Features enabled
        sa.Column('features', JSON, nullable=False, server_default='{}'),
        # Example: {"marketplace_access": true, "advanced_analytics": true, "api_access": false}

        # Status
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('sort_order', sa.Integer(), default=0),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Insert default subscription plans
    op.execute("""
        INSERT INTO subscription_plans (plan_name, display_name, description, monthly_price, annual_price, max_employees, max_sites, max_clients, max_supervisors, features, sort_order) VALUES
        ('starter', 'Starter', 'Perfect for small security companies', 499.00, 4990.00, 25, 5, 3, 2, '{"marketplace_access": true, "advanced_analytics": false, "api_access": false, "bulk_rostering": false}', 1),
        ('professional', 'Professional', 'For growing security companies', 999.00, 9990.00, 100, 20, 10, 5, '{"marketplace_access": true, "advanced_analytics": true, "api_access": false, "bulk_rostering": true}', 2),
        ('enterprise', 'Enterprise', 'For large security companies', 2499.00, 24990.00, NULL, NULL, NULL, NULL, '{"marketplace_access": true, "advanced_analytics": true, "api_access": true, "bulk_rostering": true, "priority_support": true}', 3)
    """)

    # ===== SUPERADMIN USERS =====
    op.create_table(
        'superadmin_users',
        sa.Column('superadmin_id', sa.Integer(), primary_key=True, index=True),
        sa.Column('username', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(200), nullable=False),

        # Permissions
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('permissions', JSON, nullable=False, server_default='[]'),
        # Example: ["manage_plans", "manage_orgs", "view_analytics", "manage_pricing"]

        # Security
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('login_count', sa.Integer(), default=0),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create default superadmin user
    # Username: superadmin, Password: admin123 (CHANGE THIS IN PRODUCTION!)
    hashed_password = pwd_context.hash("admin123")
    op.execute(f"""
        INSERT INTO superadmin_users (username, email, hashed_password, full_name, permissions)
        VALUES ('superadmin', 'superadmin@rostracore.com', '{hashed_password}', 'Super Administrator',
                '["manage_plans", "manage_orgs", "view_analytics", "manage_pricing", "manage_settings"]')
    """)

    # ===== UPDATE ORGANIZATIONS TABLE =====
    # Add subscription fields to organizations
    op.add_column('organizations', sa.Column('subscription_plan_id', sa.Integer(), sa.ForeignKey('subscription_plans.plan_id'), nullable=True))
    op.add_column('organizations', sa.Column('subscription_status', sa.String(50), nullable=False, server_default='trial'))
    # Status: trial, active, suspended, cancelled
    op.add_column('organizations', sa.Column('subscription_start_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('organizations', sa.Column('subscription_end_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('organizations', sa.Column('billing_cycle', sa.String(20), nullable=True))  # monthly, annual
    op.add_column('organizations', sa.Column('trial_end_date', sa.DateTime(timezone=True), nullable=True))

    # ===== ROLE-BASED ACCESS CONTROL =====
    # Add role and login permissions to employees
    op.add_column('employees', sa.Column('system_role', sa.String(50), nullable=True))
    # Roles: admin, supervisor, employee (NULL = no login access)
    op.add_column('employees', sa.Column('can_login', sa.Boolean(), default=False))
    op.add_column('employees', sa.Column('login_email', sa.String(255), nullable=True, unique=True))
    op.add_column('employees', sa.Column('login_password', sa.String(255), nullable=True))
    op.add_column('employees', sa.Column('permissions', JSON, nullable=True))
    # Example: ["view_dashboard", "manage_roster", "view_payroll", "manage_employees"]
    op.add_column('employees', sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))
    op.add_column('employees', sa.Column('login_enabled', sa.Boolean(), default=False))


def downgrade():
    """Revert subscription and RBAC changes."""

    # Remove employee RBAC columns
    op.drop_column('employees', 'login_enabled')
    op.drop_column('employees', 'last_login')
    op.drop_column('employees', 'permissions')
    op.drop_column('employees', 'login_password')
    op.drop_column('employees', 'login_email')
    op.drop_column('employees', 'can_login')
    op.drop_column('employees', 'system_role')

    # Remove organization subscription columns
    op.drop_column('organizations', 'trial_end_date')
    op.drop_column('organizations', 'billing_cycle')
    op.drop_column('organizations', 'subscription_end_date')
    op.drop_column('organizations', 'subscription_start_date')
    op.drop_column('organizations', 'subscription_status')
    op.drop_column('organizations', 'subscription_plan_id')

    # Drop tables
    op.drop_table('superadmin_users')
    op.drop_table('subscription_plans')
