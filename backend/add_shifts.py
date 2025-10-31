"""Add shifts to existing sample data."""

from datetime import datetime, timedelta
import random
from app.database import SessionLocal
from app.models.site import Site
from app.models.shift import Shift, ShiftStatus

def add_shifts():
    """Add shifts for next 7 days."""
    db = SessionLocal()

    try:
        print("Adding shifts to existing sites...")

        # Get all sites
        sites = db.query(Site).all()

        if not sites:
            print("No sites found! Run create_sample_data.py first.")
            return

        shifts_created = 0

        # Create shifts for next 7 days
        for day_offset in range(7):
            for site in sites:
                # Morning shift (6am-2pm)
                shift = Shift(
                    site_id=site.site_id,
                    start_time=datetime.now() + timedelta(days=day_offset, hours=6),
                    end_time=datetime.now() + timedelta(days=day_offset, hours=14),
                    required_skill=random.choice(["armed", "unarmed"]),
                    assigned_employee_id=None,
                    status=ShiftStatus.PLANNED
                )
                db.add(shift)
                shifts_created += 1

                # Afternoon shift (2pm-10pm)
                shift = Shift(
                    site_id=site.site_id,
                    start_time=datetime.now() + timedelta(days=day_offset, hours=14),
                    end_time=datetime.now() + timedelta(days=day_offset, hours=22),
                    required_skill=random.choice(["armed", "unarmed"]),
                    assigned_employee_id=None,
                    status=ShiftStatus.PLANNED
                )
                db.add(shift)
                shifts_created += 1

                # Night shift (10pm-6am)
                shift = Shift(
                    site_id=site.site_id,
                    start_time=datetime.now() + timedelta(days=day_offset, hours=22),
                    end_time=datetime.now() + timedelta(days=day_offset + 1, hours=6),
                    required_skill=random.choice(["armed", "unarmed"]),
                    assigned_employee_id=None,
                    status=ShiftStatus.PLANNED
                )
                db.add(shift)
                shifts_created += 1

        db.commit()
        print(f"Successfully created {shifts_created} shifts!")
        print(f"  - Sites: {len(sites)}")
        print(f"  - Days: 7")
        print(f"  - Shifts per site per day: 3")
        print(f"\nYou can now generate rosters using /api/v1/roster/generate")

    except Exception as e:
        print(f"Error adding shifts: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    add_shifts()
