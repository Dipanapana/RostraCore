"""
Quick script to add test employees (security guards) to the database.

UPDATED: Now includes multi-tenancy support (org_id and assigned_client_id).

This is different from adding users (authentication accounts).
Employees are the workers who get assigned to shifts.
"""

from app.database import SessionLocal
from app.models.employee import Employee, EmployeeStatus, EmployeeRole
from app.models.organization import Organization
from app.models.client import Client
from datetime import date, datetime


def add_test_employees():
    """Add sample security guards to the database."""
    print("=" * 60)
    print("ADDING TEST EMPLOYEES (SECURITY GUARDS)")
    print("=" * 60)
    print()

    db = SessionLocal()

    try:
        # Check if organizations and clients exist
        org = db.query(Organization).first()
        if not org:
            print("❌ ERROR: No organization found in database!")
            print("   Please create an organization first.")
            print("\n   Quick fix:")
            print("   Run: python create_organization.py")
            return

        client = db.query(Client).filter(Client.org_id == org.org_id).first()

        print(f"✓ Organization: {org.company_name} (ID: {org.org_id})")
        if client:
            print(f"✓ Client available: {client.client_name} (ID: {client.client_id})")
        else:
            print("⚠️  No clients found - employees will not be assigned to a specific client")
        print()

        # Check if employees already exist
        existing_count = db.query(Employee).count()
        print(f"Current employees in database: {existing_count}")

        if existing_count > 0:
            response = input("\nEmployees already exist. Add more? (y/n): ")
            if response.lower() != 'y':
                print("Cancelled.")
                return

        print(f"\nAdding 5 test security guards for {org.company_name}...\n")

        # Assign to client if available
        client_id = client.client_id if client else None

        # Test Employee 1 - Grade A (Armed) - Assigned to client
        emp1 = Employee(
            org_id=org.org_id,
            assigned_client_id=client_id,
            first_name="John",
            last_name="Mabena",
            id_number="8501015800081",
            email="john.mabena@guardianops.com",
            phone="+27 82 123 4567",
            role=EmployeeRole.ARMED,
            hourly_rate=180.00,
            max_hours_week=48,
            status=EmployeeStatus.ACTIVE,
            psira_number="PSR001234",
            psira_expiry_date=date(2026, 12, 31),
            psira_grade="Grade A",
            address="123 Mandela Street, Johannesburg, 2000",
            province="Gauteng",
            emergency_contact_name="Maria Mabena",
            emergency_contact_phone="+27 82 765 4321"
        )

        # Test Employee 2 - Grade B (Unarmed) - Assigned to client
        emp2 = Employee(
            org_id=org.org_id,
            assigned_client_id=client_id,
            first_name="Sarah",
            last_name="Khumalo",
            id_number="9203125900082",
            email="sarah.khumalo@guardianops.com",
            phone="+27 83 234 5678",
            role=EmployeeRole.UNARMED,
            hourly_rate=150.00,
            max_hours_week=48,
            status=EmployeeStatus.ACTIVE,
            psira_number="PSR002345",
            psira_expiry_date=date(2026, 6, 30),
            psira_grade="Grade B",
            address="456 Sisulu Avenue, Pretoria, 0001",
            province="Gauteng",
            emergency_contact_name="David Khumalo",
            emergency_contact_phone="+27 83 876 5432"
        )

        # Test Employee 3 - Unarmed - Not assigned to specific client (flexible)
        emp3 = Employee(
            org_id=org.org_id,
            assigned_client_id=None,  # Available for any client
            first_name="Thabo",
            last_name="Sithole",
            id_number="9807085800083",
            email="thabo.sithole@guardianops.com",
            phone="+27 84 345 6789",
            role=EmployeeRole.UNARMED,
            hourly_rate=130.00,
            max_hours_week=48,
            status=EmployeeStatus.ACTIVE,
            psira_number="PSR003456",
            psira_expiry_date=date(2025, 12, 31),
            psira_grade="Grade C",
            address="789 Biko Street, Soweto, 1868",
            province="Gauteng",
            emergency_contact_name="Grace Sithole",
            emergency_contact_phone="+27 84 987 6543"
        )

        # Test Employee 4 - Supervisor - Assigned to client
        emp4 = Employee(
            org_id=org.org_id,
            assigned_client_id=client_id,
            first_name="Mpho",
            last_name="Nkosi",
            id_number="7905145800084",
            email="mpho.nkosi@guardianops.com",
            phone="+27 85 456 7890",
            role=EmployeeRole.SUPERVISOR,
            hourly_rate=220.00,
            max_hours_week=48,
            status=EmployeeStatus.ACTIVE,
            is_supervisor=True,
            psira_number="PSR004567",
            psira_expiry_date=date(2027, 3, 31),
            psira_grade="Grade A",
            address="321 Tambo Drive, Sandton, 2196",
            province="Gauteng",
            emergency_contact_name="Linda Nkosi",
            emergency_contact_phone="+27 85 098 7654"
        )

        # Test Employee 5 - Unarmed - Not assigned to specific client (flexible)
        emp5 = Employee(
            org_id=org.org_id,
            assigned_client_id=None,  # Available for any client
            first_name="Nomsa",
            last_name="Dlamini",
            id_number="8811225900085",
            email="nomsa.dlamini@guardianops.com",
            phone="+27 86 567 8901",
            role=EmployeeRole.UNARMED,
            hourly_rate=155.00,
            max_hours_week=48,
            status=EmployeeStatus.ACTIVE,
            psira_number="PSR005678",
            psira_expiry_date=date(2026, 9, 30),
            psira_grade="Grade B",
            address="654 Luthuli Road, Midrand, 1685",
            province="Gauteng",
            emergency_contact_name="Simon Dlamini",
            emergency_contact_phone="+27 86 109 8765"
        )

        # Add all employees
        employees = [emp1, emp2, emp3, emp4, emp5]
        for emp in employees:
            db.add(emp)

        db.commit()

        print("✅ Successfully added 5 test employees:")
        print()

        # Show what was added
        for i, emp in enumerate(employees, 1):
            db.refresh(emp)
            if emp.assigned_client_id:
                client_info = db.query(Client).filter(Client.client_id == emp.assigned_client_id).first()
                assigned_to = f"Assigned to: {client_info.client_name if client_info else 'Unknown'}"
            else:
                assigned_to = "Available for ANY client"

            print(f"{i}. {emp.first_name} {emp.last_name}")
            print(f"   ID: {emp.employee_id}")
            print(f"   Organization: {org.company_name} (ID: {emp.org_id})")
            print(f"   {assigned_to}")
            print(f"   Role: {emp.role.value}")
            print(f"   Rate: R{emp.hourly_rate}/hr")
            print(f"   Status: {emp.status.value}")
            print(f"   PSIRA: {emp.psira_number} (expires {emp.psira_expiry_date})")
            print()

        # Summary
        total_now = db.query(Employee).filter(Employee.org_id == org.org_id).count()
        active_now = db.query(Employee).filter(
            Employee.org_id == org.org_id,
            Employee.status == EmployeeStatus.ACTIVE
        ).count()

        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total employees for {org.company_name}: {total_now}")
        print(f"Active employees: {active_now}")
        print()
        print("✅ DONE! Refresh your dashboard to see the employee count.")
        print()
        print("NOTE: Multi-tenancy enabled!")
        print(f"  - These employees belong to: {org.company_name}")
        print(f"  - Only users in this organization can see/manage them")
        print()

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    add_test_employees()
