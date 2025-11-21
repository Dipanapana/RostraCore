from app.database import SessionLocal
from app.models.shift import Shift
from app.models.employee import Employee

db = SessionLocal()

# Find shifts with invalid employee IDs
invalid_shifts = db.query(Shift).filter(
    Shift.assigned_employee_id != None,
    ~Shift.assigned_employee_id.in_(db.query(Employee.employee_id))
).all()

print(f"Found {len(invalid_shifts)} shifts with invalid employee IDs")

if invalid_shifts:
    for shift in invalid_shifts:
        shift.assigned_employee_id = None
    db.commit()
    print(f"Cleared all invalid assignments")
else:
    print("No invalid assignments found")

db.close()
