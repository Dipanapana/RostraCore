"""Quick check of database data"""
import sys
sys.path.insert(0, 'backend')

from app.database import SessionLocal
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.user import User
from app.models.organization import Organization

db = SessionLocal()

try:
    print("=" * 60)
    print("DATABASE DATA CHECK")
    print("=" * 60)

    users = db.query(User).count()
    orgs = db.query(Organization).count()
    employees = db.query(Employee).count()
    shifts = db.query(Shift).count()

    print(f"\nUsers: {users}")
    print(f"Organizations: {orgs}")
    print(f"Employees: {employees}")
    print(f"Shifts: {shifts}")

    if orgs > 0:
        print("\n--- Organizations ---")
        for org in db.query(Organization).limit(3).all():
            print(f"  {org.org_code}: {org.company_name}")

    if users > 0:
        print("\n--- Users ---")
        for user in db.query(User).limit(3).all():
            print(f"  {user.username}: {user.email} (org_id={user.org_id})")

    if employees > 0:
        print("\n--- Employees (Active) ---")
        active_emps = db.query(Employee).filter(Employee.status == 'ACTIVE').limit(3).all()
        for emp in active_emps:
            print(f"  {emp.first_name} {emp.last_name}: {emp.role} (org_id={emp.org_id})")

    if shifts > 0:
        print("\n--- Recent Shifts ---")
        for shift in db.query(Shift).limit(3).all():
            print(f"  Shift {shift.shift_id}: {shift.start_time} to {shift.end_time} (org_id={shift.org_id})")

    print("\n" + "=" * 60)

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
