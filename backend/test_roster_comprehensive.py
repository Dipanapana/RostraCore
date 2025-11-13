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

        result = generator.generate_roster(
            start_date=start_date,
            end_date=end_date,
            employee_ids=employee_ids,
            site_ids=site_ids
        )

        return result

    except Exception as e:
        print(f"\nERROR DURING GENERATION:")
        print(f"  {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def analyze_results(db, result):
    """Analyze roster generation results"""
    print_section("STEP 6: RESULTS ANALYSIS")

    if not result:
        print("ERROR: No result to analyze!")
        return

    if not result.get("success"):
        print("ROSTER GENERATION FAILED!")
        print(f"Message: {result.get('message', 'Unknown error')}")
        return

    # Get summary
    summary = result.get("summary", {})
    assignments = result.get("assignments", [])

    print(f"STATUS: SUCCESS!")
    print(f"\nAssignments Made: {len(assignments)}")
    print(f"Total Cost: R {summary.get('total_cost', 0):.2f}")
    print(f"Total Hours: {summary.get('total_hours', 0):.1f}")

    if summary.get("unfilled_shifts"):
        print(f"\nUNFILLED SHIFTS: {len(summary['unfilled_shifts'])}")
        if len(summary['unfilled_shifts']) > 0:
            print("These shifts could not be filled:")
            for shift_info in summary['unfilled_shifts'][:10]:
                print(f"  - {shift_info}")

    # Show sample assignments
    if assignments:
        print(f"\nSAMPLE ASSIGNMENTS (first 15):")
        for i, assignment in enumerate(assignments[:15], 1):
            emp = db.query(Employee).filter(Employee.employee_id == assignment['employee_id']).first()
            shift = db.query(Shift).filter(Shift.shift_id == assignment['shift_id']).first()

            if emp and shift:
                emp_name = f"{emp.first_name} {emp.last_name}"
                site_name = shift.site.site_name if shift.site else "Unknown"
                date_str = shift.shift_date.strftime("%Y-%m-%d")
                time_str = f"{shift.start_time.strftime('%H:%M')}-{shift.end_time.strftime('%H:%M')}"

                print(f"{i:2d}. {date_str} {time_str} - {emp_name} @ {site_name}")

    # Employee workload
    print("\nEMPLOYEE WORKLOAD:")
    employee_hours = {}
    for assignment in assignments:
        emp_id = assignment['employee_id']
        if emp_id not in employee_hours:
            employee_hours[emp_id] = {
                'shifts': 0,
                'hours': 0,
                'cost': 0
            }
        employee_hours[emp_id]['shifts'] += 1
        employee_hours[emp_id]['hours'] += assignment.get('hours', 0)
        employee_hours[emp_id]['cost'] += assignment.get('cost', 0)

    for emp_id, stats in employee_hours.items():
        emp = db.query(Employee).filter(Employee.employee_id == emp_id).first()
        if emp:
            print(f"  {emp.first_name} {emp.last_name}: {stats['shifts']} shifts, {stats['hours']:.1f} hours, R {stats['cost']:.2f}")


def main():
    """Main test function"""
    print_header("ROSTRACORE ROSTER GENERATION TEST")

    db = next(get_db())

    try:
        # Step 1: Check database
        if not check_database_status(db):
            print("\nTEST ABORTED: Fix database issues first!")
            print("\nQuick fixes:")
            print("  1. Add employees: Go to Employees page and create 3-5 employees")
            print("  2. Add sites: Go to Clients page and create 1-2 sites")
            print("  3. Add shifts: Go to Shifts page and create 10-15 shifts")
            sys.exit(1)

        # Step 2-4: Show details
        show_employee_details(db)
        show_site_details(db)
        show_shift_details(db)

        # Step 5: Generate roster
        result = generate_roster(db)

        # Step 6: Analyze results
        analyze_results(db, result)

        print_header("TEST COMPLETE")

        if result and result.get("success"):
            print("STATUS: ROSTER GENERATION WORKING!")
            print("\nNext steps:")
            print("  1. Test roster generation from the frontend")
            print("  2. Verify assignments in the Roster page")
            print("  3. Check dashboard metrics update correctly")
        else:
            print("STATUS: ROSTER GENERATION FAILED")
            print("\nTroubleshooting:")
            print("  1. Check backend/app/config.py settings:")
            print("     - TESTING_MODE = True")
            print("     - SKIP_CERTIFICATION_CHECK = True")
            print("     - SKIP_AVAILABILITY_CHECK = True")
            print("     - MAX_HOURS_WEEK = 60")
            print("     - MIN_REST_HOURS = 6")
            print("  2. Ensure employees have correct roles matching shift requirements")
            print("  3. Check backend logs for detailed error messages")
            print("  4. Refer to ROSTER_GENERATION_FIX_GUIDE.md for complete guide")

    except Exception as e:
        print_header("CRITICAL ERROR")
        print(f"Error: {type(e).__name__}")
        print(f"Message: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
