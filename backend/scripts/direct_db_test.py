"""
Test direct database connection with exact .env credentials.
"""

import psycopg2
import bcrypt
from datetime import datetime

# Connection parameters from .env
conn_params = {
    "host": "localhost",
    "port": 5432,
    "database": "rostracore_db",
    "user": "postgres",
    "password": "postgres"
}

def create_test_data():
    """Create test users and sample data directly in database."""
    try:
        print("Connecting to database...")
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()

        print("Connected successfully!")

        # ================================================================
        # 1. CREATE SUPERADMIN USER
        # ================================================================
        print("\n[1] Creating Superadmin User...")

        # Check if superadmin exists
        cur.execute("SELECT user_id FROM users WHERE username = 'superadmin'")
        existing_superadmin = cur.fetchone()

        # Password hash for SuperAdmin123!
        superadmin_hash = "$2b$12$As2zXj.FfkcAwmELdGHZeOQA4q2qeySuyqrTTmwUBlAhaSMz.p4Oa"

        if existing_superadmin:
            print("    Superadmin already exists. Updating...")
            cur.execute("""
                UPDATE users
                SET hashed_password = %s,
                    is_email_verified = TRUE,
                    is_active = TRUE,
                    role = 'superadmin'
                WHERE username = 'superadmin'
            """, (superadmin_hash,))
        else:
            print("    Creating new superadmin...")
            cur.execute("""
                INSERT INTO users (
                    username, email, hashed_password, full_name, role,
                    org_id, is_active, is_email_verified, is_phone_verified,
                    failed_login_attempts, created_at
                )
                VALUES (
                    'superadmin',
                    'superadmin@rostracore.co.za',
                    %s,
                    'Super Administrator',
                    'superadmin',
                    NULL,
                    TRUE,
                    TRUE,
                    FALSE,
                    0,
                    %s
                )
            """, (superadmin_hash, datetime.utcnow()))

        conn.commit()
        print("    ✓ Superadmin created/updated!")
        print("    Username: superadmin")
        print("    Password: SuperAdmin123!")

        # ================================================================
        # 2. CREATE TEST ORGANIZATION
        # ================================================================
        print("\n[2] Creating Test Organization...")

        # Get superadmin ID
        cur.execute("SELECT user_id FROM users WHERE username = 'superadmin'")
        superadmin_id = cur.fetchone()[0]

        # Check if test org exists
        cur.execute("SELECT org_id FROM organizations WHERE org_code = 'TEST_SECURITY'")
        existing_org = cur.fetchone()

        if existing_org:
            print("    Test organization already exists.")
            test_org_id = existing_org[0]
            # Update approval status
            cur.execute("""
                UPDATE organizations
                SET approval_status = 'approved',
                    subscription_status = 'trial',
                    is_active = TRUE
                WHERE org_id = %s
            """, (test_org_id,))
        else:
            print("    Creating new test organization...")
            cur.execute("""
                INSERT INTO organizations (
                    org_code, company_name, psira_company_registration,
                    subscription_tier, subscription_status, approval_status,
                    approved_by, approved_at, billing_email,
                    max_employees, max_sites, max_shifts_per_month,
                    active_guard_count, monthly_rate_per_guard, current_month_cost,
                    is_active
                )
                VALUES (
                    'TEST_SECURITY',
                    'Test Security Company (Pty) Ltd',
                    'PSR-TEST-12345',
                    'starter',
                    'trial',
                    'approved',
                    %s,
                    %s,
                    'billing@testsecurity.co.za',
                    30,
                    5,
                    500,
                    0,
                    45.00,
                    0.00,
                    TRUE
                )
                RETURNING org_id
            """, (superadmin_id, datetime.utcnow()))
            test_org_id = cur.fetchone()[0]

        conn.commit()
        print(f"    ✓ Organization created/updated! (ID: {test_org_id})")
        print("    Company: Test Security Company (Pty) Ltd")
        print("    Org Code: TEST_SECURITY")

        # ================================================================
        # 3. CREATE ORGANIZATION ADMIN USER
        # ================================================================
        print("\n[3] Creating Organization Admin User...")

        # Check if org admin exists
        cur.execute("SELECT user_id FROM users WHERE username = 'testadmin'")
        existing_admin = cur.fetchone()

        # Password hash for TestAdmin123!
        testadmin_hash = "$2b$12$d27M9xa1Wpm9LmraU.jbL.z9Ej3vJJiJL3g5XVVm7sZ3YNN4bEXN6"

        if existing_admin:
            print("    Organization admin already exists. Updating...")
            cur.execute("""
                UPDATE users
                SET hashed_password = %s,
                    org_id = %s,
                    is_email_verified = TRUE,
                    is_active = TRUE,
                    role = 'company_admin'
                WHERE username = 'testadmin'
            """, (testadmin_hash, test_org_id))
        else:
            print("    Creating new organization admin...")
            cur.execute("""
                INSERT INTO users (
                    username, email, hashed_password, full_name, role,
                    org_id, is_active, is_email_verified, is_phone_verified,
                    failed_login_attempts, created_at
                )
                VALUES (
                    'testadmin',
                    'admin@testsecurity.co.za',
                    %s,
                    'Test Admin',
                    'company_admin',
                    %s,
                    TRUE,
                    TRUE,
                    FALSE,
                    0,
                    %s
                )
            """, (testadmin_hash, test_org_id, datetime.utcnow()))

        conn.commit()
        print("    ✓ Organization admin created/updated!")
        print("    Username: testadmin")
        print("    Password: TestAdmin123!")

        print("\n" + "="*60)
        print("SUCCESS! Test users created!")
        print("="*60)
        print("\nYou can now run the sample_data.sql script to create:")
        print("  - 2 Clients (Sandton City, Menlyn Park)")
        print("  - 6 Sites (3 per client)")
        print("  - 40 Security Guards (20 per client)")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    create_test_data()
