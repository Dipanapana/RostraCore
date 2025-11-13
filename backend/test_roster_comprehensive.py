"""
Comprehensive Roster Generation Test Script
Tests roster generation end-to-end with detailed diagnostics
"""

from app.database import get_db
from app.models.employee import Employee
from app.models.site import Site
from app.models.shift import Shift
from app.services.roster_generator import RosterGenerator
from datetime import datetime, timedelta
import sys


def print_header(title):
    """Print formatted header"""
    print("\n" + "=" * 80)
    print(title.center(80))
    print("=" * 80 + "\n")


def print_section(title):
    """Print formatted section"""
    print("\n" + "-" * 80)
    print(title)
    print("-" * 80)


def check_database_status(db):
    """Check database has required data"""
    print_section("STEP 1: DATABASE STATUS CHECK")

    employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()
    sites = db.query(Site).all()
    unfilled_shifts = db.query(Shift).filter(Shift.status == "UNFILLED").all()
    all_shifts = db.query(Shift).all()

    print(f"Active Employees: {len(employees)}")
    print(f"Total Sites: {len(sites)}")
    print(f"Unfilled Shifts: {len(unfilled_shifts)}")
    print(f"Total Shifts: {len(all_shifts)}")

    # Validation
    errors = []
    if len(employees) == 0:
        errors.append("NO EMPLOYEES FOUND - Add employees first!")
    elif len(employees) < 3:
        errors.append(f"WARNING: Only {len(employees)} employees - may not be enough for optimization")

    if len(sites) == 0:
        errors.append("NO SITES FOUND - Add sites/clients first!")

    if len(unfilled_shifts) == 0:
        errors.append("NO UNFILLED SHIFTS - Create shifts first!")

    if errors:
        print("\nERRORS FOUND:")
        for error in errors:
            print(f"  X {error}")
        return False

    print("\nSTATUS: OK - Database has sufficient data")
    return True


def show_employee_details(db):
    """Show detailed employee information"""
    print_section("STEP 2: EMPLOYEE DETAILS")

    employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()

    for emp in employees:
        print(f"\nEmployee: {emp.first_name} {emp.last_name} (ID: {emp.employee_id})")
        print(f"  Role: {emp.role}")
        print(f"  Hourly Rate: R {emp.hourly_rate:.2f}")
        print(f"  Status: {emp.status}")
        if emp.skills:
            skills_data = emp.skills[0] if emp.skills else None
            if skills_data:
                print(f"  Skills: Armed={skills_data.armed}, Supervisor={skills_data.is_supervisor}")


def show_site_details(db):
    """Show detailed site information"""
    print_section("STEP 3: SITE DETAILS")

    sites = db.query(Site).all()

    for site in sites:
        print(f"\nSite: {site.site_name} (ID: {site.site_id})")
        print(f"  Location: {site.location if hasattr(site, 'location') else 'N/A'}")
        print(f"  Client: {site.client.client_name if site.client else 'N/A'}")

        # Count shifts at this site
        shifts = db.query(Shift).filter(Shift.site_id == site.site_id).all()
        unfilled = [s for s in shifts if s.status == "UNFILLED"]
        print(f"  Shifts: {len(unfilled)} unfilled / {len(shifts)} total")


def show_shift_details(db):
    """Show detailed shift information"""
    print_section("STEP 4: SHIFT DETAILS")

    unfilled_shifts = db.query(Shift).filter(Shift.status == "UNFILLED").order_by(Shift.shift_date, Shift.start_time).all()

    if len(unfilled_shifts) > 20:
        print(f"Showing first 20 of {len(unfilled_shifts)} unfilled shifts:\n")
        shifts_to_show = unfilled_shifts[:20]
    else:
        print(f"All {len(unfilled_shifts)} unfilled shifts:\n")
        shifts_to_show = unfilled_shifts

    for shift in shifts_to_show:
        site_name = shift.site.site_name if shift.site else "Unknown Site"
        print(f"{shift.shift_date} {shift.start_time}-{shift.end_time} @ {site_name}")
        print(f"  Required: {shift.required_guards} x {shift.role_required}")
        print(f"  Status: {shift.status}")


