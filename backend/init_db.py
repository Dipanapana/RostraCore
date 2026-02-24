#!/usr/bin/env python3
"""
Database initialization script for Railway deployment.
Creates all tables directly from SQLAlchemy models, bypassing Alembic migrations.
Use this for fresh database deployments.
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def init_database():
    """Initialize database tables from SQLAlchemy models."""
    from app.config import settings
    from app.database import engine, Base

    # Import ALL models to register them with Base.metadata
    from app.models import (
        User, Employee, Site, Shift, Availability, Certification,
        PayrollSummary, ShiftTemplate, Roster, ShiftAssignment,
        Organization, Client, SubscriptionPlan
    )
    from app.models.superadmin_invitation import SuperadminInvitation

    print(f"[init_db] Connecting to database...")
    try:
        host_info = settings.DATABASE_URL.split('@')[1].split('/')[0] if '@' in settings.DATABASE_URL else 'localhost'
        print(f"[init_db] Database host: {host_info}")
    except:
        print("[init_db] Database URL configured")

    try:
        # Create all tables
        print("[init_db] Creating tables from models...")
        Base.metadata.create_all(bind=engine)
        print("[init_db] Tables created successfully!")

        # Add missing columns if they don't exist (for schema updates without full migration)
        print("[init_db] Checking for missing columns...")
        from sqlalchemy import text

        def add_column(conn, table, col_name, col_def):
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_def}"))
                conn.commit()
            except Exception as e:
                print(f"[init_db] {table}.{col_name}: {e}")

        with engine.connect() as conn:
            # --- users table: ensure all model columns exist ---
            add_column(conn, "users", "client_id", "INTEGER REFERENCES clients(client_id)")
            add_column(conn, "users", "is_owner", "BOOLEAN DEFAULT FALSE NOT NULL")
            add_column(conn, "users", "managed_client_ids", "INTEGER[]")
            add_column(conn, "users", "is_email_verified", "BOOLEAN DEFAULT FALSE")
            add_column(conn, "users", "is_phone_verified", "BOOLEAN DEFAULT FALSE")
            add_column(conn, "users", "email_verification_token", "VARCHAR(255)")
            add_column(conn, "users", "email_verification_sent_at", "TIMESTAMPTZ")
            add_column(conn, "users", "phone_verification_code", "VARCHAR(10)")
            add_column(conn, "users", "phone_verification_sent_at", "TIMESTAMPTZ")
            add_column(conn, "users", "password_reset_token", "VARCHAR(255)")
            add_column(conn, "users", "password_reset_sent_at", "TIMESTAMPTZ")
            add_column(conn, "users", "failed_login_attempts", "INTEGER DEFAULT 0 NOT NULL")
            add_column(conn, "users", "account_locked_until", "TIMESTAMPTZ")
            add_column(conn, "users", "last_failed_login", "TIMESTAMPTZ")
            print("[init_db] Checked users columns")

            # --- organizations table ---
            add_column(conn, "organizations", "client_management_mode", "VARCHAR(20) DEFAULT 'all' NOT NULL")
            add_column(conn, "organizations", "managed_client_ids", "INTEGER[]")
            print("[init_db] Checked organizations columns")

            # CRITICAL: Set is_owner = TRUE for admin users so they keep full access
            # Without this, existing admins would have no access to any data
            try:
                result = conn.execute(text("UPDATE users SET is_owner = TRUE WHERE role = 'admin' AND is_owner = FALSE"))
                conn.commit()
                print(f"[init_db] Set is_owner=TRUE for admin users (affected: {result.rowcount})")
            except Exception as e:
                print(f"[init_db] Update admin is_owner: {e}")

            # Also set is_owner = TRUE for company_admin users
            try:
                result = conn.execute(text("UPDATE users SET is_owner = TRUE WHERE role = 'company_admin' AND is_owner = FALSE"))
                conn.commit()
                print(f"[init_db] Set is_owner=TRUE for company_admin users (affected: {result.rowcount})")
            except Exception as e:
                print(f"[init_db] Update company_admin is_owner: {e}")

            # Fix any employee emails with spaces (from test data with surnames like "van der Merwe")
            try:
                result = conn.execute(text("UPDATE employees SET email = REPLACE(email, ' ', '') WHERE email LIKE '% %'"))
                conn.commit()
                print(f"[init_db] Fixed invalid employee emails (affected: {result.rowcount})")
            except Exception as e:
                print(f"[init_db] Fix employee emails: {e}")

        # List created tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"[init_db] Tables in database ({len(tables)}): {', '.join(sorted(tables))}")

        return True
    except Exception as e:
        print(f"[init_db] Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
