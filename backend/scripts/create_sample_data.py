"""
Create sample data for RostraCore MVP testing.

This script creates:
- 40 Security Guards (Employees)
- 2 Clients
- 6 Sites (3 for each client)
- Guard-Client assignments

Run with: python -m scripts.create_sample_data
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization
from app.models.employee import Employee, EmployeeStatus
from app.models.client import Client
from app.models.site import Site
from datetime import datetime, date
import random

# South African names for realistic data
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

# PSIRA grades
PSIRA_GRADES = ["Grade A", "Grade B", "Grade C", "Grade D", "Grade E"]


def create_sample_data():
    """Create sample data for testing."""
    db: Session = SessionLocal()

    try:
        print("Creating sample data for RostraCore MVP...")
        print("=" * 60)

        # ================================================================
        # 1. GET TEST ORGANIZATION
        # ================================================================
        print("\n[1] Finding Test Organization...")

        test_org = db.query(Organization).filter(
            Organization.org_code == "TEST_SECURITY"
        ).first()

        if not test_org:
            print("    ERROR: Test organization not found!")
            print("    Please run create_test_users.py first to create the test organization.")
            return

        print(f"    Found: {test_org.company_name} (ID: {test_org.org_id})")

        # ================================================================
        # 2. CREATE CLIENTS
        # ================================================================
        print("\n[2] Creating Clients...")

        clients_data = [
            {
                "client_name": "Sandton City Shopping Centre",
                "contact_person": "John Smith",
                "contact_email": "security@sandtoncity.co.za",
                "contact_phone": "+27 11 217 6000",
                "address": "83 Rivonia Road, Sandhurst, Sandton, 2196",
                "billing_rate": 85.00,
                "payment_terms": "Net 30",
                "contract_start": date(2024, 1, 1),
                "contract_end": date(2025, 12, 31)
            },
            {
                "client_name": "Menlyn Park Shopping Centre",
                "contact_person": "Sarah Johnson",
                "contact_email": "facilities@menlynpark.co.za",
                "contact_phone": "+27 12 348 9500",
                "address": "Atterbury Road & Lois Avenue, Menlyn, Pretoria, 0081",
                "billing_rate": 80.00,
                "payment_terms": "Net 30",
                "contract_start": date(2024, 2, 1),
                "contract_end": date(2025, 12, 31)
            }
        ]

        clients = []
        for client_data in clients_data:
            # Check if client already exists
            existing_client = db.query(Client).filter(
                Client.tenant_id == test_org.org_id,
                Client.client_name == client_data["client_name"]
            ).first()

            if existing_client:
                print(f"    Client already exists: {client_data['client_name']}")
                clients.append(existing_client)
            else:
                client = Client(
                    tenant_id=test_org.org_id,
                    **client_data,
                    is_active=True
                )
                db.add(client)
                clients.append(client)
                print(f"    Created: {client_data['client_name']}")

        db.commit()
        for client in clients:
            db.refresh(client)

        print(f"    Total Clients: {len(clients)}")

        # ================================================================
        # 3. CREATE SITES
        # ================================================================
        print("\n[3] Creating Sites...")

        sites_data = [
            # Sandton City sites
            {
                "client": clients[0],
                "site_name": "Sandton City - Main Entrance",
                "address": "83 Rivonia Road, Main Entrance, Sandton",
                "required_guards": 4
            },
            {
                "client": clients[0],
                "site_name": "Sandton City - Parking Level P1",
                "address": "83 Rivonia Road, Parking P1, Sandton",
                "required_guards": 3
            },
            {
                "client": clients[0],
                "site_name": "Sandton City - Control Room",
                "address": "83 Rivonia Road, Control Room, Sandton",
                "required_guards": 2
            },
            # Menlyn Park sites
            {
                "client": clients[1],
                "site_name": "Menlyn Park - Main Entrance",
                "address": "Atterbury Road, Main Entrance, Menlyn",
                "required_guards": 3
            },
            {
                "client": clients[1],
                "site_name": "Menlyn Park - Parking Area",
                "address": "Atterbury Road, Parking Area, Menlyn",
                "required_guards": 3
            },
            {
                "client": clients[1],
                "site_name": "Menlyn Park - VIP Section",
                "address": "Atterbury Road, VIP Section, Menlyn",
                "required_guards": 2
            }
        ]

        sites = []
        for site_data in sites_data:
            client = site_data.pop("client")

            # Check if site already exists
            existing_site = db.query(Site).filter(
                Site.tenant_id == test_org.org_id,
                Site.site_name == site_data["site_name"]
            ).first()

            if existing_site:
                print(f"    Site already exists: {site_data['site_name']}")
                sites.append(existing_site)
            else:
                site = Site(
                    tenant_id=test_org.org_id,
                    client_id=client.client_id,
                    **site_data,
                    site_code=f"SITE{len(sites)+1:03d}",
                    is_active=True
                )
                db.add(site)
                sites.append(site)
                print(f"    Created: {site_data['site_name']}")

        db.commit()
        for site in sites:
            db.refresh(site)

        print(f"    Total Sites: {len(sites)}")

        # ================================================================
        # 4. CREATE 40 SECURITY GUARDS
        # ================================================================
        print("\n[4] Creating 40 Security Guards...")

        # Count existing guards
        existing_guards = db.query(Employee).filter(
            Employee.tenant_id == test_org.org_id
        ).count()

        guards_to_create = 40 - existing_guards

        if guards_to_create <= 0:
            print(f"    Already have {existing_guards} guards. Skipping creation.")
            guards = db.query(Employee).filter(
                Employee.tenant_id == test_org.org_id
            ).all()
        else:
            print(f"    Creating {guards_to_create} new guards...")

            guards = []
            for i in range(guards_to_create):
                # Generate random guard data
                first_name = random.choice(FIRST_NAMES)
                last_name = random.choice(LAST_NAMES)

                guard_number = existing_guards + i + 1

                guard = Employee(
                    tenant_id=test_org.org_id,
                    employee_number=f"GRD{guard_number:04d}",
                    first_name=first_name,
                    last_name=last_name,
                    id_number=f"{random.randint(6000000, 9999999):07d}{random.randint(1000, 9999)}",
                    phone=f"+27 {random.randint(60, 89)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
                    email=f"{first_name.lower()}.{last_name.lower()}{guard_number}@testsecurity.co.za",
                    date_of_birth=date(random.randint(1975, 2000), random.randint(1, 12), random.randint(1, 28)),
                    hire_date=date(2024, random.randint(1, 11), random.randint(1, 28)),
                    hourly_rate=random.choice([45.00, 50.00, 55.00, 60.00, 65.00]),
                    employment_status=EmployeeStatus.ACTIVE,
                    psira_registration=f"PSR{random.randint(1000000, 9999999)}",
                    psira_expiry=date(2025, random.randint(6, 12), random.randint(1, 28)),
                    psira_grade=random.choice(PSIRA_GRADES),
                    is_active=True
                )
                db.add(guard)
                guards.append(guard)

                if (i + 1) % 10 == 0:
                    print(f"    Created {i + 1}/{guards_to_create} guards...")

            db.commit()
            for guard in guards:
                db.refresh(guard)

            # Get all guards
            guards = db.query(Employee).filter(
                Employee.tenant_id == test_org.org_id
            ).all()

        print(f"    Total Guards: {len(guards)}")

        # ================================================================
        # 5. ASSIGN GUARDS TO CLIENTS
        # ================================================================
        print("\n[5] Assigning Guards to Clients...")

        # Split guards between clients
        mid_point = len(guards) // 2

        # Assign first half to Sandton City
        sandton_guards = guards[:mid_point]
        for guard in sandton_guards:
            guard.assigned_client_id = clients[0].client_id

        # Assign second half to Menlyn Park
        menlyn_guards = guards[mid_point:]
        for guard in menlyn_guards:
            guard.assigned_client_id = clients[1].client_id

        db.commit()

        print(f"    Assigned {len(sandton_guards)} guards to {clients[0].client_name}")
        print(f"    Assigned {len(menlyn_guards)} guards to {clients[1].client_name}")

        # ================================================================
        # SUMMARY
        # ================================================================
        print("\n" + "=" * 60)
        print("SUCCESS: SAMPLE DATA CREATED!")
        print("=" * 60)

        print(f"""
