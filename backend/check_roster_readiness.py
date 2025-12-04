"""
Script to check database state and help debug roster generation issues
"""
from app.database import SessionLocal
from app.models.shift import Shift
from app.models.employee import Employee
from app.models.site import Site

db = SessionLocal()

print("=== DATABASE STATE CHECK ===")
print()

# Check employees
employee_count = db.query(Employee).count()
print(f"Total Employees: {employee_count}")
if employee_count > 0:
    sample_employee = db.query(Employee).first()
    print(f"  Sample Employee ID: {sample_employee.employee_id}")

# Check sites
site_count = db.query(Site).count()
print(f"\nTotal Sites: {site_count}")
if site_count > 0:
    sample_site = db.query(Site).first()
    print(f"  Sample Site ID: {sample_site.site_id}")

# Check shifts
shift_count = db.query(Shift).count()
unassigned_shifts = db.query(Shift).filter(Shift.assigned_employee_id == None).count()
assigned_shifts = db.query(Shift).filter(Shift.assigned_employee_id != None).count()

print(f"\nTotal Shifts: {shift_count}")
print(f"  - Unassigned: {unassigned_shifts}")
print(f"  - Assigned: {assigned_shifts}")

if assigned_shifts > 0:
    print("\nChecking for invalid employee IDs...")
    invalid_assignments = db.query(Shift).filter(
        Shift.assigned_employee_id != None,
        ~Shift.assigned_employee_id.in_(db.query(Employee.employee_id))
    ).all()
    
    if invalid_assignments:
        print(f"  FOUND {len(invalid_assignments)} shifts with INVALID employee IDs")
        for shift in invalid_assignments[:5]:
            print(f"     Shift ID: {shift.shift_id}, Invalid Employee ID: {shift.assigned_employee_id}")
        
        print("\n  FIXING: Clearing invalid assignments...")
        for shift in invalid_assignments:
            shift.assigned_employee_id = None
        db.commit()
        print(f"  FIXED: Cleared {len(invalid_assignments)} invalid assignments")
    else:
        print("  OK: All assigned shifts have valid employee IDs")

print("\n=== ROSTER GENERATION READINESS ===")
if employee_count == 0:
    print("ERROR: No employees found")
elif site_count == 0:
    print("ERROR: No sites found")
else:
    print("OK: Database is ready for roster generation")

db.close()
