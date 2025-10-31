"""Debug roster generation to find the infeasibility issue."""

from datetime import datetime, timedelta
from app.database import SessionLocal
from app.algorithms.roster_generator import RosterGenerator
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.site import Site

def debug_roster():
    """Debug roster generation."""
    db = SessionLocal()

    try:
        print("=" * 70)
        print("ROSTER GENERATION DEBUG")
        print("=" * 70)

        # Check data
        emp_count = db.query(Employee).count()
        shift_count = db.query(Shift).count()
        site_count = db.query(Site).count()

        print(f"\nData Check:")
        print(f"  - Employees: {emp_count}")
        print(f"  - Shifts: {shift_count}")
        print(f"  - Sites: {site_count}")

        if emp_count == 0:
            print("\n[X] ERROR: No employees found!")
            return

        if shift_count == 0:
            print("\n[X] ERROR: No shifts found!")
            return

        # Get sample data
        sample_employees = db.query(Employee).limit(5).all()
        sample_shifts = db.query(Shift).limit(5).all()

        print(f"\nSample Employees:")
        for e in sample_employees:
            print(f"  - {e.first_name} {e.last_name}: role={e.role.value}, rate=R{e.hourly_rate}")

        print(f"\nSample Shifts:")
        for s in sample_shifts:
            print(f"  - Shift {s.shift_id}: site={s.site_id}, skill={s.required_skill}, {s.start_time}")

        # Try generating roster
        print(f"\n" + "=" * 70)
        print("ATTEMPTING ROSTER GENERATION...")
        print("=" * 70)

        generator = RosterGenerator(db)

        start_date = datetime.now()
        end_date = start_date + timedelta(days=7)

        print(f"\nDate Range: {start_date.date()} to {end_date.date()}")

        # Get unassigned shifts
        shifts = generator._get_unassigned_shifts(start_date, end_date)
        print(f"\nUnassigned Shifts: {len(shifts)}")

        if not shifts:
            print("[X] No unassigned shifts in date range!")
            return

        # Get available employees
        employees = generator._get_available_employees()
        print(f"Available Employees: {len(employees)}")

        if not employees:
            print("[X] No available employees!")
            return

        print(f"\nEmployee Roles:")
        role_counts = {}
        for e in employees:
            role = e["skills"][0] if e["skills"] else "none"
            role_counts[role] = role_counts.get(role, 0) + 1
        for role, count in role_counts.items():
            print(f"  - {role}: {count}")

        print(f"\nShift Required Skills:")
        skill_counts = {}
        for s in shifts:
            skill = s.get("required_skill", "none")
            skill_counts[skill] = skill_counts.get(skill, 0) + 1
        for skill, count in skill_counts.items():
            print(f"  - {skill}: {count}")

        # Check feasible pairs
        print(f"\n" + "=" * 70)
        print("CHECKING FEASIBILITY...")
        print("=" * 70)

        feasible_pairs = generator._generate_feasible_pairs(shifts, employees)
        print(f"\nFeasible Pairs Found: {len(feasible_pairs)}")

        # Check which employees have feasible shifts
        employees_with_shifts = set()
        for emp_id, shift_id in feasible_pairs:
            employees_with_shifts.add(emp_id)

        print(f"\nEmployees with at least one feasible shift: {len(employees_with_shifts)}/{len(employees)}")

        if len(employees_with_shifts) < len(employees):
            print(f"\nEmployees WITHOUT any feasible shifts:")
            for e in employees:
                if e['employee_id'] not in employees_with_shifts:
                    print(f"  - Employee {e['employee_id']}: {e['first_name']} {e['last_name']} ({e['skills']})")

        if len(feasible_pairs) == 0:
            print("\n[X] ERROR: No feasible pairs!")
            print("\nChecking why...")

            # Test first shift with first employee
            if shifts and employees:
                test_shift = shifts[0]
                test_employee = employees[0]

                print(f"\nTest Pairing:")
                print(f"  Employee: {test_employee['first_name']} {test_employee['last_name']}")
                print(f"    - Role: {test_employee['skills']}")
                print(f"    - Certs: {len(test_employee['certifications'])}")
                print(f"  Shift: {test_shift['shift_id']}")
                print(f"    - Required: {test_shift['required_skill']}")
                print(f"    - Time: {test_shift['start_time']}")

                # Check each constraint
                print(f"\nConstraint Checks:")

                # Skill match
                skill_match = generator._check_skill_match(test_employee, test_shift)
                print(f"  [+] Skill Match: {skill_match}")

                # Certification
                cert_valid = generator._check_certification_valid(test_employee, test_shift)
                print(f"  [+] Cert Valid: {cert_valid}")

                # Availability
                avail = generator._check_availability(test_employee, test_shift)
                print(f"  [+] Available: {avail}")

                # Hour limits
                current_hours = generator._get_employee_hours_this_week(test_employee['employee_id'])
                hour_ok = generator._check_hour_limits(test_employee, test_shift, current_hours)
                print(f"  [+] Hour Limits: {hour_ok} (current: {current_hours}h)")

                # Rest period
                rest_ok = generator._check_rest_period(test_employee, test_shift)
                print(f"  [+] Rest Period: {rest_ok}")

                # Distance
                dist_ok = generator._check_distance(test_employee, test_shift)
                print(f"  [+] Distance OK: {dist_ok}")

                print(f"\nAll checks passed: {all([skill_match, cert_valid, avail, hour_ok, rest_ok, dist_ok])}")
        else:
            print(f"\n[+] Found {len(feasible_pairs)} feasible pairs!")
            print(f"  Can assign up to {len(feasible_pairs)} shifts")

            # Try full generation
            try:
                result = generator.generate_roster(start_date, end_date)
                print(f"\n[+] SUCCESS!")
                print(f"  - Assignments: {len(result['assignments'])}")
                print(f"  - Unfilled: {len(result['unfilled_shifts'])}")
                print(f"  - Total Cost: R{result['summary']['total_cost']:.2f}")
            except Exception as e:
                print(f"\n[X] Generation failed: {e}")
                import traceback
                traceback.print_exc()

    except Exception as e:
        print(f"\n[X] ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    debug_roster()
