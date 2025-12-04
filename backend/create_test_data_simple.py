"""Create test data - run from backend directory"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta, date
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
print(f"Using DATABASE_URL from .env")

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    from app.models.user import User, UserRole
    from app.models.organization import Organization
    from app.models.employee import Employee, EmployeeStatus, EmployeeRole, Gender
    from app.models.client import Client
    from app.models.site import Site
    from app.models.shift import Shift, ShiftStatus
    from app.models.certification import Certification, PSIRAGrade, FirearmCompetencyType
    from app.models.availability import Availability
    from app.auth.security import get_password_hash

    print("Creating test data...")

    # 1. Superadmin
    if not db.query(User).filter(User.username == "superadmin").first():
        db.add(User(
            username="superadmin",
            email="superadmin@rostracore.com",
            hashed_password=get_password_hash("SuperAdmin123!"),
            role=UserRole.SUPERADMIN,
            is_active=True,
            full_name="Super Administrator"
        ))
        db.commit()
        print("+ Created superadmin")

    # 2. Organization - use existing TEST_SECURITY org or create new one
    org = db.query(Organization).filter(Organization.org_code == "TEST_SECURITY").first()
    if not org:
        org = db.query(Organization).filter(Organization.org_code == "TEST001").first()
    if not org:
        org = Organization(
            org_code="TEST_SECURITY",
            company_name="Test Security Company",
            subscription_status="active",
            max_employees=100,
            contact_email="test@security.com"
        )
        db.add(org)
        db.commit()
        print("+ Created organization")
    else:
        print(f"+ Using existing organization: {org.org_code} (org_id={org.org_id})")

    # 3. Admin
    if not db.query(User).filter(User.username == "testadmin").first():
        db.add(User(
            username="testadmin",
            email="admin@test.com",
            hashed_password=get_password_hash("TestAdmin123!"),
            role=UserRole.COMPANY_ADMIN,
            is_active=True,
            full_name="Test Administrator",
            org_id=org.org_id
        ))
        db.commit()
        print("+ Created admin")

    # 4. Client
    client = db.query(Client).filter(Client.client_name == "Test Municipality", Client.org_id == org.org_id).first()
    if not client:
        client = Client(
            client_name="Test Municipality",
            contact_person="John Doe",
            contact_email="john@municipality.com",
            contact_phone="0123456789",
            address="123 Main Street, Pretoria",
            org_id=org.org_id,
            status="active"
        )
        db.add(client)
        db.commit()
        print("+ Created client")

    # 5. Sites
    sites = []
    for name in ["Main Gate", "North Entrance", "South Checkpoint"]:
        site = db.query(Site).filter(Site.client_name == name, Site.client_id == client.client_id).first()
        if not site:
            site = Site(
                client_name=name,
                client_id=client.client_id,
                org_id=org.org_id,
                address=f"{name}, Test Location",
                required_skill="Armed"
            )
            db.add(site)
            db.flush()
            print(f"+ Created site: {name}")
        sites.append(site)
    db.commit()

    # 6. Employees - delete existing test employees and recreate with correct org_id
    # First delete certifications for these employees
    existing_emps = db.query(Employee).filter(Employee.email.like("guard%@test.com")).all()
    if existing_emps:
        emp_ids = [e.employee_id for e in existing_emps]
        db.query(Certification).filter(Certification.employee_id.in_(emp_ids)).delete(synchronize_session=False)
        db.query(Employee).filter(Employee.employee_id.in_(emp_ids)).delete(synchronize_session=False)
        db.commit()
        print(f"+ Deleted {len(emp_ids)} existing test employees")

    for i in range(20):  # Create 20 employees
        emp = Employee(
            first_name=f"Guard{i+1}",
            last_name=f"Test{i+1}",
            id_number=f"9001010{i:04d}083",  # Fake SA ID number
            email=f"guard{i+1}@test.com",
            phone=f"07{i:08d}",
            hourly_rate=85.0 + (i * 5),
            # All employees need ARMED role to match shift requirements
            role=EmployeeRole.ARMED,
            status=EmployeeStatus.ACTIVE,
            org_id=org.org_id,
            gender=Gender.MALE if i % 2 == 0 else Gender.FEMALE
        )
        db.add(emp)
        db.flush()

        db.add(Certification(
            employee_id=emp.employee_id,
            cert_type="PSIRA Registration",
            issue_date=date.today() - timedelta(days=365),
            expiry_date=date.today() + timedelta(days=365),
            verified=True,
            # Give ALL employees GRADE_C or higher to meet shift requirements
            # GRADE_C (highest) for 12, GRADE_B for remaining 8
            psira_grade=PSIRAGrade.GRADE_C if i < 12 else PSIRAGrade.GRADE_B,
            # Give ALL employees firearm competency since all shifts require it
            firearm_competency=FirearmCompetencyType.HANDGUN
        ))

        # Skip availability since SKIP_AVAILABILITY_CHECK=True in settings

        print(f"+ Created employee: Guard{i+1}")

    db.commit()

    # 7. Shifts
    for day_offset in range(7):
        for site in sites:
            shift_date = datetime.now() + timedelta(days=day_offset)

            # Day shift
            if not db.query(Shift).filter(
                Shift.site_id == site.site_id,
                Shift.start_time == shift_date.replace(hour=6, minute=0, second=0, microsecond=0)
            ).first():
                db.add(Shift(
                    site_id=site.site_id,
                    org_id=org.org_id,
                    start_time=shift_date.replace(hour=6, minute=0, second=0, microsecond=0),
                    end_time=shift_date.replace(hour=18, minute=0, second=0, microsecond=0),
                    required_skill="Armed",
                    required_staff=1,
                    status=ShiftStatus.PLANNED,
                    required_psira_grade=PSIRAGrade.GRADE_C,
                    requires_firearm=True,
                    required_firearm_type=FirearmCompetencyType.HANDGUN,
                    includes_meal_break=True,
                    meal_break_duration_minutes=60
                ))

            # Night shift
            if not db.query(Shift).filter(
                Shift.site_id == site.site_id,
                Shift.start_time == shift_date.replace(hour=18, minute=0, second=0, microsecond=0)
            ).first():
                db.add(Shift(
                    site_id=site.site_id,
                    org_id=org.org_id,
                    start_time=shift_date.replace(hour=18, minute=0, second=0, microsecond=0),
                    end_time=(shift_date + timedelta(days=1)).replace(hour=6, minute=0, second=0, microsecond=0),
                    required_skill="Armed",
                    required_staff=1,
                    status=ShiftStatus.PLANNED,
                    required_psira_grade=PSIRAGrade.GRADE_C,
                    requires_firearm=True,
                    required_firearm_type=FirearmCompetencyType.HANDGUN,
                    includes_meal_break=True,
                    meal_break_duration_minutes=60
                ))

    db.commit()
    print("+ Created shifts")

    # Summary
    print("\n" + "="*60)
    print(f"Employees: {db.query(Employee).filter(Employee.org_id == org.org_id).count()}")
    print(f"Shifts: {db.query(Shift).filter(Shift.org_id == org.org_id).count()}")
    print("\nLogin: testadmin / TestAdmin123!")
    print("="*60)

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
