"""
Fix shift durations to be 12 hours (standard for security guards).
Currently many shifts are 8 hours which causes rostering issues.
"""

from app.database import SessionLocal
from app.models import Shift
from datetime import datetime, timedelta
from sqlalchemy import func

def analyze_and_fix_shifts():
    db = SessionLocal()
    try:
        # Get all shifts
        all_shifts = db.query(Shift).all()

        print(f"Analyzing {len(all_shifts)} shifts...")
        print("=" * 80)

        # Analyze current durations
        duration_counts = {}
        for shift in all_shifts:
            duration_hours = (shift.end_time - shift.start_time).total_seconds() / 3600
            duration_hours = round(duration_hours, 1)
            duration_counts[duration_hours] = duration_counts.get(duration_hours, 0) + 1

        print("\nCurrent shift duration distribution:")
        for duration, count in sorted(duration_counts.items()):
            print(f"  {duration}h shifts: {count}")

        # Show sample shifts
        print("\nSample shifts:")
        for shift in all_shifts[:5]:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            print(f"  Shift {shift.shift_id}: {shift.start_time.strftime('%Y-%m-%d %H:%M')} to {shift.end_time.strftime('%H:%M')} = {duration:.1f}h")

        # Ask for confirmation
        print("\n" + "=" * 80)
        print("Fix plan: Update all shifts to 12-hour duration")
        print("  - 8h shifts will be extended by 4 hours")
        print("  - Other durations will be adjusted to 12h")
        print("=" * 80)

        response = input("\nProceed with fixing shifts? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            return

        # Fix shifts
        updated_count = 0
        for shift in all_shifts:
            duration_hours = (shift.end_time - shift.start_time).total_seconds() / 3600

            if abs(duration_hours - 12.0) > 0.1:  # Not already 12 hours
                # Keep start time, set end time to 12 hours later
                shift.end_time = shift.start_time + timedelta(hours=12)
                updated_count += 1

        if updated_count > 0:
            db.commit()
            print(f"\nSUCCESS: Updated {updated_count} shifts to 12-hour duration")
        else:
            print("\nNo shifts needed updating - all are already 12 hours")

        # Verify
        print("\nVerifying updated shift durations:")
        new_duration_counts = {}
        for shift in all_shifts:
            duration_hours = (shift.end_time - shift.start_time).total_seconds() / 3600
            duration_hours = round(duration_hours, 1)
            new_duration_counts[duration_hours] = new_duration_counts.get(duration_hours, 0) + 1

        for duration, count in sorted(new_duration_counts.items()):
            print(f"  {duration}h shifts: {count}")

        print("\nSample updated shifts:")
        db.refresh(all_shifts[0])
        for shift in all_shifts[:5]:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            print(f"  Shift {shift.shift_id}: {shift.start_time.strftime('%Y-%m-%d %H:%M')} to {shift.end_time.strftime('%H:%M')} = {duration:.1f}h")

    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("RostraCore - Fix Shift Durations to 12 Hours")
    print("=" * 80)
    analyze_and_fix_shifts()
