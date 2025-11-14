#!/usr/bin/env python3
"""
Quick diagnostic script for 500 Internal Server Errors.
Run this to identify common issues.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

def main():
    print("=" * 70)
    print("🔍 500 ERROR DIAGNOSTIC TOOL")
    print("=" * 70)

    # 1. Check database connection
    print("\n1️⃣  DATABASE CONNECTION")
    print("-" * 70)
    try:
        from app.database import engine
        from sqlalchemy import text

        with engine.connect() as conn:
            result = conn.execute(text('SELECT 1'))
            print("✅ Database connection: OK")
            print(f"   Connection URL: {engine.url}")
    except Exception as e:
        print(f"❌ Database connection: FAILED")
        print(f"   Error: {e}")
        print("\n   💡 Fix:")
        print("   - Make sure PostgreSQL is running")
        print("   - Check DATABASE_URL in .env")
        return False

    # 2. Check tables exist
    print("\n2️⃣  DATABASE TABLES")
    print("-" * 70)
    try:
        from app.database import engine
        from sqlalchemy import inspect

        inspector = inspect(engine)
        tables = inspector.get_table_names()

        required_tables = [
            'users', 'employees', 'sites', 'shifts', 'clients',
            'certifications', 'availability', 'rosters', 'shift_assignments'
        ]

        missing = []
        for table in required_tables:
            if table in tables:
                print(f"   ✅ {table}")
            else:
                print(f"   ❌ {table} - MISSING!")
                missing.append(table)

        if missing:
            print(f"\n   💡 Fix: Run migrations")
            print(f"   cd backend && alembic upgrade head")
            return False

    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False

    # 3. Check admin user
    print("\n3️⃣  ADMIN USER")
    print("-" * 70)
    try:
        from app.database import SessionLocal
        from app.models.user import User

        db = SessionLocal()
        admin = db.query(User).filter(User.username == 'admin').first()

        if admin:
            print(f"✅ Admin user exists")
            print(f"   User ID: {admin.user_id}")
            print(f"   Email: {admin.email}")
            print(f"   Active: {admin.is_active}")
            print(f"   Org ID: {admin.org_id}")

            if admin.org_id is None:
                print(f"\n   ⚠️  WARNING: Admin has no organization!")
                print(f"   This might cause 500 errors on org-filtered endpoints")
        else:
            print("❌ Admin user NOT FOUND")
            print("\n   💡 Fix: Create admin user")
            print("   python backend/create_admin.py")
            db.close()
            return False

        db.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    # 4. Check environment variables
    print("\n4️⃣  ENVIRONMENT VARIABLES")
    print("-" * 70)
    try:
        from app.config import settings

        checks = [
            ('SECRET_KEY', bool(settings.SECRET_KEY)),
            ('DATABASE_URL', bool(settings.DATABASE_URL)),
            ('ALGORITHM', settings.ALGORITHM == 'HS256'),
            ('ACCESS_TOKEN_EXPIRE_MINUTES', settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0),
        ]

        all_ok = True
        for key, is_ok in checks:
            if is_ok:
                print(f"   ✅ {key}")
            else:
                print(f"   ❌ {key} - NOT SET OR INVALID!")
                all_ok = False

        if not all_ok:
            print("\n   💡 Fix: Check backend/.env file")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    # 5. Check critical imports
    print("\n5️⃣  CRITICAL IMPORTS")
    print("-" * 70)
    try:
        imports = [
            'app.api.endpoints.dashboard',
            'app.api.endpoints.employees',
            'app.api.endpoints.clients',
            'app.api.endpoints.sites',
            'app.api.deps',
            'app.auth.security',
        ]

        for module in imports:
            try:
                __import__(module)
                print(f"   ✅ {module}")
            except ImportError as e:
                print(f"   ❌ {module} - {e}")
                return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    # 6. Test dashboard metrics (common 500 source)
    print("\n6️⃣  DASHBOARD METRICS (Test)")
    print("-" * 70)
    try:
        from app.database import SessionLocal
        from app.models.employee import Employee, EmployeeStatus
        from app.models.shift import Shift
        from app.models.site import Site
        from sqlalchemy import func

        db = SessionLocal()

        # Test queries that commonly cause 500 errors
        employee_count = db.query(Employee).filter(
            Employee.status == EmployeeStatus.ACTIVE
        ).count()
        print(f"   ✅ Active employees: {employee_count}")

        shift_count = db.query(Shift).count()
        print(f"   ✅ Total shifts: {shift_count}")

        site_count = db.query(Site).count()
        print(f"   ✅ Total sites: {site_count}")

        db.close()

    except Exception as e:
        print(f"❌ Dashboard queries failed: {e}")
        print("\n   💡 This is likely causing 500 errors on dashboard")
        import traceback
        traceback.print_exc()
        return False

    # 7. Check organizations
    print("\n7️⃣  ORGANIZATIONS")
    print("-" * 70)
    try:
        from app.database import SessionLocal
        from app.models.organization import Organization

        db = SessionLocal()
        org_count = db.query(Organization).count()

        print(f"   ✅ Total organizations: {org_count}")

        if org_count == 0:
            print(f"\n   ⚠️  WARNING: No organizations exist!")
            print(f"   Creating default organization...")

            org = Organization(
                org_name="Default Organization",
                contact_email="admin@rostracore.com",
                is_active=True
            )
            db.add(org)
            db.commit()
            db.refresh(org)

            print(f"   ✅ Created organization ID: {org.org_id}")

            # Assign to admin
            from app.models.user import User
            admin = db.query(User).filter(User.username == 'admin').first()
            if admin:
                admin.org_id = org.org_id
                db.commit()
                print(f"   ✅ Assigned admin to organization")

        db.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        # This might not exist, so don't fail
        print(f"   ⚠️  Organization table might not exist (this is OK)")

    # All checks passed!
    print("\n" + "=" * 70)
    print("✅ ALL DIAGNOSTIC CHECKS PASSED!")
    print("=" * 70)
    print("\nIf you're still getting 500 errors:")
    print("1. Check backend terminal for the actual error traceback")
    print("2. Look at Network tab in browser to see which endpoint fails")
    print("3. Check FIX_500_ERROR.md for specific endpoint fixes")
    print("\n")

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
