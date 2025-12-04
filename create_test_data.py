"""
Create test data for roster generation testing.
Creates superadmin, organization, employees, sites, and shifts.
"""
import sys
sys.path.insert(0, 'backend')

from datetime import datetime, timedelta, date
from app.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization
from app.models.employee import Employee, EmployeeStatus, EmployeeRole, Gender
from app.models.client import Client
from app.models.site import Site
from app.models.shift import Shift, ShiftStatus
from app.models.certification import Certification, PSIRAGrade, FirearmCompetencyType
from app.models.availability import Availability
from app.auth.security import get_password_hash

def create_test_data():
    db = SessionLocal()

    try:
        # 1. Create/Get Superadmin
        superadmin = db.query(User).filter(User.username == "superadmin").first()
        if not superadmin:
            superadmin = User(
                username="superadmin",
                email="superadmin@rostracore.com",
                hashed_password=get_password_hash("SuperAdmin123!"),
                is_superadmin=True,
                is_active=True,
                full_name="Super Administrator",
                org_id=None
            )
            db.add(superadmin)
            db.commit()
            print("✅ Created superadmin: superadmin / SuperAdmin123!")
        else:
            print("✅ Superadmin exists: superadmin")

        # 2. Create/Get Test Organization
        org = db.query(Organization).filter(Organization.org_code == "TEST001").first()
        if not org:
            org = Organization(
                org_code="TEST001",
                company_name="Test Security Company",
                subscription_status="active",
                max_employees=100,
                contact_email="test@security.com"
            )
            db.add(org)
            db.commit()
            print(f"✅ Created organization: {org.company_name} (ID: {org.org_id})")
        else:
            print(f"✅ Organization exists: {org.company_name} (ID: {org.org_id})")

        # 3. Create/Get Admin User for Organization
        admin = db.query(User).filter(User.username == "testadmin").first()
        if not admin:
            admin = User(
                username="testadmin",
                email="admin@test.com",
                hashed_password=get_password_hash("TestAdmin123!"),
                is_superadmin=False,
                is_active=True,
                full_name="Test Administrator",
                org_id=org.org_id
            )
            db.add(admin)
            db.commit()
            print("✅ Created admin: testadmin / TestAdmin123!")
        else:
            print("✅ Admin exists: testadmin")

        # 4. Create/Get Client
        client = db.query(Client).filter(Client.client_name == "Test Municipality", Client.org_id == org.org_id).first()
        if not client:
            client = Client(
                client_name="Test Municipality",
                contact_person="John Doe",
                email="john@municipality.com",
                phone="0123456789",
                address="123 Main Street, Pretoria",
                org_id=org.org_id,
                is_active=True
            )
            db.add(client)
            db.commit()
            print(f"✅ Created client: {client.client_name} (ID: {client.client_id})")
        else:
            print(f"✅ Client exists: {client.client_name} (ID: {client.client_id})")

        # 5. Create Sites
        site_names = ["Main Gate", "North Entrance", "South Checkpoint"]
        sites = []
        for name in site_names:
            site = db.query(Site).filter(Site.client_name == name, Site.client_id == client.client_id).first()
            if not site:
                site = Site(
                    client_name=name,
                    client_id=client.client_id,
                    org_id=org.org_id,
                    address=f"{name}, Test Location",
                    required_skill="Armed",
                    is_active=True
                )
                db.add(site)
                db.flush()
            sites.append(site)
        db.commit()
        print(f"✅ Sites ready: {len(sites)} sites")

        # 6. Create Employees (Guards)
        employee_count = db.query(Employee).filter(Employee.org_id == org.org_id).count()
        if employee_count < 10:
            for i in range(10 - employee_count):
                emp = Employee(
                    first_name=f"Guard{i+1}",
                    last_name=f"Test{i+1}",
                    email=f"guard{i+1}@test.com",
                    phone=f"07{i:08d}",
                    hourly_rate=85.0 + (i * 5),  # Varied rates
                    role=EmployeeRole.ARMED if i < 5 else EmployeeRole.UNARMED,
                    status=EmployeeStatus.ACTIVE,
                    org_id=org.org_id,
                    gender=Gender.MALE if i % 2 == 0 else Gender.FEMALE
                )
                db.add(emp)
                db.flush()

                # Add PSIRA certification
                cert = Certification(
                    employee_id=emp.employee_id,
                    cert_type="PSIRA Registration",
                    issue_date=date.today() - timedelta(days=365),
                    expiry_date=date.today() + timedelta(days=365),
                    verified=True,
                    psira_grade=PSIRAGrade.GRADE_C if i < 3 else (PSIRAGrade.GRADE_B if i < 7 else PSIRAGrade.GRADE_E),
                    firearm_competency=FirearmCompetencyType.HANDGUN if i < 5 else None
                )
                db.add(cert)

                # Add availability (available all days)
                for day_offset in range(14):  # Next 2 weeks
                    avail_date = date.today() + timedelta(days=day_offset)
                    avail = Availability(
                        employee_id=emp.employee_id,
                        date=avail_date,
                        is_available=True
                    )
                    db.add(avail)

            db.commit()
            print(f"✅ Created 10 test employees with certifications and availability")
        else:
            print(f"✅ Employees exist: {employee_count} employees")

        # 7. Create Shifts for next 7 days
        shift_count = db.query(Shift).filter(
            Shift.org_id == org.org_id,
            Shift.start_time >= datetime.now()
        ).count()

        if shift_count < 20:
            print("Creating test shifts...")
            for day_offset in range(7):  # Next 7 days
                shift_date = datetime.now() + timedelta(days=day_offset)

                for site in sites:
                    # Day shift (06:00-18:00)
                    day_start = shift_date.replace(hour=6, minute=0, second=0, microsecond=0)
                    day_end = shift_date.replace(hour=18, minute=0, second=0, microsecond=0)

                    day_shift = Shift(
                        site_id=site.site_id,
                        org_id=org.org_id,
                        start_time=day_start,
                        end_time=day_end,
                        required_skill="Armed",
                        required_staff=1,
                        status=ShiftStatus.PLANNED,
                        required_psira_grade=PSIRAGrade.GRADE_C,
                        requires_firearm=True,
                        required_firearm_type=FirearmCompetencyType.HANDGUN,
                        includes_meal_break=True,
                        meal_break_duration_minutes=60
                    )
                    db.add(day_shift)

                    # Night shift (18:00-06:00 next day)
                    night_start = shift_date.replace(hour=18, minute=0, second=0, microsecond=0)
                    night_end = (shift_date + timedelta(days=1)).replace(hour=6, minute=0, second=0, microsecond=0)

                    night_shift = Shift(
                        site_id=site.site_id,
                        org_id=org.org_id,
                        start_time=night_start,
                        end_time=night_end,
                        required_skill="Armed",
                        required_staff=1,
                        status=ShiftStatus.PLANNED,
                        required_psira_grade=PSIRAGrade.GRADE_C,
                        requires_firearm=True,
                        required_firearm_type=FirearmCompetencyType.HANDGUN,
                        includes_meal_break=True,
                        meal_break_duration_minutes=60
                    )
                    db.add(night_shift)

            db.commit()
            final_count = db.query(Shift).filter(Shift.org_id == org.org_id).count()
            print(f"✅ Created test shifts: {final_count} total shifts")
        else:
            print(f"✅ Shifts exist: {shift_count} shifts")

        print("\n" + "="*60)
        print("🎉 TEST DATA READY!")
        print("="*60)
        print("\n📋 CREDENTIALS:")
        print("-" * 60)
        print("Superadmin:")
        print("  Username: superadmin")
        print("  Password: SuperAdmin123!")
        print()
        print("Organization Admin:")
        print("  Username: testadmin")
        print("  Password: TestAdmin123!")
        print()
        print("📊 DATA SUMMARY:")
        print("-" * 60)
        print(f"  Organization: {org.company_name} (ID: {org.org_id})")
        print(f"  Client: {client.client_name}")
        print(f"  Sites: {len(sites)} sites")
        print(f"  Employees: {db.query(Employee).filter(Employee.org_id == org.org_id).count()} guards")
        print(f"  Shifts: {db.query(Shift).filter(Shift.org_id == org.org_id).count()} shifts (unassigned)")
        print()
        print("🚀 API ENDPOINT FOR ROSTER GENERATION:")
        print("-" * 60)
        print("POST http://localhost:8001/api/v1/roster/generate")
        print('Body: {')
        print(f'  "start_date": "{datetime.now().date()}",')
        print(f'  "end_date": "{(datetime.now() + timedelta(days=7)).date()}",')
        print(f'  "site_ids": {[s.site_id for s in sites]}')
        print('}')
        print("="*60)

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_data()
