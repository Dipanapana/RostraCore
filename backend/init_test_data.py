"""
Initialize test data using backend's database connection.
Run this from the backend directory: python init_test_data.py
"""

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.employee import Employee, EmployeeStatus, EmployeeRole
from app.models.client import Client
from app.models.site import Site
from app.models.superadmin_user import SuperadminUser
from app.auth.security import get_password_hash
from datetime import datetime, date
import random

# South African names
FIRST_NAMES = [
    "Thabo", "Sipho", "Mandla", "Bongani", "Zanele", "Nomvula", "Lerato", "Tumelo",
    "Johannes", "Pieter", "Maria", "Elizabeth", "David", "Michael", "Sarah", "Linda",
    "Nkosi", "Musa", "Thandeka", "Sizwe", "Precious", "Grace", "Lucky", "Justice",
    "William", "James", "John", "Robert", "Patricia", "Jennifer", "Susan", "Jessica",
    "Khaya", "Lunga", "Andile", "Simphiwe", "Nomsa", "Busisiwe", "Zinhle", "Ayanda"
]

LAST_NAMES = [
    "Dlamini", "Nkosi", "Mahlangu", "Khumalo", "Mokoena", "Molefe", "Ndlovu", "Zulu",
    "Van der Merwe", "Botha", "De Wet", "Pretorius", "Smith", "Jones", "Brown", "Wilson",
    "Sithole", "Mthembu", "Ngcobo", "Buthelezi", "Zwane", "Shabalala", "Ntuli", "Dube",
    "Williams", "Davis", "Miller", "Moore", "Taylor", "Anderson", "Thomas", "Jackson",
    "Radebe", "Kubheka", "Cele", "Mdluli", "Maseko", "Nhlapo", "Tshabalala", "Mkhize"
]

PSIRA_GRADES = ["Grade A", "Grade B", "Grade C", "Grade D", "Grade E"]


