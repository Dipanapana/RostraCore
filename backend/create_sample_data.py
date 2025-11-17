"""
Script to create sample test data for roster generation testing.

Creates:
- 1 test organization (with trial subscription)
- 1 test admin user
- 10 sample employees (guards) with various grades and certifications
- 2 sample clients (municipalities)
- 4 sample sites (guard posts)
- 56 sample shifts over a week period (7 days × 4 sites × 2 shifts/day)
"""

import sys
from datetime import datetime, timedelta

# Add parent directory to path to import app modules
sys.path.append('.')

from app.database import SessionLocal
from app.models.organization import Organization, SubscriptionStatus
from app.models.user import User, UserRole
from app.models.employee import Employee, EmployeeStatus
from app.models.client import Client
from app.models.site import Site
from app.models.shift import Shift
from app.models.certification import Certification
from app.models.availability import Availability
from app.auth.security import get_password_hash

def create_sample_data():
    """Create sample test data for roster generation."""
    db = SessionLocal()

    try:
        print("=" * 60)
        print("CREATING SAMPLE TEST DATA FOR ROSTER GENERATION")
        print("=" * 60)

        # 0. Delete existing test data if it exists
        print("\n0. Checking for existing test data...")
        existing_org = db.query(Organization).filter(Organization.org_code == "TEST001").first()
        if existing_org:
            print(f"   + Found existing test organization (ID: {existing_org.org_id})")
            print(f"   + Deleting existing test data (cascading deletes will clean up related records)...")
            db.delete(existing_org)
            db.commit()
            print(f"   + Successfully deleted test organization")

        # 1. Create test organization
        print("\n1. Creating test organization...")
        test_org = Organization(
            org_code="TEST001",
            company_name="Test Security Services (Pty) Ltd",
            psira_company_registration="PSR123456",
            billing_email="billing@testsecurity.co.za",
            subscription_tier="professional",
            subscription_status=SubscriptionStatus.TRIAL.value,
            trial_start_date=datetime.utcnow(),
            trial_end_date=datetime.utcnow() + timedelta(days=14),
            approval_status="approved",  # Skip approval for testing
            approved_at=datetime.utcnow(),
            is_active=True
        )
        db.add(test_org)
        db.commit()
        db.refresh(test_org)
        print(f"   + Created organization: {test_org.company_name} (ID: {test_org.org_id})")

        # 2. Create test admin user
        print("\n2. Creating test admin user...")
        # Use unique username with timestamp to avoid conflicts
        from random import randint
        random_suffix = randint(1000, 9999)
        test_admin = User(
            username=f"testadmin{random_suffix}",
            email=f"admin{random_suffix}@testsecurity.co.za",
            hashed_password=get_password_hash("TestPassword123!"),
            full_name="Test Administrator",
            role=UserRole.ADMIN,
            org_id=test_org.org_id,
            is_active=True,
            is_email_verified=True
        )
        db.add(test_admin)
        db.commit()
        print(f"   + Created admin user: {test_admin.username} / TestPassword123!")

        # 3. Create sample employees (guards)
        print("\n3. Creating 10 sample employees...")
        employees = []

        employee_data = [
            {"first_name": "Sipho", "last_name": "Dlamini", "psira_grade": "A", "hourly_rate": 85.00, "role": "armed"},
            {"first_name": "Themba", "last_name": "Nkosi", "psira_grade": "B", "hourly_rate": 75.00, "role": "unarmed"},
            {"first_name": "Mpho", "last_name": "Mabaso", "psira_grade": "A", "hourly_rate": 85.00, "role": "armed"},
            {"first_name": "Thandi", "last_name": "Zulu", "psira_grade": "C", "hourly_rate": 65.00, "role": "unarmed"},
            {"first_name": "Lucky", "last_name": "Khumalo", "psira_grade": "B", "hourly_rate": 75.00, "role": "unarmed"},
            {"first_name": "Nomsa", "last_name": "Radebe", "psira_grade": "A", "hourly_rate": 85.00, "role": "armed"},
            {"first_name": "Bongani", "last_name": "Sithole", "psira_grade": "C", "hourly_rate": 65.00, "role": "unarmed"},
            {"first_name": "Zanele", "last_name": "Mthembu", "psira_grade": "B", "hourly_rate": 75.00, "role": "unarmed"},
            {"first_name": "Mandla", "last_name": "Mokoena", "psira_grade": "A", "hourly_rate": 85.00, "role": "armed"},
            {"first_name": "Precious", "last_name": "Shabalala", "psira_grade": "C", "hourly_rate": 65.00, "role": "unarmed"},
        ]

        from app.models.employee import EmployeeRole, EmployeeStatus
        from random import randint

        for i, emp_data in enumerate(employee_data, 1):
            # Generate unique ID number
            random_id = randint(10000000, 99999999)
            employee = Employee(
                first_name=emp_data["first_name"],
                last_name=emp_data["last_name"],
                id_number=f"RSA{random_id}",  # Generate unique RSA ID
                email=f"{emp_data['first_name'].lower()}.{emp_data['last_name'].lower()}@testsecurity.co.za",
                phone=f"+2781000{str(i).zfill(4)}",
                psira_grade=emp_data["psira_grade"],
                hourly_rate=emp_data["hourly_rate"],
                role=EmployeeRole(emp_data["role"]),
                status=EmployeeStatus.ACTIVE,
                org_id=test_org.org_id,
                address=f"{i} Test Street, Johannesburg",
                province="Gauteng"
            )
            db.add(employee)
            employees.append(employee)

        db.commit()
        for emp in employees:
            db.refresh(emp)
        print(f"   + Created {len(employees)} employees")

        # 4. Create certifications for employees
        print("\n4. Creating certifications for employees...")
        cert_count = 0
        for emp in employees:
            # All get PSIRA registration
            psira_cert = Certification(
                employee_id=emp.employee_id,
                cert_type=f"PSIRA Grade {emp.psira_grade}",
                cert_number=f"PSIRA{str(emp.employee_id).zfill(6)}",
                issue_date=(datetime.utcnow() - timedelta(days=365)).date(),
                expiry_date=(datetime.utcnow() + timedelta(days=365)).date(),
                verified=True
            )
            db.add(psira_cert)
            cert_count += 1

            # Grade A gets firearms
            if emp.psira_grade == "A":
                firearms_cert = Certification(
                    employee_id=emp.employee_id,
                    cert_type="Firearms Competency",
                    cert_number=f"FIRE{str(emp.employee_id).zfill(6)}",
                    issue_date=(datetime.utcnow() - timedelta(days=180)).date(),
                    expiry_date=(datetime.utcnow() + timedelta(days=545)).date(),
                    verified=True
                )
                db.add(firearms_cert)
                cert_count += 1

        db.commit()
        print(f"   + Created {cert_count} certifications")

        # 5. Create availability for all employees (available for next 7 days for testing)
        print("\n5. Creating availability for employees...")
        avail_count = 0
        from datetime import time
        start_date = datetime.utcnow().date()

        for emp in employees:
            # Make available for next 7 days, day and night shifts
            for day in range(7):
                current_date = start_date + timedelta(days=day)

                # Day shift availability (6 AM - 6 PM)
                availability_day = Availability(
                    employee_id=emp.employee_id,
                    date=current_date,
                    start_time=time(6, 0),
                    end_time=time(18, 0),
                    available=True
                )
                db.add(availability_day)
                avail_count += 1

                # Night shift availability (6 PM - 6 AM next day)
                availability_night = Availability(
                    employee_id=emp.employee_id,
                    date=current_date,
                    start_time=time(18, 0),
                    end_time=time(6, 0),  # Crosses midnight
                    available=True
                )
                db.add(availability_night)
                avail_count += 1

        db.commit()
        print(f"   + Created {avail_count} availability records")

        # 6. Create sample clients
        print("\n6. Creating 2 sample clients...")
        client1 = Client(
            client_name="City of Johannesburg - Parks Department",
            contact_person="Sarah Johnson",
            contact_email="sarah.johnson@joburg.org.za",
            contact_phone="+27114071000",
            address="1 Civic Centre, Johannesburg, 2001",
            billing_rate=120.00,
            org_id=test_org.org_id,
            status="active"
        )
        db.add(client1)

        client2 = Client(
            client_name="Ekurhuleni Metro - Security Services",
            contact_person="David Mokhele",
            contact_email="david.mokhele@ekurhuleni.gov.za",
            contact_phone="+27119990000",
            address="1 Germiston Road, Germiston, 1400",
            billing_rate=130.00,
            org_id=test_org.org_id,
            status="active"
        )
        db.add(client2)

        db.commit()
        db.refresh(client1)
        db.refresh(client2)
        print(f"   + Created clients: {client1.client_name}, {client2.client_name}")

        # 7. Create sample sites
        print("\n7. Creating 4 sample sites...")
        site1 = Site(
            client_name=client1.client_name,
            site_name="Zoo Lake Entrance Gate",
            client_id=client1.client_id,
            org_id=test_org.org_id,
            address="Zoo Lake, Jan Smuts Avenue, Johannesburg",
            city="Johannesburg",
            province="Gauteng",
            gps_lat=-26.1526,
            gps_lng=28.0461,
            shift_pattern="12hr",
            required_skill="unarmed",
            billing_rate=120.00,
            min_staff=2
        )
        db.add(site1)

        site2 = Site(
            client_name=client1.client_name,
            site_name="Emmarentia Dam Security Post",
            client_id=client1.client_id,
            org_id=test_org.org_id,
            address="Emmarentia Avenue, Emmarentia, Johannesburg",
            city="Johannesburg",
            province="Gauteng",
            gps_lat=-26.1589,
            gps_lng=28.0127,
            shift_pattern="12hr",
            required_skill="unarmed",
            billing_rate=110.00,
            min_staff=1
        )
        db.add(site2)

        site3 = Site(
            client_name=client2.client_name,
            site_name="Germiston City Hall",
            client_id=client2.client_id,
            org_id=test_org.org_id,
            address="Market Street, Germiston, 1400",
            city="Germiston",
            province="Gauteng",
            gps_lat=-26.2252,
            gps_lng=28.1625,
            shift_pattern="12hr",
            required_skill="armed",
            billing_rate=150.00,
            min_staff=2
        )
        db.add(site3)

        site4 = Site(
            client_name=client2.client_name,
            site_name="Boksburg Civic Centre",
            client_id=client2.client_id,
            org_id=test_org.org_id,
            address="Civic Centre, Boksburg, 1459",
            city="Boksburg",
            province="Gauteng",
            gps_lat=-26.2117,
            gps_lng=28.2583,
            shift_pattern="12hr",
            required_skill="unarmed",
            billing_rate=115.00,
            min_staff=1
        )
        db.add(site4)

        db.commit()
        db.refresh(site1)
        db.refresh(site2)
        db.refresh(site3)
        db.refresh(site4)
        sites = [site1, site2, site3, site4]
        print(f"   + Created {len(sites)} sites")

        # 8. Create sample shifts for next 7 days
        print("\n8. Creating shifts for the next 7 days...")
        shift_count = 0
        start_date = datetime.utcnow().replace(hour=6, minute=0, second=0, microsecond=0)

        for day in range(7):  # Next 7 days
            current_date = start_date + timedelta(days=day)

            for site in sites:
                # Day shift: 6 AM - 6 PM
                day_shift_start = current_date.replace(hour=6, minute=0)
                day_shift_end = current_date.replace(hour=18, minute=0)

                day_shift = Shift(
                    site_id=site.site_id,
                    org_id=test_org.org_id,
                    start_time=day_shift_start,
                    end_time=day_shift_end,
                    required_staff=site.min_staff,
                    shift_type="day",
                    hourly_rate=site.min_staff * 75.00  # Base rate
                )
                db.add(day_shift)
                shift_count += 1

                # Night shift: 6 PM - 6 AM next day
                night_shift_start = current_date.replace(hour=18, minute=0)
                night_shift_end = (current_date + timedelta(days=1)).replace(hour=6, minute=0)

                night_shift = Shift(
                    site_id=site.site_id,
                    org_id=test_org.org_id,
                    start_time=night_shift_start,
                    end_time=night_shift_end,
                    required_staff=site.min_staff,
                    shift_type="night",
                    hourly_rate=site.min_staff * 85.00  # Higher rate for night
                )
                db.add(night_shift)
                shift_count += 1

        db.commit()
        print(f"   + Created {shift_count} shifts (7 days × 4 sites × 2 shifts/day)")

        # Summary
        print("\n" + "=" * 60)
        print("SAMPLE DATA CREATION COMPLETE!")
        print("=" * 60)
        print(f"\n+ Organization: {test_org.company_name} (org_id: {test_org.org_id})")
        print(f"+ Admin User: {test_admin.username} / TestPassword123!")
        print(f"+ Employees: {len(employees)} guards")
        print(f"+ Certifications: {cert_count} total")
        print(f"+ Availability: {avail_count} records")
        print(f"+ Clients: 2")
        print(f"+ Sites: {len(sites)}")
        print(f"+ Shifts: {shift_count} (unassigned)")
        print(f"\nShift date range: {start_date.date()} to {(start_date + timedelta(days=6)).date()}")
        print("\nYou can now test roster generation with this data!")
        print("=" * 60)

        return test_org.org_id

    except Exception as e:
        print(f"\n[ERROR] Error creating sample data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    org_id = create_sample_data()
    print(f"\nTest organization ID: {org_id}")
