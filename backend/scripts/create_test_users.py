"""
Create test users for development testing.

This script creates:
1. A Superadmin user for managing organization approvals
2. An Organization Admin user for testing organization features

Run with: python -m scripts.create_test_users
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.auth.security import get_password_hash
from datetime import datetime


def create_test_users():
    """Create test users for development."""
    db: Session = SessionLocal()

    try:
        print("Creating test users for RostraCore MVP...")
        print("-" * 60)

        # ================================================================
        # 1. CREATE SUPERADMIN USER
        # ================================================================
        print("\n[1] Creating Superadmin User...")

        # Check if superadmin already exists
        existing_superadmin = db.query(User).filter(
            User.username == "superadmin"
        ).first()

        if existing_superadmin:
            print("    Superadmin already exists. Updating password...")
            existing_superadmin.hashed_password = get_password_hash("SuperAdmin123!")
            existing_superadmin.is_email_verified = True
            existing_superadmin.is_active = True
            existing_superadmin.role = UserRole.SUPERADMIN
            db.commit()
            superadmin = existing_superadmin
        else:
            superadmin = User(
                username="superadmin",
                email="superadmin@rostracore.co.za",
                hashed_password=get_password_hash("SuperAdmin123!"),
                full_name="Super Administrator",
                role=UserRole.SUPERADMIN,
                org_id=None,  # Superadmin not associated with any org
                is_active=True,
                is_email_verified=True,
                is_phone_verified=False,
                failed_login_attempts=0
            )
            db.add(superadmin)
            db.commit()
            db.refresh(superadmin)
            print("    SUCCESS: Superadmin created!")

        print("""
    Superadmin Credentials:
    ========================================================
    Username:  superadmin
    Password:  SuperAdmin123!
    Email:     superadmin@rostracore.co.za
    Role:      SUPERADMIN
    ========================================================

    Use this account to:
    - Approve/reject new organization registrations
    - Manage system-wide settings
    - Access all organizations
        """)

        # ================================================================
        # 2. CREATE TEST ORGANIZATION
        # ================================================================
        print("\n[2] Creating Test Organization...")

        # Check if test org already exists
        existing_org = db.query(Organization).filter(
            Organization.org_code == "TEST_SECURITY"
        ).first()

        if existing_org:
            print("    Test organization already exists. Using existing org...")
            test_org = existing_org
            # Update approval status to approved for testing
            test_org.approval_status = "approved"
            test_org.subscription_status = "trial"
            test_org.is_active = True
            db.commit()
        else:
            test_org = Organization(
                org_code="TEST_SECURITY",
                company_name="Test Security Company (Pty) Ltd",
                psira_company_registration="PSR-TEST-12345",
                subscription_tier="starter",
                subscription_status="trial",
                approval_status="approved",  # Pre-approved for testing
                approved_by=superadmin.user_id,
                approved_at=datetime.utcnow(),
                billing_email="billing@testsecurity.co.za",
                max_employees=30,
                max_sites=5,
                max_shifts_per_month=500,
                active_guard_count=0,
                monthly_rate_per_guard=45.00,
                current_month_cost=0.00,
                is_active=True
            )
            db.add(test_org)
            db.commit()
            db.refresh(test_org)
            print("    SUCCESS: Test organization created!")

        print("""
    Organization Details:
    ========================================================
    Company:        Test Security Company (Pty) Ltd
    Org Code:       TEST_SECURITY
    PSIRA Number:   PSR-TEST-12345
    Status:         Approved (for testing)
    Subscription:   Trial - Starter Tier
    Billing Rate:   R45.00 per guard per month
    ========================================================
        """)

        # ================================================================
        # 3. CREATE ORGANIZATION ADMIN USER
        # ================================================================
        print("\n[3] Creating Organization Admin User...")

        # Check if org admin already exists
        existing_admin = db.query(User).filter(
            User.username == "testadmin"
        ).first()

        if existing_admin:
            print("    Organization admin already exists. Updating details...")
            existing_admin.hashed_password = get_password_hash("TestAdmin123!")
            existing_admin.org_id = test_org.org_id
            existing_admin.is_email_verified = True
            existing_admin.is_active = True
            existing_admin.role = UserRole.COMPANY_ADMIN
            db.commit()
            org_admin = existing_admin
        else:
            org_admin = User(
                username="testadmin",
                email="admin@testsecurity.co.za",
                hashed_password=get_password_hash("TestAdmin123!"),
                full_name="Test Admin",
                role=UserRole.COMPANY_ADMIN,
                org_id=test_org.org_id,
                is_active=True,
                is_email_verified=True,
                is_phone_verified=False,
                failed_login_attempts=0
            )
            db.add(org_admin)
            db.commit()
            db.refresh(org_admin)
            print("    SUCCESS: Organization admin created!")

        print("""
    Organization Admin Credentials:
    ========================================================
    Username:      testadmin
    Password:      TestAdmin123!
    Email:         admin@testsecurity.co.za
    Role:          COMPANY_ADMIN
    Organization:  Test Security Company (Pty) Ltd
    ========================================================

    Use this account to:
    - Manage employees (security guards)
    - Create and manage rosters
    - Invite other users to the organization
    - Manage sites and shifts
        """)

        # ================================================================
        # SUMMARY
        # ================================================================
        print("\n" + "=" * 60)
        print("SUCCESS: TEST USERS CREATED!")
        print("=" * 60)

        print("""
QUICK REFERENCE:

+-------------------------------------------------------------+
| SUPERADMIN ACCOUNT                                          |
+-------------------------------------------------------------+
| Username: superadmin                                        |
| Password: SuperAdmin123!                                    |
| Purpose:  Approve organizations, system management          |
+-------------------------------------------------------------+

+-------------------------------------------------------------+
| ORGANIZATION ADMIN ACCOUNT                                  |
+-------------------------------------------------------------+
| Username: testadmin                                         |
| Password: TestAdmin123!                                     |
| Purpose:  Manage organization, employees, rosters           |
+-------------------------------------------------------------+

SECURITY FEATURES TO TEST:

1. Email Verification:
   [OK] Both accounts are pre-verified for testing

2. Organization Approval:
   [OK] Test organization is pre-approved for testing

3. Account Lockout:
   [!] Try 5 wrong passwords to test lockout (30 min)

4. Rate Limiting:
   [!] Try 61 requests in 1 minute to test rate limit

5. User Invitation:
   [OK] Login as testadmin and invite new users

NEXT STEPS:

1. Start the backend:
   cd backend
   uvicorn app.main:app --reload

2. Login at: http://localhost:8000/docs
   Or test with: POST http://localhost:8000/api/v1/auth/login-json

3. Test the endpoints:
   - Superadmin: /api/v1/organizations/pending-approval
   - Org Admin:  /api/v1/organizations/users/invite

READY FOR MVP TESTING!
        """)

    except Exception as e:
        print(f"\nERROR creating test users: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_test_users()
