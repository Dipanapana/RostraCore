"""
Test if system is ready for roster generation.

Checks all prerequisites for successful roster generation.
"""

from app.database import SessionLocal
from app.models.employee import Employee, EmployeeStatus
from app.models.site import Site
from app.models.client import Client
from app.models.shift import Shift
from app.models.availability import Availability
from datetime import datetime, timedelta


def test_roster_readiness():
    """Check if system has all required data for roster generation."""
    print("=" * 60)
    print("ROSTER GENERATION READINESS CHECK")
    print("=" * 60)
    print()

    db = SessionLocal()
    issues_found = []
    warnings = []

    try:
        # Check 1: Employees
        print("[1/7] Checking employees...")
        total_employees = db.query(Employee).count()
        active_employees = db.query(Employee).filter(
            Employee.status == EmployeeStatus.ACTIVE
        ).count()

        if total_employees == 0:
            issues_found.append("❌ NO EMPLOYEES: Cannot generate roster without employees")
            print(f"    ❌ No employees found!")
        elif active_employees == 0:
            issues_found.append("❌ NO ACTIVE EMPLOYEES: All employees are inactive")
            print(f"    ❌ {total_employees} employees found, but ALL are inactive!")
        else:
            print(f"    ✅ {active_employees} active employees (out of {total_employees} total)")

            # Show sample employees
            sample_employees = db.query(Employee).filter(
                Employee.status == EmployeeStatus.ACTIVE
            ).limit(3).all()

            print("\n    Sample active employees:")
            for emp in sample_employees:
                print(f"      - {emp.first_name} {emp.last_name}")
                print(f"        ID: {emp.employee_id}, Role: {emp.role}, Rate: R{emp.hourly_rate}/hr")

        # Check 2: Clients
        print("\n[2/7] Checking clients...")
        total_clients = db.query(Client).count()
        active_clients = db.query(Client).filter(Client.status == "active").count()

        if total_clients == 0:
            issues_found.append("❌ NO CLIENTS: Cannot generate roster without clients")
            print(f"    ❌ No clients found!")
        else:
            print(f"    ✅ {active_clients} active clients (out of {total_clients} total)")

        # Check 3: Sites
        print("\n[3/7] Checking sites...")
        total_sites = db.query(Site).count()
        active_sites = db.query(Site).filter(Site.is_active == True).count()

        if total_sites == 0:
            issues_found.append("❌ NO SITES: Cannot generate roster without sites")
            print(f"    ❌ No sites found!")
        else:
            print(f"    ✅ {active_sites} active sites (out of {total_sites} total)")

            # Show sample sites
            sample_sites = db.query(Site).filter(Site.is_active == True).limit(3).all()
            print("\n    Sample active sites:")
            for site in sample_sites:
                print(f"      - {site.site_name or site.client_name}")
                print(f"        ID: {site.site_id}, Min Staff: {site.min_staff}")
                print(f"        Pattern: {site.shift_pattern}")

        # Check 4: Shifts (upcoming)
        print("\n[4/7] Checking shifts...")
        today = datetime.now()
        future_shifts = db.query(Shift).filter(Shift.start_time > today).count()
        unassigned_shifts = db.query(Shift).filter(
            Shift.start_time > today,
            Shift.assigned_employee_id == None
        ).count()

        print(f"    📅 {future_shifts} upcoming shifts")
        print(f"    📋 {unassigned_shifts} unassigned upcoming shifts")

        if future_shifts == 0:
            warnings.append("⚠️  No upcoming shifts: You'll need to create shifts or generate them")
            print(f"    ⚠️  No upcoming shifts - roster generation will create new shifts")

        # Check 5: Availability
        print("\n[5/7] Checking employee availability...")
        availability_count = db.query(Availability).count()

        if availability_count == 0:
            warnings.append("⚠️  No availability data: Employees can work any time")
            print(f"    ⚠️  No availability records (employees can work any time)")
        else:
            print(f"    ✅ {availability_count} availability records")

        # Check 6: Site-Client relationships
        print("\n[6/7] Checking site-client relationships...")
        sites_without_client = db.query(Site).filter(Site.client_id == None).count()

        if sites_without_client > 0:
            warnings.append(f"⚠️  {sites_without_client} sites have no client assigned")
            print(f"    ⚠️  {sites_without_client} sites have no client_id")
        else:
            print(f"    ✅ All sites have clients assigned")

        # Check 7: Employee certifications
        print("\n[7/7] Checking employee skills...")
        from app.models.certification import Certification

        total_certs = db.query(Certification).count()
        expired_certs = db.query(Certification).filter(
            Certification.expiry_date < datetime.now().date()
        ).count()

        if total_certs == 0:
            warnings.append("⚠️  No certifications: Skills matching won't be optimal")
            print(f"    ⚠️  No certifications recorded")
        else:
            print(f"    ✅ {total_certs} certifications recorded")
            if expired_certs > 0:
                print(f"    ⚠️  {expired_certs} certifications have expired")

        # Summary
        print("\n" + "=" * 60)
        print("READINESS SUMMARY")
        print("=" * 60)

        if len(issues_found) == 0:
            print("\n✅ SYSTEM READY FOR ROSTER GENERATION!")
            print("\nYou can now:")
            print("1. Go to http://localhost:3000/roster")
            print("2. Select date range")
            print("3. Click 'Generate Roster'")

            if len(warnings) > 0:
                print("\n⚠️  WARNINGS (non-critical):")
                for warning in warnings:
                    print(f"   {warning}")
        else:
            print("\n❌ SYSTEM NOT READY - ISSUES FOUND:")
            for issue in issues_found:
                print(f"   {issue}")

            print("\n📝 FIXES REQUIRED:")
            if "EMPLOYEES" in str(issues_found):
                print("\n1. ADD EMPLOYEES:")
                print("   - Go to http://localhost:3000/employees")
                print("   - Click 'Add Employee'")
                print("   - Fill in details and save")
                print("   OR use SQL:")
                print("""
   INSERT INTO employees (first_name, last_name, email, hourly_rate, role, status, is_active)
   VALUES ('John', 'Doe', 'john@example.com', 150.00, 'Grade A', 'active', true);
                """)

            if "CLIENTS" in str(issues_found):
                print("\n2. ADD CLIENTS:")
                print("   - Go to http://localhost:3000/clients")
                print("   - Click 'Add Client'")
                print("   - Fill in details and save")
                print("   OR use SQL:")
                print("""
   INSERT INTO clients (org_id, client_name, status, created_at)
   VALUES (1, 'Test Municipality', 'active', NOW());
                """)

            if "SITES" in str(issues_found):
                print("\n3. ADD SITES:")
                print("   - Go to http://localhost:3000/sites")
                print("   - Click 'Add Site'")
                print("   - Link to a client and save")
                print("   OR use SQL:")
                print("""
   INSERT INTO sites (client_id, client_name, address, min_staff, shift_pattern, is_active)
   VALUES (1, 'Test Site', '123 Main St', 2, '3x8', true);
                """)

        # Quick test data
        print("\n" + "=" * 60)
        print("QUICK TEST DATA SCRIPT")
        print("=" * 60)
        print("\nIf you want to quickly add test data, run this:")
        print("""
cd backend
python -c "
from app.database import SessionLocal
from app.models.employee import Employee, EmployeeStatus
from app.models.client import Client
from app.models.site import Site
from datetime import datetime

db = SessionLocal()

# Add test client
client = Client(
    org_id=1,
    client_name='Test Municipality',
    status='active',
    created_at=datetime.now()
)
db.add(client)
db.flush()

# Add test site
site = Site(
    client_id=client.client_id,
    client_name='City Hall Security',
    address='123 Government Ave',
    min_staff=2,
    shift_pattern='3x8',
    is_active=True,
    hourly_rate=180.00
)
db.add(site)
db.flush()

# Add test employee
employee = Employee(
    first_name='John',
    last_name='Doe',
    email='john@example.com',
    hourly_rate=150.00,
    role='Grade A',
    status=EmployeeStatus.ACTIVE,
    is_active=True
)
db.add(employee)

db.commit()
print('✅ Test data added successfully!')
print(f'   Client ID: {client.client_id}')
print(f'   Site ID: {site.site_id}')
print(f'   Employee ID: {employee.employee_id}')

db.close()
"
        """)

    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_roster_readiness()
