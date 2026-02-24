#!/usr/bin/env python3
"""
Database initialization script for Railway deployment.
Creates all tables directly from SQLAlchemy models, bypassing Alembic migrations.
Automatically detects and adds missing columns to existing tables.
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
        # Create all tables that don't exist yet
        print("[init_db] Creating tables from models...")
        Base.metadata.create_all(bind=engine)
        print("[init_db] Tables created successfully!")

        # ---------------------------------------------------------------
        # Auto-sync: detect and add missing columns to existing tables
        # create_all() only creates NEW tables — it doesn't ALTER existing
        # ones.  This block introspects every model column and adds any
        # that are missing from the live database.
        # ---------------------------------------------------------------
        print("[init_db] Syncing missing columns...")
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        total_added = 0

        with engine.connect() as conn:
            for table in Base.metadata.sorted_tables:
                table_name = table.name
                if not inspector.has_table(table_name):
                    continue  # table was just created by create_all

                # Get existing columns from the database
                try:
                    existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
                except Exception:
                    continue

                # Check each model column
                for col in table.columns:
                    if col.name in existing_cols:
                        continue

                    # Build a minimal SQL type string for the ALTER TABLE
                    col_type = col.type.compile(dialect=engine.dialect)
                    nullable = "" if col.nullable else " NOT NULL"
                    default = ""
                    if col.server_default is not None:
                        default = f" DEFAULT {col.server_default.arg}"
                    elif col.default is not None and col.default.is_scalar:
                        val = col.default.arg
                        if isinstance(val, bool):
                            default = f" DEFAULT {'TRUE' if val else 'FALSE'}"
                        elif isinstance(val, (int, float)):
                            default = f" DEFAULT {val}"
                        elif isinstance(val, str):
                            default = f" DEFAULT '{val}'"

                    # For NOT NULL columns without a default, provide a safe default
                    if nullable == " NOT NULL" and default == "":
                        if "INT" in str(col_type).upper():
                            default = " DEFAULT 0"
                        elif "BOOL" in str(col_type).upper():
                            default = " DEFAULT FALSE"
                        elif "VARCHAR" in str(col_type).upper() or "TEXT" in str(col_type).upper():
                            default = " DEFAULT ''"

                    sql = f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col.name} {col_type}{nullable}{default}"
                    try:
                        conn.execute(text(sql))
                        conn.commit()
                        total_added += 1
                        print(f"[init_db]   + {table_name}.{col.name} ({col_type})")
                    except Exception as e:
                        print(f"[init_db]   ! {table_name}.{col.name}: {e}")
                        try:
                            conn.rollback()
                        except Exception:
                            pass

        print(f"[init_db] Column sync complete — {total_added} columns added")

        # ---------------------------------------------------------------
        # Data fixes
        # ---------------------------------------------------------------
        from sqlalchemy import text as _t
        with engine.connect() as conn:
            # Set is_owner = TRUE for admin users so they keep full access
            try:
                result = conn.execute(_t("UPDATE users SET is_owner = TRUE WHERE role = 'admin' AND is_owner = FALSE"))
                conn.commit()
                print(f"[init_db] Set is_owner=TRUE for admin users (affected: {result.rowcount})")
            except Exception as e:
                print(f"[init_db] Update admin is_owner: {e}")

            # Also set is_owner = TRUE for company_admin users
            try:
                result = conn.execute(_t("UPDATE users SET is_owner = TRUE WHERE role = 'company_admin' AND is_owner = FALSE"))
                conn.commit()
                print(f"[init_db] Set is_owner=TRUE for company_admin users (affected: {result.rowcount})")
            except Exception as e:
                print(f"[init_db] Update company_admin is_owner: {e}")

            # Fix any employee emails with spaces
            try:
                result = conn.execute(_t("UPDATE employees SET email = REPLACE(email, ' ', '') WHERE email LIKE '% %'"))
                conn.commit()
                print(f"[init_db] Fixed invalid employee emails (affected: {result.rowcount})")
            except Exception as e:
                print(f"[init_db] Fix employee emails: {e}")

        # List tables
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
