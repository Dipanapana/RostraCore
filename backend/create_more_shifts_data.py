"""
Create additional test data to improve roster fill rate.
Issue: Only 31% of shifts filled due to 48h BCEA limit constraint.

Solutions:
1. Add more availability for underutilized employees
2. Create shifts with more variation in timing
3. Ensure better distribution of shifts across the week
"""

from app.database import SessionLocal
from app.models import Shift, Employee, Site, Availability
from datetime import datetime, timedelta, time, date
from random import choice, uniform

def create_additional_data():
    db = SessionLocal()
    try:
        print("Creating additional test data to improve roster generation...")
        print("=" * 80)

        # Get employees who are under 48h
        employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()

        # Get current date range
        today = date.today()

        # Extend availability for next 7 more days (total 21 days)
        print("\n1. Extending availability to 21 days total...")
        added_count = 0
        for emp in employees:
            for day_offset in range(14, 21):  # Days 14-20 (third week)
                target_date = today + timedelta(days=day_offset)

                # Check if availability already exists
                existing = db.query(Availability).filter(
                    Availability.employee_id == emp.employee_id,
                    Availability.date == target_date
                ).first()

                if not existing:
                    avail = Availability(
                        employee_id=emp.employee_id,
                        date=target_date,
                        start_time=time(0, 0, 0),
                        end_time=time(23, 59, 59),
                        available=True
                    )
                    db.add(avail)
                    added_count += 1

        if added_count > 0:
            db.commit()
            print(f"   Added {added_count} availability records")

        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Total employees: {len(employees)}")
        print(f"Availability extended to: {today + timedelta(days=20)}")
        print("\nNext steps:")
        print("1. Re-run roster generation with extended date range")
        print("2. Consider allowing overtime (50-52h per week) for critical shifts")
        print("3. Check optimizer constraints (rest periods, distance)")

    except Exception as e:
        print(f"\nERROR: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_additional_data()
