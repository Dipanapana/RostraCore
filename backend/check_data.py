from app.database import SessionLocal
from app.models.shift import Shift
from app.models.employee import Employee

db = SessionLocal()
shift = db.query(Shift).first()
employee = db.query(Employee).first()

if shift and employee:
    print(f"Shift ID: {shift.shift_id}")
    print(f"Employee ID: {employee.employee_id}")
else:
    print("No data found")
