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
