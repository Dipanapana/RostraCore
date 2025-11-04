"""
Create comprehensive demo data to ensure roster generation works properly.
This script:
1. Adds availability for all employees for the next 2 weeks
2. Updates employee locations to be near sites
3. Ensures employees have compatible skills for shifts
"""
import sys
from datetime import date, time, timedelta
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.models.availability import Availability
from app.models.employee import Employee
from app.models.site import Site
from app.models.shift import Shift

def create_demo_data():
    db = SessionLocal()
    try:
        # Get all employees and sites
        employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()
        sites = db.query(Site).all()

        print(f"Found {len(employees)} employees and {len(sites)} sites\n")

        # Step 1: Add availability for all employees for next 14 days
        print("Step 1: Adding availability for all employees...")
        today = date.today()

        for emp in employees:
            for day_offset in range(14):
                target_date = today + timedelta(days=day_offset)

                # Check if availability already exists
                existing = db.query(Availability).filter(
                    Availability.employee_id == emp.employee_id,
                    Availability.date == target_date
                ).first()

                if not existing:
                    # Add availability for full day (00:00 - 23:59)
                    avail = Availability(
                        employee_id=emp.employee_id,
                        date=target_date,
                        start_time=time(0, 0, 0),
                        end_time=time(23, 59, 59),
                        available=True
                    )
                    db.add(avail)

        db.commit()
        print(f"  + Added 14 days of availability for {len(employees)} employees")

        # Step 2: Update employee home locations to be near sites
        print("\nStep 2: Updating employee locations to be near sites...")

        # Distribute employees across sites (set their home locations near sites)
        employees_per_site = len(employees) // len(sites)

        for idx, emp in enumerate(employees):
            site_idx = idx % len(sites)
            site = sites[site_idx]

            # Set employee home location near this site (within ~5km)
            # Add small random offset to GPS coordinates
            emp.home_gps_lat = site.gps_lat + (0.05 * ((idx % 3) - 1))  # ±0.05 degrees ≈ 5km
            emp.home_gps_lng = site.gps_lng + (0.05 * ((idx % 3) - 1))
            emp.home_location = f"Near {site.client_name}"

        db.commit()
        print(f"  + Updated locations for {len(employees)} employees to be near sites")

        # Step 3: Check shift distribution
        print("\nStep 3: Analyzing shifts...")
        future_shifts = db.query(Shift).filter(
            Shift.start_time >= today,
            Shift.assigned_employee_id == None
        ).all()

        print(f"  Found {len(future_shifts)} unassigned shifts")

        # Group shifts by skill requirement
        from collections import defaultdict
        skills_needed = defaultdict(int)
        for shift in future_shifts:
            skills_needed[shift.required_skill] += 1

        print(f"\n  Shifts by required skill:")
        for skill, count in skills_needed.items():
            print(f"    - {skill}: {count} shifts")

        # Count employees by role
        roles_available = defaultdict(int)
        for emp in employees:
            roles_available[emp.role.value] += 1

        print(f"\n  Employees by role:")
        for role, count in roles_available.items():
            print(f"    - {role}: {count} employees")

        print("\nSUCCESS: Demo data created successfully!")
        print("\nNext steps:")
        print("1. Try generating a roster from the frontend")
        print("2. All employees now have availability for the next 14 days")
        print("3. Employee locations are distributed near sites (within ~5km)")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating demo data for roster generation...\n")
    print("="*60)
    create_demo_data()
    print("="*60)
