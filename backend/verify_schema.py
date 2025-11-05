"""Verify database schema and migrations."""

import os
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv

load_dotenv()

def verify_schema():
    """Verify that all tables and columns were created correctly."""

    print("="*70)
    print("Database Schema Verification")
    print("="*70)
    print()

    # Connect to database
    db_url = os.getenv('DATABASE_URL')
    engine = create_engine(db_url)
    inspector = inspect(engine)

    print("Connected to:", db_url.split('@')[1])  # Hide password
    print()

    # Check organizations table
    print("Checking organizations table...")
    if 'organizations' in inspector.get_table_names():
        print("  [OK] organizations table exists")
        cols = [c['name'] for c in inspector.get_columns('organizations')]
        print(f"       Columns: {', '.join(cols[:5])}...")

        # Check for data
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM organizations"))
            count = result.scalar()
            print(f"       Records: {count}")

            if count > 0:
                result = conn.execute(text("SELECT org_code, company_name FROM organizations LIMIT 1"))
                org = result.fetchone()
                print(f"       Default org: {org[0]} - {org[1]}")
    else:
        print("  [FAIL] organizations table missing!")

    print()

    # Check shift_groups table
    print("Checking shift_groups table...")
    if 'shift_groups' in inspector.get_table_names():
        print("  [OK] shift_groups table exists")
        cols = [c['name'] for c in inspector.get_columns('shift_groups')]
        print(f"       Columns: {', '.join(cols[:5])}...")
    else:
        print("  [FAIL] shift_groups table missing!")

    print()

    # Check tenant_id columns
    print("Checking tenant_id columns...")
    tables_with_tenant_id = [
        'employees', 'sites', 'shifts', 'rosters', 'shift_assignments',
        'availability', 'certifications', 'skills_matrix', 'expenses', 'attendance'
    ]

    for table in tables_with_tenant_id:
        if table in inspector.get_table_names():
            cols = [c['name'] for c in inspector.get_columns(table)]
            if 'tenant_id' in cols:
                print(f"  [OK] {table}.tenant_id exists")
            else:
                print(f"  [FAIL] {table}.tenant_id missing!")
        else:
            print(f"  [SKIP] {table} table doesn't exist yet")

    print()

    # Check PSIRA fields on employees
    print("Checking PSIRA fields on employees...")
    if 'employees' in inspector.get_table_names():
        cols = [c['name'] for c in inspector.get_columns('employees')]
        psira_fields = ['psira_grade', 'service_type', 'is_supervisor', 'is_armed']
        for field in psira_fields:
            if field in cols:
                print(f"  [OK] employees.{field} exists")
            else:
                print(f"  [FAIL] employees.{field} missing!")
    else:
        print("  [SKIP] employees table doesn't exist yet")

    print()

    # Check multi-guard site config
    print("Checking multi-guard site configuration...")
    if 'sites' in inspector.get_table_names():
        cols = [c['name'] for c in inspector.get_columns('sites')]
        site_fields = ['min_guards_per_shift', 'max_guards_per_shift', 'supervisor_ratio', 'requires_supervisor']
        for field in site_fields:
            if field in cols:
                print(f"  [OK] sites.{field} exists")
            else:
                print(f"  [FAIL] sites.{field} missing!")
    else:
        print("  [SKIP] sites table doesn't exist yet")

    print()
    print("="*70)
    print("Verification Complete!")
    print("="*70)
    print()
    print("Next steps:")
    print("  1. Start the backend server: cd backend && python -m app.main")
    print("  2. Visit API docs: http://localhost:8000/docs")
    print("  3. Test organizations endpoint: GET /api/v1/organizations/current")
    print("  4. Test shift groups endpoint: GET /api/v1/shift-groups/")

if __name__ == "__main__":
    try:
        verify_schema()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