def generate_roster(db):
    """Test roster generation"""
    print_section("STEP 5: GENERATING ROSTER")

    # Get date range from unfilled shifts
    unfilled_shifts = db.query(Shift).filter(Shift.status == "UNFILLED").all()
    if not unfilled_shifts:
        print("ERROR: No unfilled shifts to generate roster for!")
        return None

    shift_dates = [s.shift_date for s in unfilled_shifts]
    start_date = min(shift_dates)
    end_date = max(shift_dates)

    print(f"Date Range: {start_date} to {end_date}")
    print(f"Shifts to Fill: {len(unfilled_shifts)}")
    print(f"Algorithm: production (CP-SAT optimizer)")
    print("\nGenerating roster... (this may take 30-60 seconds)")

    try:
        generator = RosterGenerator(db, algorithm="production")

        # Get all employee and site IDs
        employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()
        sites = db.query(Site).all()

        employee_ids = [emp.employee_id for emp in employees]
        site_ids = [site.site_id for site in sites]
Tests roster generation with current database data and prints debug information
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import engine, get_db
from app.models import Employee, Site, Shift
from app.algorithms.roster_generator import RosterGenerator
from app.config import settings

def test_roster_generation():
    """Test roster generation with actual database data"""

    print("="*80)
    print("ROSTRACORE ROSTER GENERATION TEST")
    print("="*80)

    db: Session = next(get_db())

    try:
        # 1. Check Database Data
        print("\n[1] DATABASE STATUS:")
        print("-"*80)

        employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()
        sites = db.query(Site).all()
        existing_shifts = db.query(Shift).filter(Shift.start_time >= datetime.now()).count()

        print(f"✓ Active Employees: {len(employees)}")
        print(f"✓ Sites: {len(sites)}")
        print(f"✓ Existing Future Shifts: {existing_shifts}")

        if not employees:
            print("\n❌ ERROR: No active employees found!")
            print("   Run: python scripts/create_sample_data.py")
            return

        if not sites:
            print("\n❌ ERROR: No sites found!")
            print("   Run: python scripts/create_sample_data.py")
            return

        # Print employee details
        print("\n[2] EMPLOYEE DETAILS:")
        print("-"*80)
        for emp in employees[:5]:  # Show first 5
            print(f"  • {emp.first_name} {emp.last_name}")
            print(f"    - ID: {emp.employee_id}")
            print(f"    - Role: {emp.role}")
            print(f"    - Hourly Rate: R{emp.hourly_rate}")
            print(f"    - Home GPS: ({emp.home_gps_lat}, {emp.home_gps_lng})")
            print(f"    - Status: {emp.status}")

        if len(employees) > 5:
            print(f"  ... and {len(employees) - 5} more employees")

        # Print site details
        print("\n[3] SITE DETAILS:")
        print("-"*80)
        for site in sites[:5]:  # Show first 5
            print(f"  • {site.site_name}")
            print(f"    - ID: {site.site_id}")
            print(f"    - Client: {site.client_name}")
            print(f"    - Required Skill: {site.required_skill}")
            print(f"    - Min Staff: {site.min_staff}")
            print(f"    - GPS: ({site.gps_lat}, {site.gps_lng})")

        if len(sites) > 5:
            print(f"  ... and {len(sites) - 5} more sites")

        # 2. Create Test Shifts for Next Week
        print("\n[4] GENERATING TEST SHIFTS FOR NEXT WEEK:")
        print("-"*80)

        start_date = datetime.now() + timedelta(days=1)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=7)

        print(f"Period: {start_date.date()} to {end_date.date()}")

        # Delete existing test shifts in this range
        db.query(Shift).filter(
            Shift.start_time >= start_date,
            Shift.start_time < end_date
        ).delete()
        db.commit()

        # Create shifts for each site
        test_shifts_created = 0
        for site in sites[:3]:  # Use first 3 sites
            for day in range(7):  # 7 days
                shift_date = start_date + timedelta(days=day)

                # Morning shift: 08:00 - 16:00
                morning_shift = Shift(
                    site_id=site.site_id,
                    start_time=shift_date.replace(hour=8),
                    end_time=shift_date.replace(hour=16),
                    required_skill=site.required_skill or "Security Guard",
                    status="unassigned"
                )
                db.add(morning_shift)
                test_shifts_created += 1

                # Evening shift: 16:00 - 00:00
                evening_shift = Shift(
                    site_id=site.site_id,
                    start_time=shift_date.replace(hour=16),
                    end_time=(shift_date + timedelta(days=1)).replace(hour=0),
                    required_skill=site.required_skill or "Security Guard",
                    status="unassigned"
                )
                db.add(evening_shift)
                test_shifts_created += 1

        db.commit()
        print(f"✓ Created {test_shifts_created} test shifts")

        # 3. Initialize Roster Generator
        print("\n[5] INITIALIZING ROSTER GENERATOR:")
        print("-"*80)

        unassigned_shifts = db.query(Shift).filter(
            Shift.start_time >= start_date,
            Shift.start_time < end_date,
            Shift.assigned_employee_id == None
        ).all()

        print(f"Unassigned Shifts: {len(unassigned_shifts)}")
        print(f"Algorithm: {settings.ROSTER_ALGORITHM}")
        print(f"Max Hours/Week: {settings.MAX_HOURS_WEEK}")
        print(f"Min Rest Hours: {settings.MIN_REST_HOURS}")
        print(f"Max Distance: {settings.MAX_DISTANCE_KM} km")
        print(f"Testing Mode: {settings.TESTING_MODE}")

        generator = RosterGenerator(db, algorithm="production")

        # 4. Generate Roster
        print("\n[6] GENERATING ROSTER:")
        print("-"*80)
        print("This may take a few seconds...")

        result = generator.generate_roster(
            start_date=start_date,
            end_date=end_date,
            employee_ids=[emp.employee_id for emp in employees],
            site_ids=[site.site_id for site in sites[:3]]
        )

        # 5. Display Results
        print("\n[7] ROSTER GENERATION RESULTS:")
        print("="*80)

        print(f"\n📊 SUMMARY:")
        print(f"  • Total Shifts: {result['summary']['total_shifts']}")
        print(f"  • Assigned: {result['summary']['assigned_shifts']}")
        print(f"  • Unassigned: {result['summary']['unassigned_shifts']}")
        print(f"  • Fill Rate: {result['summary']['fill_rate']:.1f}%")
        print(f"  • Total Cost: R{result['summary']['total_cost']:.2f}")
        print(f"  • Total Hours: {result['summary']['total_hours']:.1f}")
        print(f"  • Fairness Score: {result['summary']['fairness_score']:.3f}")

        print(f"\n📋 ASSIGNED SHIFTS:")
        print("-"*80)

        if result['assignments']:
            for i, assignment in enumerate(result['assignments'][:10], 1):  # Show first 10
                emp = db.query(Employee).filter_by(employee_id=assignment['employee_id']).first()
                site = db.query(Site).filter_by(site_id=assignment['site_id']).first()

                print(f"{i}. {emp.first_name} {emp.last_name} → {site.site_name}")
                print(f"   {assignment['start_time']} to {assignment['end_time']}")
                print(f"   Duration: {assignment['duration_hours']:.1f}h | Cost: R{assignment['cost']:.2f}")
                print()

            if len(result['assignments']) > 10:
                print(f"... and {len(result['assignments']) - 10} more assignments")
        else:
            print("❌ No shifts were assigned!")
            print("\nPossible reasons:")
            print("  1. No employees meet the skill requirements")
            print("  2. All employees exceed max hours constraints")
            print("  3. Distance constraints are too restrictive")
            print(f"\nTesting Mode: {settings.TESTING_MODE}")
            print(f"Skip Certification Check: {settings.SKIP_CERTIFICATION_CHECK}")
            print(f"Skip Availability Check: {settings.SKIP_AVAILABILITY_CHECK}")

        print(f"\n⚠️  UNASSIGNED SHIFTS:")
        print("-"*80)

        if result['unassigned']:
            for i, shift_id in enumerate(result['unassigned'][:5], 1):  # Show first 5
                shift = db.query(Shift).filter_by(shift_id=shift_id).first()
                site = db.query(Site).filter_by(site_id=shift.site_id).first()

                print(f"{i}. {site.site_name}")
                print(f"   {shift.start_time} to {shift.end_time}")
                print(f"   Required Skill: {shift.required_skill}")
                print()

            if len(result['unassigned']) > 5:
                print(f"... and {len(result['unassigned']) - 5} more unassigned shifts")
        else:
            print("✓ All shifts were successfully assigned!")

        print("\n" + "="*80)
        print("TEST COMPLETE")
        print("="*80)

        return result

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

    finally:
        db.close()

if __name__ == "__main__":
    test_roster_generation()
