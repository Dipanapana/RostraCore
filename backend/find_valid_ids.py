from app.database import SessionLocal
from app.models.shift import Shift
from app.models.employee import Employee

db = SessionLocal()
shift = db.query(Shift).first()
employee = db.query(Employee).first()

if shift:
    print(f"Valid Shift ID: {shift.shift_id}")
else:
    print("No shifts found")

if employee:
    print(f"Valid Employee ID: {employee.employee_id}")
else:
    print("No employees found")
