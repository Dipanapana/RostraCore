"""
Create test data via direct database connection matching backend's config.
This ensures we use the SAME credentials as the running backend server.
"""
import sys
sys.path.insert(0, 'backend')

# Must set env before importing app modules
import os
os.chdir('backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta, date

# Read .env file manually to get correct DATABASE_URL
from dotenv import load_dotenv
load_dotenv('.env')

DATABASE_URL = os.getenv('DATABASE_URL')
print(f"Using DATABASE_URL: {DATABASE_URL[:50]}...")  # Print partial URL for debugging

# Create engine with the correct URL
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    from app.models.user import User
    from app.models.organization import Organization
    from app.models.employee import Employee, EmployeeStatus, EmployeeRole, Gender
    from app.models.client import Client
    from app.models.site import Site
    from app.models.shift import Shift, ShiftStatus
    from app.models.certification import Certification, PSIRAGrade, FirearmCompetencyType
    from app.models.availability import Availability
    from app.auth.security import get_password_hash

    print("=" * 70)
    print("CREATING TEST DATA")
    print("=" * 70)

    # 1. Create Superadmin
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
        print("Created superadmin user")
    else:
        print("Superadmin already exists")

    # 2. Create Organization
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
        print(f"Created organization: {org.company_name}")
    else:
        print(f"Organization exists: {org.company_name}")

    # 3. Create Admin
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
        print("Created admin user")
    else:
        print("Admin user already exists")

    # 4. Create Client
    client = db.query(Client).filter(
        Client.client_name == "Test Municipality",
        Client.org_id == org.org_id
    ).first()
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
        print(f"Created client: {client.client_name}")
    else:
        print(f"Client exists: {client.client_name}")

    # 5. Create Sites
    site_names = ["Main Gate", "North Entrance", "South Checkpoint"]
    sites = []
    for name in site_names:
        site = db.query(Site).filter(
            Site.client_name == name,
            Site.client_id == client.client_id
        ).first()
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
            print(f"Created site: {name}")
        sites.append(site)
    db.commit()
    print(f"Total sites: {len(sites)}")

    # 6. Create Employees
    existing_emp_count = db.query(Employee).filter(Employee.org_id == org.org_id).count()
    if existing_emp_count < 10:
        for i in range(existing_emp_count, 10):
            emp = Employee(
                first_name=f"Guard{i+1}",
                last_name=f"Test{i+1}",
                email=f"guard{i+1}@test.com",
                phone=f"07{i:08d}",
                hourly_rate=85.0 + (i * 5),
                role=EmployeeRole.ARMED if i < 5 else EmployeeRole.UNARMED,
                status=EmployeeStatus.ACTIVE,
                org_id=org.org_id,
                gender=Gender.MALE if i % 2 == 0 else Gender.FEMALE
            )
            db.add(emp)
            db.flush()

            # Add PSIRA cert
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

            # Add availability
            for day_offset in range(14):
                avail = Availability(
                    employee_id=emp.employee_id,
                    date=date.today() + timedelta(days=day_offset),
                    is_available=True
                )
                db.add(avail)

            print(f"Created employee: {emp.first_name} {emp.last_name}")

        db.commit()
    else:
        print(f"Employees already exist: {existing_emp_count}")

    # 7. Create Shifts
    existing_shift_count = db.query(Shift).filter(Shift.org_id == org.org_id).count()
    if existing_shift_count < 20:
        for day_offset in range(7):
            shift_date = datetime.now() + timedelta(days=day_offset)

            for site in sites:
                # Day shift
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

                # Night shift
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
        print(f"Created shifts for next 7 days")
    else:
        print(f"Shifts already exist: {existing_shift_count}")

    # Print summary
    print("\n" + "=" * 70)
    print("TEST DATA SUMMARY")
    print("=" * 70)
    print(f"Users: {db.query(User).count()}")
    print(f"Organizations: {db.query(Organization).count()}")
    print(f"Employees: {db.query(Employee).filter(Employee.org_id == org.org_id).count()}")
    print(f"Shifts: {db.query(Shift).filter(Shift.org_id == org.org_id).count()}")
    print("\nCREDENTIALS:")
    print("  Superadmin: superadmin / SuperAdmin123!")
    print("  Admin: testadmin / TestAdmin123!")
    print("=" * 70)

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
