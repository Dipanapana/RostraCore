"""
Create demo data for RostraCore - South African municipalities and sites.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal
# Import all models to ensure relationships are resolved
from app.models import *
from app.models.client import Client
from app.models.site import Site
from app.models.employee import Employee
from app.models.organization import Organization
from app.models.certification import Certification, PSIRAGrade, FirearmCompetencyType
from datetime import date, timedelta
import random

def create_demo_data():
    db = SessionLocal()
    try:
        # First get the organization - find one with employees
        org = db.query(Organization).first()
        if not org:
            print("ERROR: No organization found. Create an organization first.")
            return

        org_id = org.org_id
        print(f"Using organization: {org.company_name} (ID: {org_id})")

        # Check employees count
        employee_count = db.query(Employee).filter(Employee.org_id == org_id).count()
        print(f"Employees in org: {employee_count}")

        # If no employees have this org_id, update them
        if employee_count == 0:
            updated = db.query(Employee).filter(Employee.org_id == None).update({"org_id": org_id})
            db.commit()
            print(f"Updated {updated} employees with org_id={org_id}")

        # South African Municipalities as clients
        municipalities = [
            {"name": "Magareng Local Municipality", "contact": "Tshepiso Molefe", "email": "tmolefe@magareng.gov.za", "phone": "053-495-0000", "city": "Warrenton"},
            {"name": "Sol Plaatje Municipality", "contact": "Mpho Dikgale", "email": "mdikgale@solplaatje.gov.za", "phone": "053-830-6911", "city": "Kimberley"},
            {"name": "Rustenburg Local Municipality", "contact": "Kagiso Motsepe", "email": "kmotsepe@rustenburg.gov.za", "phone": "014-590-3111", "city": "Rustenburg"},
            {"name": "Tlokwe Local Municipality", "contact": "Lerato Modise", "email": "lmodise@tlokwe.gov.za", "phone": "018-299-5111", "city": "Potchefstroom"},
            {"name": "Matlosana Local Municipality", "contact": "Thabo Mahlangu", "email": "tmahlangu@matlosana.gov.za", "phone": "018-487-9300", "city": "Klerksdorp"},
            {"name": "Frances Baard District Municipality", "contact": "Nomvula Khumalo", "email": "nkhumalo@fbdm.gov.za", "phone": "053-838-0911", "city": "Kimberley"},
            {"name": "Madibeng Local Municipality", "contact": "Sipho Nkosi", "email": "snkosi@madibeng.gov.za", "phone": "012-318-9100", "city": "Brits"},
            {"name": "Ditsobotla Local Municipality", "contact": "Palesa Tshabalala", "email": "ptshabalala@ditsobotla.gov.za", "phone": "018-633-0400", "city": "Lichtenburg"},
        ]

        # Sites configuration for each municipality
        site_templates = {
            "Magareng Local Municipality": [
                {"name": "Magareng Municipal Offices", "address": "1 Market Street, Warrenton", "city": "Warrenton", "province": "Northern Cape", "shift_pattern": "24_7"},
                {"name": "Warrenton Water Treatment Plant", "address": "Industrial Road, Warrenton", "city": "Warrenton", "province": "Northern Cape", "shift_pattern": "24_7"},
            ],
            "Sol Plaatje Municipality": [
                {"name": "Sol Plaatje Civic Centre", "address": "Market Square, Kimberley", "city": "Kimberley", "province": "Northern Cape", "shift_pattern": "24_7"},
                {"name": "Galeshewe Stadium", "address": "Sol Plaatje Drive, Kimberley", "city": "Kimberley", "province": "Northern Cape", "shift_pattern": "day_only"},
                {"name": "Kimberley Public Library", "address": "Du Toitspan Road, Kimberley", "city": "Kimberley", "province": "Northern Cape", "shift_pattern": "day_only"},
                {"name": "Sol Plaatje Depot", "address": "Barkly Road, Kimberley", "city": "Kimberley", "province": "Northern Cape", "shift_pattern": "24_7"},
            ],
            "Rustenburg Local Municipality": [
                {"name": "Rustenburg Civic Centre", "address": "Beyers Naude Drive, Rustenburg", "city": "Rustenburg", "province": "North West", "shift_pattern": "24_7"},
                {"name": "Olympia Stadium", "address": "Nelson Mandela Drive, Rustenburg", "city": "Rustenburg", "province": "North West", "shift_pattern": "day_only"},
                {"name": "Rustenburg Water Works", "address": "Waterval Road, Rustenburg", "city": "Rustenburg", "province": "North West", "shift_pattern": "24_7"},
            ],
            "Tlokwe Local Municipality": [
                {"name": "Tlokwe Municipal Building", "address": "Wolmarans Street, Potchefstroom", "city": "Potchefstroom", "province": "North West", "shift_pattern": "24_7"},
                {"name": "Potchefstroom Community Hall", "address": "Meyer Street, Potchefstroom", "city": "Potchefstroom", "province": "North West", "shift_pattern": "day_only"},
                {"name": "Ikageng Clinic", "address": "Ikageng Township, Potchefstroom", "city": "Potchefstroom", "province": "North West", "shift_pattern": "24_7"},
            ],
            "Matlosana Local Municipality": [
                {"name": "Matlosana Civic Centre", "address": "Margaretha Prinsloo Street, Klerksdorp", "city": "Klerksdorp", "province": "North West", "shift_pattern": "24_7"},
                {"name": "Orkney Recreation Centre", "address": "Main Road, Orkney", "city": "Orkney", "province": "North West", "shift_pattern": "day_only"},
                {"name": "Stilfontein Library", "address": "Central Avenue, Stilfontein", "city": "Stilfontein", "province": "North West", "shift_pattern": "day_only"},
                {"name": "Klerksdorp Dam", "address": "Dam Road, Klerksdorp", "city": "Klerksdorp", "province": "North West", "shift_pattern": "24_7"},
            ],
            "Frances Baard District Municipality": [
                {"name": "Frances Baard Head Office", "address": "51 Drakensberg Avenue, Kimberley", "city": "Kimberley", "province": "Northern Cape", "shift_pattern": "24_7"},
                {"name": "District Training Centre", "address": "Memorial Road, Kimberley", "city": "Kimberley", "province": "Northern Cape", "shift_pattern": "day_only"},
            ],
            "Madibeng Local Municipality": [
                {"name": "Madibeng Municipal Offices", "address": "Van Velden Street, Brits", "city": "Brits", "province": "North West", "shift_pattern": "24_7"},
                {"name": "Hartbeespoort Admin Building", "address": "Scott Street, Hartbeespoort", "city": "Hartbeespoort", "province": "North West", "shift_pattern": "day_only"},
                {"name": "Brits Water Purification Plant", "address": "Industrial Area, Brits", "city": "Brits", "province": "North West", "shift_pattern": "24_7"},
            ],
            "Ditsobotla Local Municipality": [
                {"name": "Ditsobotla Municipal Building", "address": "Nelson Mandela Drive, Lichtenburg", "city": "Lichtenburg", "province": "North West", "shift_pattern": "24_7"},
                {"name": "Lichtenburg Community Centre", "address": "Theron Street, Lichtenburg", "city": "Lichtenburg", "province": "North West", "shift_pattern": "day_only"},
            ],
        }

        created_clients = []
        created_sites = []

        # Create clients
        print("\n=== Creating Clients ===")
        for muni in municipalities:
            # Check if client already exists
            existing = db.query(Client).filter(Client.client_name == muni["name"], Client.org_id == org_id).first()
            if existing:
                print(f"  Client already exists: {muni['name']}")
                created_clients.append(existing)
                continue

            client = Client(
                org_id=org_id,
                client_name=muni["name"],
                contact_person=muni["contact"],
                contact_email=muni["email"],
                contact_phone=muni["phone"],
                address=f"{muni['city']}, South Africa",
                billing_rate=random.choice([85.00, 95.00, 105.00, 115.00, 125.00]),
                status="active"
            )
            db.add(client)
            db.flush()
            created_clients.append(client)
            print(f"  Created: {muni['name']} (ID: {client.client_id})")

        db.commit()
        print(f"Total clients: {len(created_clients)}")

        # Create sites for each client
        print("\n=== Creating Sites ===")
        for client in created_clients:
            sites_data = site_templates.get(client.client_name, [])
            for site_data in sites_data:
                # Check if site already exists
                existing = db.query(Site).filter(Site.site_name == site_data["name"], Site.org_id == org_id).first()
                if existing:
                    print(f"  Site already exists: {site_data['name']}")
                    created_sites.append(existing)
                    continue

                site = Site(
                    org_id=org_id,
                    client_id=client.client_id,
                    client_name=client.client_name,
                    site_name=site_data["name"],
                    address=site_data["address"],
                    city=site_data["city"],
                    province=site_data["province"],
                    shift_pattern=site_data["shift_pattern"],
                    billing_rate=random.choice([80.00, 90.00, 100.00, 110.00])
                )
                db.add(site)
                db.flush()
                created_sites.append(site)
                print(f"  Created: {site_data['name']} for {client.client_name} (ID: {site.site_id})")

        db.commit()
        print(f"Total sites: {len(created_sites)}")

        # Create certifications for employees
        print("\n=== Creating Certifications ===")
        employees = db.query(Employee).filter(Employee.org_id == org_id, Employee.status == "ACTIVE").all()
        print(f"Found {len(employees)} active employees")

        psira_grades = list(PSIRAGrade)
        firearm_types = list(FirearmCompetencyType)
        cert_count = 0

        for emp in employees:
            # Check if employee already has PSIRA cert
            existing_psira = db.query(Certification).filter(
                Certification.employee_id == emp.employee_id,
                Certification.cert_type == "PSIRA"
            ).first()

            if not existing_psira:
                # PSIRA certification - weight towards higher grades
                grade_weights = [0.15, 0.25, 0.30, 0.20, 0.10]  # A, B, C, D, E
                grade = random.choices(psira_grades, weights=grade_weights)[0]

                psira_cert = Certification(
                    employee_id=emp.employee_id,
                    cert_type="PSIRA",
                    cert_number=f"PSIRA-{random.randint(100000, 999999)}",
                    issue_date=date.today() - timedelta(days=random.randint(180, 730)),
                    expiry_date=date.today() + timedelta(days=random.randint(180, 730)),
                    verified=random.choice([True, True, True, False]),  # 75% verified
                    psira_grade=grade
                )
                db.add(psira_cert)
                cert_count += 1

            # Firearm competency for ~40% of employees
            if random.random() < 0.4:
                existing_firearm = db.query(Certification).filter(
                    Certification.employee_id == emp.employee_id,
                    Certification.cert_type == "FIREARM"
                ).first()

                if not existing_firearm:
                    firearm_type = random.choice(firearm_types)
                    firearm_cert = Certification(
                        employee_id=emp.employee_id,
                        cert_type="FIREARM",
                        cert_number=f"FAC-{random.randint(100000, 999999)}",
                        issue_date=date.today() - timedelta(days=random.randint(90, 365)),
                        expiry_date=date.today() + timedelta(days=random.randint(365, 1095)),
                        verified=True,
                        firearm_competency=firearm_type
                    )
                    db.add(firearm_cert)
                    cert_count += 1

            # First Aid for ~60% of employees
            if random.random() < 0.6:
                existing_fa = db.query(Certification).filter(
                    Certification.employee_id == emp.employee_id,
                    Certification.cert_type == "FIRST_AID"
                ).first()

                if not existing_fa:
                    first_aid = Certification(
                        employee_id=emp.employee_id,
                        cert_type="FIRST_AID",
                        cert_number=f"FA-{random.randint(10000, 99999)}",
                        issue_date=date.today() - timedelta(days=random.randint(30, 365)),
                        expiry_date=date.today() + timedelta(days=random.randint(365, 730)),
                        verified=True
                    )
                    db.add(first_aid)
                    cert_count += 1

        db.commit()
        print(f"Created {cert_count} certifications")

        # Summary
        print("\n" + "="*50)
        print("DEMO DATA CREATION COMPLETE")
        print("="*50)
        print(f"Clients created: {len(created_clients)}")
        print(f"Sites created: {len(created_sites)}")
        print(f"Certifications created: {cert_count}")

        # List clients with their sites
        print("\n=== Clients and Sites Summary ===")
        for client in created_clients:
            sites = db.query(Site).filter(Site.client_id == client.client_id).all()
            print(f"\n{client.client_name}:")
            for site in sites:
                print(f"  - {site.site_name} ({site.city})")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_demo_data()