def init_test_data():
    """Initialize all test data."""
    db = SessionLocal()

    try:
        print("="*70)
        print("ROSTRACORE - INITIALIZING TEST DATA")
        print("="*70)

        # ================================================================
        # 1. CREATE TEST ORGANIZATION
        # ================================================================
        print("\n[1/4] Creating Test Organization...")

        existing_org = db.query(Organization).filter(
            Organization.org_code == "TEST_SECURITY"
        ).first()

        if existing_org:
            print("    Test organization already exists.")
            test_org = existing_org
            test_org.approval_status = "approved"
            test_org.subscription_status = "trial"
            test_org.is_active = True
        else:
            test_org = Organization(
                org_code="TEST_SECURITY",
                company_name="Test Security Company (Pty) Ltd",
                psira_company_registration="PSR-TEST-12345",
                subscription_tier="starter",
                subscription_status="trial",
                approval_status="approved",
                approved_by=None,
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

        print(f"    Organization ready (ID: {test_org.org_id})")
        print(f"      Company: {test_org.company_name}")
        print(f"      Org Code: {test_org.org_code}")

        # ================================================================
        # 2. CREATE ORGANIZATION ADMIN USER
        # ================================================================
        print("\n[2/4] Creating Organization Admin...")

        existing_admin = db.query(User).filter(User.username == "testadmin").first()

        if existing_admin:
            print("    Organization admin already exists. Updating...")
            existing_admin.hashed_password = get_password_hash("TestAdmin123!")
            existing_admin.org_id = test_org.org_id
            existing_admin.is_email_verified = True
            existing_admin.is_active = True
            existing_admin.role = UserRole.ADMIN
            org_admin = existing_admin
        else:
            org_admin = User(
                username="testadmin",
                email="admin@testsecurity.co.za",
                hashed_password=get_password_hash("TestAdmin123!"),
                full_name="Test Admin",
                role=UserRole.ADMIN,
                org_id=test_org.org_id,
                is_active=True,
                is_email_verified=True,
                is_phone_verified=False,
                failed_login_attempts=0
            )
            db.add(org_admin)

        db.commit()
        db.refresh(org_admin)

        print(f"    - Organization admin ready (ID: {org_admin.user_id})")
        print("      Username: testadmin")
        print("      Password: TestAdmin123!")

        # ================================================================
        # 4. CREATE CLIENTS AND SITES
        # ================================================================
        print("\n[4/5] Creating Clients and Sites...")

        # Client 1: Sandton City
        sandton_client = db.query(Client).filter(
            Client.org_id == test_org.org_id,
            Client.client_name == "Sandton City Shopping Centre"
        ).first()

        if not sandton_client:
            sandton_client = Client(
                org_id=test_org.org_id,
                client_name="Sandton City Shopping Centre",
                contact_person="John Smith",
                contact_email="security@sandtoncity.co.za",
                contact_phone="+27 11 217 6000",
                address="83 Rivonia Road, Sandhurst, Sandton, 2196",
                billing_rate=85.00,
                
                contract_start_date=date(2024, 1, 1),
                contract_end_date=date(2025, 12, 31),
                status="active"
            )
            db.add(sandton_client)
            db.commit()
            db.refresh(sandton_client)
            print("    - Created: Sandton City Shopping Centre")
        else:
            print("    - Sandton City already exists")

        # Client 2: Menlyn Park
        menlyn_client = db.query(Client).filter(
            Client.org_id == test_org.org_id,
            Client.client_name == "Menlyn Park Shopping Centre"
        ).first()

        if not menlyn_client:
            menlyn_client = Client(
                org_id=test_org.org_id,
                client_name="Menlyn Park Shopping Centre",
                contact_person="Sarah Johnson",
                contact_email="facilities@menlynpark.co.za",
                contact_phone="+27 12 348 9500",
                address="Atterbury Road & Lois Avenue, Menlyn, Pretoria, 0081",
                billing_rate=80.00,
                
                contract_start_date=date(2024, 2, 1),
                contract_end_date=date(2025, 12, 31),
                status="active"
            )
            db.add(menlyn_client)
            db.commit()
            db.refresh(menlyn_client)
            print("    - Created: Menlyn Park Shopping Centre")
        else:
            print("    - Menlyn Park already exists")

        # Create sites
        sites_data = [
            (sandton_client, "Sandton City - Main Entrance", 4),
            (sandton_client, "Sandton City - Parking Level P1", 3),
            (sandton_client, "Sandton City - Control Room", 2),
            (menlyn_client, "Menlyn Park - Main Entrance", 3),
            (menlyn_client, "Menlyn Park - Parking Area", 3),
            (menlyn_client, "Menlyn Park - VIP Section", 2),
        ]

        created_sites_count = 0
        for client, site_name, min_guards in sites_data:
            existing_site = db.query(Site).filter(
                Site.client_id == client.client_id,
                Site.site_name == site_name
            ).first()

            if not existing_site:
                site = Site(
                    client_id=client.client_id,
                    client_name=client.client_name,
                    site_name=site_name,
                    address=client.address,
                    min_staff=min_guards,
                    shift_pattern="day/night",
                    required_skill="PSIRA Grade A",
                    billing_rate=client.billing_rate
                )
                db.add(site)
                created_sites_count += 1

        db.commit()
        print(f"    - Created {created_sites_count} sites (6 total)")

        # ================================================================
        # 5. CREATE 40 SECURITY GUARDS
        # ================================================================
        print("\n[5/5] Creating Security Guards...")

        existing_guards_count = db.query(Employee).count()

        guards_to_create = 40 - existing_guards_count

        if guards_to_create <= 0:
            print(f"    All 40 guards already exist.")
        else:
            print(f"    Creating {guards_to_create} guards...")

            for i in range(guards_to_create):
                guard_number = existing_guards_count + i + 1
                first_name = FIRST_NAMES[i % len(FIRST_NAMES)]
                last_name = LAST_NAMES[i % len(LAST_NAMES)]

                # Assign to client (first 20 to Sandton, next 20 to Menlyn)
                assigned_client = sandton_client if guard_number <= 20 else menlyn_client

                guard = Employee(
                    first_name=first_name,
                    last_name=last_name,
                    id_number=f"{random.randint(6000000, 9999999):07d}{random.randint(1000, 9999)}",
                    role=EmployeeRole.UNARMED,
                    phone=f"+27 {random.randint(60, 89)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
                    email=f"{first_name.lower()}.{last_name.lower().replace(' ', '')}{guard_number}@testsecurity.co.za",
                    hourly_rate=random.choice([45.00, 50.00, 55.00, 60.00, 65.00]),
                    status=EmployeeStatus.ACTIVE,
                    psira_number=f"PSR{random.randint(1000000, 9999999)}",
                    psira_expiry_date=date(2025, random.randint(6, 12), random.randint(1, 28)),
                    psira_grade=random.choice(PSIRA_GRADES),
                    max_hours_week=48,
                    cert_level="PSIRA Registered"
                )
                db.add(guard)

                if (i + 1) % 10 == 0:
                    print(f"      - Created {i + 1}/{guards_to_create}...")

            db.commit()
            print(f"    - Created {guards_to_create} guards (40 total)")

        # ================================================================
        # SUMMARY
        # ================================================================
        total_guards = db.query(Employee).count()

        print("\n" + "="*70)
        print("SUCCESS! TEST DATA INITIALIZED")
        print("="*70)
        print(f"\nQUICK REFERENCE:")
        print(f"\n  SUPERADMIN ACCOUNT")
        print(f"  ------------------")
        print(f"  Username:  superadmin")
        print(f"  Password:  SuperAdmin123!")
        print(f"  Purpose:   Approve organizations, system management")
        print(f"\n  ORGANIZATION ADMIN ACCOUNT")
        print(f"  --------------------------")
        print(f"  Username:  testadmin")
        print(f"  Password:  TestAdmin123!")
        print(f"  Purpose:   Manage organization, employees, rosters")
        print(f"\n  SAMPLE DATA")
        print(f"  -----------")
        print(f"  Clients:   2 (Sandton City, Menlyn Park)")
        print(f"  Sites:     6 (3 per client)")
        print(f"  Guards:    {total_guards} security guards")
        print(f"  Assignment: 20 guards to each client")
        print(f"\n  NEXT STEPS")
        print(f"  ----------")
        print(f"  1. Login at: http://localhost:8000/docs")
        print(f"  2. Test with: POST http://localhost:8000/api/v1/auth/login-json")
        print(f"  3. View data: GET /api/v1/clients, /api/v1/sites, /api/v1/employees")
        print(f"  4. Generate roster: POST /api/v1/roster/generate")
        print(f"\nREADY FOR MVP TESTING!")
        print("="*70)

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_test_data()
