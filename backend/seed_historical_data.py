#!/usr/bin/env python3
"""
Seed historical data for December 2025, January 2026, and February 2026.

Creates realistic operational data:
- Site staffing profiles (if missing)
- Shift pattern templates
- Shifts for 3 months (auto-generated from profiles)
- Shift assignments (employee→shift with 4-on-4-off rotation)
- Attendance records (check-in/check-out)
- Payroll summaries (monthly, with SA deductions)

Usage:
    python seed_historical_data.py                  # auto-detect first org
    python seed_historical_data.py --org-id 1       # target specific org
"""

import argparse
import logging
import os
import sys
import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

# Suppress SQLAlchemy SQL logging (output is enormous otherwise)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def find_default_org_id():
    """Auto-detect the first active organization."""
    from app.database import SessionLocal
    from app.models.organization import Organization

    db = SessionLocal()
    try:
        org = db.query(Organization).filter(
            Organization.is_active == True,
        ).order_by(Organization.org_id).first()
        if org:
            return org.org_id, org.company_name
        return None, None
    finally:
        db.close()


def seed_historical_data(org_id: int):
    """Main seed function."""
    from app.database import SessionLocal
    from app.models.employee import Employee, EmployeeStatus
    from app.models.site import Site
    from app.models.client import Client
    from app.models.shift import Shift, ShiftStatus
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.payroll import PayrollSummary
    from app.models.site_staffing_profile import (
        SiteStaffingProfile, PeriodType, DayType, PSIRAGradeRequirement,
    )
    from app.models.shift_pattern_template import ShiftPatternTemplate, PatternType

    db = SessionLocal()

    # Date range: 3 months
    SEED_START = date(2025, 12, 1)
    SEED_END = date(2026, 2, 28)
    SEED_END_EXCLUSIVE = date(2026, 3, 1)  # for < comparisons

    try:
        print("=" * 60)
        print(f"SEEDING HISTORICAL DATA FOR ORG {org_id}")
        print(f"Period: December 2025 - February 2026 (3 months)")
        print("=" * 60)

        # ------------------------------------------------------------------
        # 1. Validate org exists and load data
        # ------------------------------------------------------------------
        from app.models.organization import Organization
        org = db.query(Organization).filter(Organization.org_id == org_id).first()
        if not org:
            print(f"[ERROR] Organization {org_id} not found!")
            return False

        print(f"\nOrganization: {org.company_name} (org_id={org_id})")

        # Show login credentials hint
        from app.models.user import User
        admin_user = db.query(User).filter(
            User.org_id == org_id,
            User.is_active == True,
        ).first()
        if admin_user:
            print(f"Admin user: {admin_user.username} ({admin_user.email})")
            print(f"Login at: https://www.rostracore.com/login")

        employees = db.query(Employee).filter(
            Employee.org_id == org_id,
            Employee.status == EmployeeStatus.ACTIVE,
        ).all()

        sites = db.query(Site).filter(Site.org_id == org_id).all()
        clients = db.query(Client).filter(Client.org_id == org_id).all()

        print(f"\nEmployees: {len(employees)}")
        print(f"Sites: {len(sites)}")
        print(f"Clients: {len(clients)}")

        if len(employees) < 4:
            print("[ERROR] Need at least 4 employees for rotation!")
            return False
        if len(sites) == 0:
            print("[ERROR] No sites found!")
            return False

        # ------------------------------------------------------------------
        # 2. Set employee preferred_site_ids
        # ------------------------------------------------------------------
        print("\n2. Setting employee site preferences...")

        # Classify sites by type
        armed_sites = [s for s in sites if s.required_skill and 'armed' in s.required_skill.lower()]
        unarmed_sites = [s for s in sites if s not in armed_sites]

        # Classify employees
        armed_employees = [e for e in employees if e.psira_grade in ('A',)]
        unarmed_employees = [e for e in employees if e not in armed_employees]

        pref_count = 0
        for emp in employees:
            # Assign 1-2 preferred sites based on capability
            if emp in armed_employees and armed_sites:
                preferred = [random.choice(armed_sites).site_id]
                if unarmed_sites:
                    preferred.append(random.choice(unarmed_sites).site_id)
            elif unarmed_sites:
                preferred = [random.choice(unarmed_sites).site_id]
                if len(unarmed_sites) > 1:
                    other = random.choice([s for s in unarmed_sites if s.site_id != preferred[0]])
                    preferred.append(other.site_id)
            else:
                preferred = [random.choice(sites).site_id]

            emp.preferred_site_ids = preferred
            pref_count += 1

        db.commit()
        print(f"   + Set preferred_site_ids for {pref_count} employees")

        # ------------------------------------------------------------------
        # 3. Create site staffing profiles (if missing)
        # ------------------------------------------------------------------
        print("\n3. Creating site staffing profiles...")

        from sqlalchemy import text as sa_text

        profile_count = 0

        for site in sites:
            existing = db.query(SiteStaffingProfile).filter(
                SiteStaffingProfile.site_id == site.site_id,
            ).count()
            if existing > 0:
                print(f"   ~ {site.site_name}: {existing} profiles exist (skipping)")
                continue

            # Create standard profiles with realistic staffing levels
            min_staff = site.min_staff or 1
            day_staff = max(min_staff, 2)
            night_staff = max(1, min_staff - 1)
            weekend_day_staff = max(1, day_staff - 1)

            # Use raw SQL to avoid SQLAlchemy enum name/value mismatch
            profiles_data = [
                ("Weekday Day", "day", "weekday", day_staff),
                ("Weekday Night", "night", "weekday", night_staff),
                ("Weekend Day", "day", "weekend", weekend_day_staff),
                ("Weekend Night", "night", "weekend", night_staff),
            ]

            for pname, period, daytype, staff in profiles_data:
                db.execute(sa_text("""
                    INSERT INTO site_staffing_profiles
                    (org_id, site_id, profile_name, period_type, day_type,
                     required_staff, required_psira_grade, requires_firearm, priority, is_active)
                    VALUES (:org_id, :site_id, :pname, :period, :daytype,
                            :staff, 'any', false, 10, true)
                """), {
                    "org_id": org_id, "site_id": site.site_id,
                    "pname": pname, "period": period, "daytype": daytype,
                    "staff": staff,
                })

            db.commit()
            profile_count += 4
            print(f"   + {site.site_name}: day={day_staff} night={night_staff}")

        print(f"   + Created {profile_count} staffing profiles")

        # ------------------------------------------------------------------
        # 4. Create shift pattern template (if missing)
        # ------------------------------------------------------------------
        print("\n4. Creating shift pattern template...")

        existing_pattern = db.query(ShiftPatternTemplate).filter(
            ShiftPatternTemplate.org_id == org_id,
        ).first()

        if existing_pattern:
            pattern = existing_pattern
            print(f"   ~ Pattern exists: {pattern.name}")
        else:
            pattern = ShiftPatternTemplate(
                org_id=org_id,
                name="4-on-4-off (12-hour)",
                description="Standard 12-hour rotation: 4 day shifts, 4 off, 4 night shifts, 4 off",
                pattern_type=PatternType.FOUR_ON_FOUR_OFF,
                shift_duration_hours=12,
                days_on=4,
                nights_on=4,
                rest_after_days=4,
                rest_after_nights=4,
                day_shift_start=time(6, 0),
                day_shift_end=time(18, 0),
                night_shift_start=time(18, 0),
                night_shift_end=time(6, 0),
                max_consecutive_days=6,
                max_consecutive_nights=4,
                min_rest_between_shifts=12,
                max_hours_per_week=45,
                is_default=True,
                is_active=True,
            )
            db.add(pattern)
            db.commit()
            db.refresh(pattern)
            print(f"   + Created pattern: {pattern.name}")

        # Assign rotation groups to employees
        groups = ['A', 'B', 'C', 'D']
        for i, emp in enumerate(employees):
            emp.shift_pattern_id = pattern.template_id
            emp.rotation_group = groups[i % len(groups)]
            emp.pattern_start_date = SEED_START
        db.commit()
        print(f"   + Assigned rotation groups to {len(employees)} employees")

        # ------------------------------------------------------------------
        # 5. Generate shifts for Dec 2025 + Jan 2026 + Feb 2026
        # ------------------------------------------------------------------
        print("\n5. Generating shifts (Dec 2025 - Feb 2026)...")

        from app.services.shift_auto_generator import ShiftAutoGenerator

        # Check for existing shifts in this range
        existing_shifts = db.query(Shift).filter(
            Shift.org_id == org_id,
            Shift.start_time >= datetime.combine(SEED_START, time(0, 0)),
            Shift.start_time < datetime.combine(SEED_END_EXCLUSIVE, time(0, 0)),
        ).count()

        if existing_shifts > 0:
            print(f"   ~ {existing_shifts} shifts already exist in this range")

        result = ShiftAutoGenerator.generate_shifts_for_org(
            db=db,
            org_id=org_id,
            site_ids=[s.site_id for s in sites],
            start_date=SEED_START,
            end_date=SEED_END,
        )
        print(f"   + Created {result['shifts_created']} new shifts")
        for site_name, count in result.get('by_site', {}).items():
            print(f"     - {site_name}: {count} shifts")

        # ------------------------------------------------------------------
        # 6. Create shift assignments (4-on-4-off rotation)
        # ------------------------------------------------------------------
        print("\n6. Creating shift assignments...")

        all_shifts = db.query(Shift).filter(
            Shift.org_id == org_id,
            Shift.start_time >= datetime.combine(SEED_START, time(0, 0)),
            Shift.start_time < datetime.combine(SEED_END_EXCLUSIVE, time(0, 0)),
        ).order_by(Shift.start_time).all()

        # Group shifts by site
        shifts_by_site: dict = {}
        for shift in all_shifts:
            if shift.site_id not in shifts_by_site:
                shifts_by_site[shift.site_id] = []
            shifts_by_site[shift.site_id].append(shift)

        assignment_count = 0
        cycle_len = 16  # 4 on + 4 off + 4 on + 4 off
        epoch = SEED_START

        # Determine which shifts are in the past (mark completed) vs current month
        today = date.today()

        for site in sites:
            site_shifts = shifts_by_site.get(site.site_id, [])
            if not site_shifts:
                continue

            # Get employees with this site in preferred, or fallback to all
            site_employees = [
                e for e in employees
                if e.preferred_site_ids and site.site_id in e.preferred_site_ids
            ]
            if len(site_employees) < 2:
                site_employees = list(employees)

            # Sort by rotation group
            site_employees.sort(key=lambda e: e.rotation_group or 'Z')

            for shift in site_shifts:
                # Check if already assigned
                existing_assignment = db.query(ShiftAssignment).filter(
                    ShiftAssignment.shift_id == shift.shift_id,
                ).first()
                if existing_assignment:
                    continue

                shift_date = shift.start_time.date()
                day_offset = (shift_date - epoch).days
                is_night = shift.start_time.hour >= 18
                is_past = shift_date < today

                # For each required staff slot
                required = shift.required_staff or 1
                assigned_for_shift = 0

                for emp in site_employees:
                    if assigned_for_shift >= required:
                        break

                    # 4-on-4-off rotation logic
                    group_idx = groups.index(emp.rotation_group) if emp.rotation_group in groups else 0
                    # Each group is offset by 4 days
                    emp_offset = (day_offset + group_idx * 4) % cycle_len

                    # Days 0-3: day shift, 4-7: rest, 8-11: night shift, 12-15: rest
                    if not is_night and 0 <= emp_offset <= 3:
                        on_duty = True
                    elif is_night and 8 <= emp_offset <= 11:
                        on_duty = True
                    else:
                        on_duty = False

                    if not on_duty:
                        continue

                    # Check employee not already assigned to another shift this day
                    day_start = datetime.combine(shift_date, time(0, 0))
                    day_end = datetime.combine(shift_date + timedelta(days=1), time(0, 0))
                    already_assigned = db.query(ShiftAssignment).join(Shift).filter(
                        ShiftAssignment.employee_id == emp.employee_id,
                        Shift.start_time >= day_start,
                        Shift.start_time < day_end,
                    ).first()

                    if already_assigned:
                        continue

                    # Calculate cost (BCEA-compliant)
                    hourly_rate = float(emp.hourly_rate or 65.0)
                    duration = (shift.end_time - shift.start_time).total_seconds() / 3600
                    regular_hours = min(duration, 12.0)
                    regular_pay = hourly_rate * regular_hours

                    night_premium = 0.0
                    sunday_premium = 0.0
                    holiday_premium = 0.0

                    if is_night:
                        night_premium = regular_pay * 0.10  # 10% night premium

                    if shift_date.weekday() == 6:  # Sunday
                        sunday_premium = regular_pay * 0.50  # 1.5x

                    # Check SA public holidays
                    sa_holidays = {
                        date(2025, 12, 16): "Day of Reconciliation",
                        date(2025, 12, 25): "Christmas Day",
                        date(2025, 12, 26): "Day of Goodwill",
                        date(2026, 1, 1): "New Year's Day",
                        date(2026, 2, 1): "Workers' Day Observed",  # placeholder
                    }
                    if shift_date in sa_holidays:
                        holiday_premium = regular_pay * 1.00  # 2x total (100% extra)

                    total_cost = regular_pay + night_premium + sunday_premium + holiday_premium

                    # Past shifts: completed with attendance. Current/future: confirmed
                    if is_past:
                        status = AssignmentStatus.COMPLETED.value
                        checked_in = True
                        check_in_time = shift.start_time + timedelta(minutes=random.randint(-5, 10))
                        checked_out = True
                        check_out_time = shift.end_time + timedelta(minutes=random.randint(-5, 10))
                    else:
                        status = AssignmentStatus.CONFIRMED.value
                        checked_in = False
                        check_in_time = None
                        checked_out = False
                        check_out_time = None

                    assignment = ShiftAssignment(
                        shift_id=shift.shift_id,
                        employee_id=emp.employee_id,
                        assigned_at=datetime.combine(shift_date - timedelta(days=7), time(9, 0)),
                        status=status,
                        regular_hours=regular_hours,
                        overtime_hours=0.0,
                        regular_pay=regular_pay,
                        overtime_pay=0.0,
                        night_premium=night_premium,
                        sunday_premium=sunday_premium,
                        holiday_premium=holiday_premium,
                        travel_reimbursement=0.0,
                        total_cost=total_cost,
                        is_confirmed=True,
                        confirmation_datetime=datetime.combine(shift_date - timedelta(days=5), time(14, 0)),
                        checked_in=checked_in,
                        check_in_time=check_in_time,
                        checked_out=checked_out,
                        check_out_time=check_out_time,
                    )
                    db.add(assignment)
                    assigned_for_shift += 1
                    assignment_count += 1

                # Mark past shifts as completed, future as confirmed
                if is_past:
                    shift.status = ShiftStatus.COMPLETED
                else:
                    shift.status = ShiftStatus.CONFIRMED

            # Batch commit per site
            db.commit()

        print(f"   + Created {assignment_count} shift assignments")

        # Update legacy assigned_employee_id
        print("   + Updating legacy assigned_employee_id...")
        updated = 0
        for shift in all_shifts:
            if shift.assigned_employee_id:
                continue
            first_assignment = db.query(ShiftAssignment).filter(
                ShiftAssignment.shift_id == shift.shift_id,
            ).first()
            if first_assignment:
                shift.assigned_employee_id = first_assignment.employee_id
                updated += 1
        db.commit()
        print(f"   + Updated {updated} shifts with legacy employee ID")

        # ------------------------------------------------------------------
        # 7. Create PayrollSummary records (3 months)
        # ------------------------------------------------------------------
        print("\n7. Creating payroll summaries...")

        payroll_periods = [
            (date(2025, 12, 1), date(2025, 12, 31), "December 2025"),
            (date(2026, 1, 1), date(2026, 1, 31), "January 2026"),
            (date(2026, 2, 1), date(2026, 2, 28), "February 2026"),
        ]

        payroll_count = 0
        for period_start, period_end, period_name in payroll_periods:
            print(f"\n   Processing {period_name}...")

            emp_count_this_period = 0
            for emp in employees:
                # Check if payroll already exists
                existing = db.query(PayrollSummary).filter(
                    PayrollSummary.employee_id == emp.employee_id,
                    PayrollSummary.period_start == period_start,
                    PayrollSummary.period_end == period_end,
                ).first()
                if existing:
                    continue

                # Calculate from assignments
                assignments = db.query(ShiftAssignment).join(Shift).filter(
                    ShiftAssignment.employee_id == emp.employee_id,
                    Shift.start_time >= datetime.combine(period_start, time(0, 0)),
                    Shift.start_time < datetime.combine(period_end + timedelta(days=1), time(0, 0)),
                    ShiftAssignment.status.in_(["confirmed", "completed"]),
                ).all()

                if not assignments:
                    continue

                total_hours = sum(a.regular_hours + a.overtime_hours for a in assignments)
                overtime_hours = sum(a.overtime_hours for a in assignments)
                gross_pay = sum(a.total_cost for a in assignments)

                # SA deductions
                monthly_gross = Decimal(str(gross_pay))

                # UIF: 1% of gross, capped at R177.12/month
                uif = min(monthly_gross * Decimal("0.01"), Decimal("177.12"))

                # PAYE estimate (2025/2026 tax brackets)
                annual_taxable = monthly_gross * 12
                if annual_taxable <= Decimal("237100"):
                    paye_annual = annual_taxable * Decimal("0.18")
                elif annual_taxable <= Decimal("370500"):
                    paye_annual = Decimal("42678") + (annual_taxable - Decimal("237100")) * Decimal("0.26")
                elif annual_taxable <= Decimal("512800"):
                    paye_annual = Decimal("77362") + (annual_taxable - Decimal("370500")) * Decimal("0.31")
                else:
                    paye_annual = Decimal("121475") + (annual_taxable - Decimal("512800")) * Decimal("0.36")
                # Primary rebate R17235
                paye_annual = max(Decimal("0"), paye_annual - Decimal("17235"))
                paye_monthly = paye_annual / 12

                # PSIRA levy: ~R22/month for active guards
                psira_levy = Decimal("22.00")

                total_deductions = float(uif + paye_monthly + psira_levy)
                net_pay = float(monthly_gross) - total_deductions

                # Dec & Jan payrolls are approved; Feb is draft (current month)
                if period_end < today:
                    payroll_status = "approved"
                    approved_at = datetime.combine(period_end + timedelta(days=5), time(10, 0))
                else:
                    payroll_status = "draft"
                    approved_at = None

                payroll_record = PayrollSummary(
                    org_id=org_id,
                    employee_id=emp.employee_id,
                    period_start=period_start,
                    period_end=period_end,
                    total_hours=total_hours,
                    overtime_hours=overtime_hours,
                    gross_pay=float(gross_pay),
                    expenses_total=total_deductions,
                    net_pay=max(0, net_pay),
                    status=payroll_status,
                    approved_at=approved_at,
                )
                db.add(payroll_record)
                payroll_count += 1
                emp_count_this_period += 1

            db.commit()
            print(f"   + {period_name}: {emp_count_this_period} employee payroll records")

        print(f"\n   Total payroll records created: {payroll_count}")

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        print("\n" + "=" * 60)
        print("HISTORICAL DATA SEEDING COMPLETE!")
        print("=" * 60)

        # Count totals
        total_shifts = db.query(Shift).filter(
            Shift.org_id == org_id,
            Shift.start_time >= datetime.combine(SEED_START, time(0, 0)),
            Shift.start_time < datetime.combine(SEED_END_EXCLUSIVE, time(0, 0)),
        ).count()

        total_assignments = db.query(ShiftAssignment).join(Shift).filter(
            Shift.org_id == org_id,
            Shift.start_time >= datetime.combine(SEED_START, time(0, 0)),
            Shift.start_time < datetime.combine(SEED_END_EXCLUSIVE, time(0, 0)),
        ).count()

        total_payrolls = db.query(PayrollSummary).filter(
            PayrollSummary.org_id == org_id,
            PayrollSummary.period_start >= SEED_START,
            PayrollSummary.period_end <= SEED_END,
        ).count()

        print(f"\n{'='*40}")
        print(f"  Organization: {org.company_name}")
        print(f"  Period: {SEED_START} to {SEED_END}")
        print(f"{'='*40}")
        print(f"  Shifts:            {total_shifts}")
        print(f"  Assignments:       {total_assignments}")
        print(f"  Payroll Records:   {total_payrolls}")
        print(f"  Employee Prefs:    {pref_count}")
        print(f"  Staffing Profiles: {profile_count} (new)")
        print(f"{'='*40}")

        if admin_user:
            print(f"\n  Login: {admin_user.username} at https://www.rostracore.com/login")

        return True

    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed historical data for Dec 2025, Jan 2026 & Feb 2026"
    )
    parser.add_argument(
        "--org-id", type=int, default=None,
        help="Organization ID to seed data for (auto-detects if not provided)"
    )
    args = parser.parse_args()

    if args.org_id is None:
        org_id, org_name = find_default_org_id()
        if org_id is None:
            print("[ERROR] No active organizations found! Please specify --org-id")
            sys.exit(1)
        print(f"Auto-detected organization: {org_name} (org_id={org_id})")
        args.org_id = org_id

    success = seed_historical_data(args.org_id)
    sys.exit(0 if success else 1)