SUMMARY:

Organization: {test_org.company_name}
  Org Code:   {test_org.org_code}

Clients: {len(clients)}
  1. {clients[0].client_name}
     - Contact: {clients[0].contact_person}
     - Rate: R{clients[0].billing_rate}/hour
     - Sites: 3 (Main Entrance, Parking P1, Control Room)
     - Guards: {len(sandton_guards)}

  2. {clients[1].client_name}
     - Contact: {clients[1].contact_person}
     - Rate: R{clients[1].billing_rate}/hour
     - Sites: 3 (Main Entrance, Parking Area, VIP Section)
     - Guards: {len(menlyn_guards)}

Sites: {len(sites)}
  - Sandton City sites: 3
  - Menlyn Park sites: 3
  - Total required guards: {sum(site.required_guards for site in sites)}

Security Guards: {len(guards)}
  - Active guards: {len([g for g in guards if g.employment_status == EmployeeStatus.ACTIVE])}
  - PSIRA registered: {len([g for g in guards if g.psira_registration])}
  - Average hourly rate: R{sum(g.hourly_rate for g in guards) / len(guards):.2f}

NEXT STEPS:

1. View Clients:
   GET /api/v1/clients

2. View Sites:
   GET /api/v1/sites

3. View Employees (Guards):
   GET /api/v1/employees

4. Generate Roster:
   POST /api/v1/roster/generate

READY FOR ROSTER GENERATION!
        """)

    except Exception as e:
        print(f"\nERROR creating sample data: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_sample_data()
