"""add country currency models

Revision ID: a252123c5aa5
Revises: ed06cb8ddff0
Create Date: 2026-02-04 16:07:28.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a252123c5aa5'
down_revision = 'ed06cb8ddff0'
branch_labels = None
depends_on = None


def upgrade():
    # Create country_configs table
    op.create_table(
        'country_configs',
        sa.Column('config_id', sa.Integer(), nullable=False),
        sa.Column('country_code', sa.String(length=2), nullable=False),
        sa.Column('country_name', sa.String(length=200), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('config_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('config_version', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('config_id'),
        sa.UniqueConstraint('country_code')
    )
    op.create_index(op.f('ix_country_configs_config_id'), 'country_configs', ['config_id'], unique=False)
    op.create_index(op.f('ix_country_configs_country_code'), 'country_configs', ['country_code'], unique=False)

    # Create currencies table
    op.create_table(
        'currencies',
        sa.Column('currency_code', sa.String(length=3), nullable=False),
        sa.Column('currency_name', sa.String(length=100), nullable=False),
        sa.Column('symbol', sa.String(length=10), nullable=False),
        sa.Column('decimal_places', sa.Integer(), nullable=False),
        sa.Column('display_locale', sa.String(length=10), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('currency_code')
    )

    # Seed country_configs table with ZA (South Africa) as default
    op.execute("""
        INSERT INTO country_configs (country_code, country_name, is_active, config_json, config_version) VALUES
        ('ZA', 'South Africa', true, '{"currency": "ZAR", "tax_year_start": "03-01", "labor_law": {"max_hours_week": 45, "max_overtime_week": 10}}', '1.0')
    """)

    # Seed currencies table
    op.execute("""
        INSERT INTO currencies (currency_code, currency_name, symbol, decimal_places, display_locale, is_active) VALUES
        ('ZAR', 'South African Rand', 'R', 2, 'en-ZA', true),
        ('USD', 'US Dollar', '$', 2, 'en-US', true),
        ('GBP', 'British Pound Sterling', '£', 2, 'en-GB', true),
        ('EUR', 'Euro', '€', 2, 'de-DE', true),
        ('NGN', 'Nigerian Naira', '₦', 2, 'en-NG', true),
        ('KES', 'Kenyan Shilling', 'KSh', 2, 'en-KE', true),
        ('INR', 'Indian Rupee', '₹', 2, 'en-IN', true),
        ('JPY', 'Japanese Yen', '¥', 0, 'ja-JP', true),
        ('KWD', 'Kuwaiti Dinar', 'KD', 3, 'ar-KW', true)
    """)

    # Create exchange_rates table
    op.create_table(
        'exchange_rates',
        sa.Column('rate_id', sa.Integer(), nullable=False),
        sa.Column('base_currency', sa.String(length=3), nullable=False),
        sa.Column('target_currency', sa.String(length=3), nullable=False),
        sa.Column('rate', sa.Numeric(precision=18, scale=8), nullable=False),
        sa.Column('fetched_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('rate_id')
    )
    op.create_index(op.f('ix_exchange_rates_base_currency'), 'exchange_rates', ['base_currency'], unique=False)
    op.create_index(op.f('ix_exchange_rates_rate_id'), 'exchange_rates', ['rate_id'], unique=False)
    op.create_index(op.f('ix_exchange_rates_target_currency'), 'exchange_rates', ['target_currency'], unique=False)

    # Add columns to organizations table
    op.add_column('organizations', sa.Column('country_code', sa.String(length=2), server_default='ZA', nullable=False))
    op.add_column('organizations', sa.Column('primary_currency', sa.String(length=3), server_default='ZAR', nullable=False))
    op.add_column('organizations', sa.Column('multi_currency_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.create_foreign_key('fk_organizations_country_code', 'organizations', 'country_configs', ['country_code'], ['country_code'])
    op.create_foreign_key('fk_organizations_primary_currency', 'organizations', 'currencies', ['primary_currency'], ['currency_code'])

    # Alter payroll_summary columns from Float to Numeric
    op.execute("""
        ALTER TABLE payroll_summary
        ALTER COLUMN total_hours TYPE NUMERIC(10, 2) USING total_hours::numeric(10, 2),
        ALTER COLUMN overtime_hours TYPE NUMERIC(10, 2) USING overtime_hours::numeric(10, 2),
        ALTER COLUMN gross_pay TYPE NUMERIC(12, 2) USING gross_pay::numeric(12, 2),
        ALTER COLUMN expenses_total TYPE NUMERIC(12, 2) USING expenses_total::numeric(12, 2),
        ALTER COLUMN net_pay TYPE NUMERIC(12, 2) USING net_pay::numeric(12, 2)
    """)

    # Add currency tracking columns to payroll_summary
    op.add_column('payroll_summary', sa.Column('currency_code', sa.String(length=3), server_default='ZAR', nullable=False))
    op.add_column('payroll_summary', sa.Column('exchange_rate_used', sa.Numeric(precision=18, scale=8), nullable=True))
    op.add_column('payroll_summary', sa.Column('original_currency', sa.String(length=3), nullable=True))
    op.add_column('payroll_summary', sa.Column('original_gross_pay', sa.Numeric(precision=12, scale=2), nullable=True))


def downgrade():
    # Remove currency tracking columns from payroll_summary
    op.drop_column('payroll_summary', 'original_gross_pay')
    op.drop_column('payroll_summary', 'original_currency')
    op.drop_column('payroll_summary', 'exchange_rate_used')
    op.drop_column('payroll_summary', 'currency_code')

    # Revert payroll_summary columns from Numeric to Float
    op.execute("""
        ALTER TABLE payroll_summary
        ALTER COLUMN total_hours TYPE DOUBLE PRECISION USING total_hours::double precision,
        ALTER COLUMN overtime_hours TYPE DOUBLE PRECISION USING overtime_hours::double precision,
        ALTER COLUMN gross_pay TYPE DOUBLE PRECISION USING gross_pay::double precision,
        ALTER COLUMN expenses_total TYPE DOUBLE PRECISION USING expenses_total::double precision,
        ALTER COLUMN net_pay TYPE DOUBLE PRECISION USING net_pay::double precision
    """)

    # Remove columns from organizations table
    op.drop_constraint('fk_organizations_primary_currency', 'organizations', type_='foreignkey')
    op.drop_constraint('fk_organizations_country_code', 'organizations', type_='foreignkey')
    op.drop_column('organizations', 'multi_currency_enabled')
    op.drop_column('organizations', 'primary_currency')
    op.drop_column('organizations', 'country_code')

    # Drop exchange_rates table
    op.drop_index(op.f('ix_exchange_rates_target_currency'), table_name='exchange_rates')
    op.drop_index(op.f('ix_exchange_rates_rate_id'), table_name='exchange_rates')
    op.drop_index(op.f('ix_exchange_rates_base_currency'), table_name='exchange_rates')
    op.drop_table('exchange_rates')

    # Drop currencies table
    op.drop_table('currencies')

    # Drop country_configs table
    op.drop_index(op.f('ix_country_configs_country_code'), table_name='country_configs')
    op.drop_index(op.f('ix_country_configs_config_id'), table_name='country_configs')
    op.drop_table('country_configs')
