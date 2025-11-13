"""
Analyze why 48 out of 168 shifts remain unfilled after roster generation.
Check constraints, feasibility, and identify bottlenecks.
"""

from app.database import SessionLocal
from app.models import Shift, Employee, Site, Availability, Certification
from datetime import datetime, timedelta, date
from collections import defaultdict
from sqlalchemy import and_, or_

def analyze_unfilled_shifts():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("UNFILLED SHIFTS ANALYSIS")
        print("=" * 80)

        # Get all shifts
        all_shifts = db.query(Shift).all()
        filled_shifts = [s for s in all_shifts if s.assigned_employee_id is not None]
        unfilled_shifts = [s for s in all_shifts if s.assigned_employee_id is None]

        print(f"\nTotal Shifts: {len(all_shifts)}")
        print(f"Filled Shifts: {len(filled_shifts)} ({len(filled_shifts)/len(all_shifts)*100:.1f}%)")
        print(f"Unfilled Shifts: {len(unfilled_shifts)} ({len(unfilled_shifts)/len(all_shifts)*100:.1f}%)")

        # Get all active employees
        employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()
        print(f"\nActive Employees: {len(employees)}")

        # Analyze unfilled shifts by site
        print("\n" + "=" * 80)
        print("UNFILLED SHIFTS BY SITE")
        print("=" * 80)
        unfilled_by_site = defaultdict(list)
        for shift in unfilled_shifts:
            site = db.query(Site).filter(Site.site_id == shift.site_id).first()
            unfilled_by_site[site.client_name].append(shift)

        for site_name, shifts in sorted(unfilled_by_site.items(), key=lambda x: len(x[1]), reverse=True):
            print(f"{site_name}: {len(shifts)} unfilled shifts")

        # Analyze unfilled shifts by time
        print("\n" + "=" * 80)
        print("UNFILLED SHIFTS BY TIME")
        print("=" * 80)
        unfilled_by_hour = defaultdict(int)
        for shift in unfilled_shifts:
            hour = shift.start_time.hour
            unfilled_by_hour[hour] += 1

        for hour in sorted(unfilled_by_hour.keys()):
            count = unfilled_by_hour[hour]
            print(f"{hour:02d}:00 - {count} unfilled shifts")

        # Analyze by required skill
        print("\n" + "=" * 80)
        print("UNFILLED SHIFTS BY REQUIRED SKILL")
        print("=" * 80)
        unfilled_by_skill = defaultdict(int)
        for shift in unfilled_shifts:
            skill = shift.required_skill or "None"
            unfilled_by_skill[skill] += 1

        for skill, count in sorted(unfilled_by_skill.items(), key=lambda x: x[1], reverse=True):
            print(f"{skill}: {count} unfilled shifts")

        # Check employee weekly hours
        print("\n" + "=" * 80)
        print("EMPLOYEE WEEKLY HOURS ANALYSIS")
        print("=" * 80)

        # Group filled shifts by week and employee
        employee_hours = defaultdict(lambda: defaultdict(float))
        for shift in filled_shifts:
            if shift.assigned_employee_id:
                week_start = shift.start_time.date() - timedelta(days=shift.start_time.weekday())
                hours = (shift.end_time - shift.start_time).total_seconds() / 3600
                employee_hours[shift.assigned_employee_id][week_start] += hours

        # Check who's at or near limit
        at_limit = []
        near_limit = []
        under_limit = []

        for emp in employees:
            max_hours = 0
            for week, hours in employee_hours[emp.employee_id].items():
                if hours > max_hours:
                    max_hours = hours

            if max_hours >= 48:
                at_limit.append((emp, max_hours))
            elif max_hours >= 40:
                near_limit.append((emp, max_hours))
            else:
                under_limit.append((emp, max_hours))

        print(f"Employees at 48h limit: {len(at_limit)}")
        for emp, hours in sorted(at_limit, key=lambda x: x[1], reverse=True)[:10]:
            print(f"  {emp.first_name} {emp.last_name} (ID {emp.employee_id}): {hours:.1f}h/week")

        print(f"\nEmployees near limit (40-47h): {len(near_limit)}")
        for emp, hours in sorted(near_limit, key=lambda x: x[1], reverse=True)[:10]:
            print(f"  {emp.first_name} {emp.last_name} (ID {emp.employee_id}): {hours:.1f}h/week")

        print(f"\nEmployees under 40h: {len(under_limit)}")
        for emp, hours in sorted(under_limit, key=lambda x: x[1], reverse=True)[:10]:
            assigned_count = len([s for s in filled_shifts if s.assigned_employee_id == emp.employee_id])
            print(f"  {emp.first_name} {emp.last_name} (ID {emp.employee_id}): {hours:.1f}h/week, {assigned_count} shifts")

        # Check certifications
        print("\n" + "=" * 80)
        print("CERTIFICATION ANALYSIS")
        print("=" * 80)

        employees_without_certs = []
        for emp in employees:
            certs = db.query(Certification).filter(
                and_(
                    Certification.employee_id == emp.employee_id,
                    Certification.verified == True,
                    Certification.expiry_date > date.today()
                )
            ).all()

            if len(certs) == 0:
                employees_without_certs.append(emp)

        print(f"Employees without valid certifications: {len(employees_without_certs)}")
        for emp in employees_without_certs[:10]:
            print(f"  {emp.first_name} {emp.last_name} (ID {emp.employee_id})")

        # Check availability
        print("\n" + "=" * 80)
        print("AVAILABILITY ANALYSIS")
        print("=" * 80)

        # Get date range of unfilled shifts
        if unfilled_shifts:
            min_date = min(s.start_time.date() for s in unfilled_shifts)
            max_date = max(s.start_time.date() for s in unfilled_shifts)

            print(f"Unfilled shifts date range: {min_date} to {max_date}")

            # Check how many employees are available on those dates
            for check_date in [min_date, min_date + timedelta(days=3), max_date]:
                available_count = db.query(Availability).filter(
                    and_(
                        Availability.date == check_date,
                        Availability.available == True
                    )
                ).count()
                print(f"  {check_date}: {available_count} employees available")

        # Sample detailed analysis of first 5 unfilled shifts
        print("\n" + "=" * 80)
        print("DETAILED ANALYSIS OF SAMPLE UNFILLED SHIFTS")
        print("=" * 80)

        for i, shift in enumerate(unfilled_shifts[:5], 1):
            site = db.query(Site).filter(Site.site_id == shift.site_id).first()
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600

            print(f"\n{i}. Shift {shift.shift_id}")
            print(f"   Site: {site.client_name}")
            print(f"   Time: {shift.start_time.strftime('%Y-%m-%d %H:%M')} to {shift.end_time.strftime('%H:%M')}")
            print(f"   Duration: {duration:.1f}h")
            print(f"   Required Skill: {shift.required_skill or 'None'}")

            # Check potential candidates
            shift_date = shift.start_time.date()
            available_on_date = db.query(Availability).filter(
                and_(
                    Availability.date == shift_date,
                    Availability.available == True
                )
            ).all()

            print(f"   Employees available on {shift_date}: {len(available_on_date)}")

            # Check who could work based on certifications
            suitable_employees = []
            for avail in available_on_date:
                emp = db.query(Employee).filter(Employee.employee_id == avail.employee_id).first()
                if emp.status == "ACTIVE":
                    certs = db.query(Certification).filter(
                        and_(
                            Certification.employee_id == emp.employee_id,
                            Certification.verified == True,
                            Certification.expiry_date > shift_date
                        )
                    ).all()

                    if certs:
                        # Check weekly hours
                        week_start = shift_date - timedelta(days=shift_date.weekday())
                        weekly_hours = employee_hours[emp.employee_id][week_start]

                        if weekly_hours + duration <= 48:
                            suitable_employees.append((emp, weekly_hours))

            print(f"   Suitable employees (available, certified, under 48h): {len(suitable_employees)}")
            if len(suitable_employees) == 0:
                print(f"   ISSUE: No suitable employees found!")
            else:
                print(f"   Top candidates:")
                for emp, hours in sorted(suitable_employees, key=lambda x: x[1])[:3]:
                    print(f"     - {emp.first_name} {emp.last_name} ({hours:.1f}h this week)")

        # Recommendations
        print("\n" + "=" * 80)
        print("RECOMMENDATIONS")
        print("=" * 80)

        if len(at_limit) > 40:
            print("1. BCEA 48h limit is constraining: Many employees at max hours")
            print("   Solution: Hire more guards or relax constraints slightly")

        if len(employees_without_certs) > 0:
            print(f"2. {len(employees_without_certs)} employees lack valid certifications")
            print("   Solution: Add certifications to these employees")

        if len(unfilled_by_hour) > 0:
            max_unfilled_hour = max(unfilled_by_hour.items(), key=lambda x: x[1])
            print(f"3. Peak unfilled time slot: {max_unfilled_hour[0]:02d}:00 with {max_unfilled_hour[1]} shifts")
            print("   Solution: Focus hiring on this time slot or adjust shift times")

        print("\n4. Consider adjusting optimizer parameters:")
        print("   - Increase max weekly hours to 50-52 (with overtime)")
        print("   - Reduce rest period requirement from 8h to 6h")
        print("   - Allow distance constraint violations with penalty")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    analyze_unfilled_shifts()
