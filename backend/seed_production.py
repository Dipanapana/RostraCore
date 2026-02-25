#!/usr/bin/env python3
"""Seed production Railway database with historical data (Dec 2025 - Feb 2026).

Uses raw SQL throughout to avoid SQLAlchemy enum casing issues
(production uses uppercase enum values).
Batched operations to avoid Railway connection timeouts.
"""

import logging
logging.getLogger('sqlalchemy').setLevel(logging.ERROR)

import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from sqlalchemy import create_engine, text

DB_URL = 'postgresql://postgres:ThXKAIVXyOEMdNhUhNhArKdrlwddBoYY@yamabiko.proxy.rlwy.net:41494/railway'
ORG_ID = 1

SEED_START = date(2025, 12, 1)
SEED_END = date(2026, 2, 28)
today = date.today()

sa_holidays = {
    date(2025, 12, 16), date(2025, 12, 25), date(2025, 12, 26),
    date(2026, 1, 1), date(2026, 3, 21),
}

engine = create_engine(DB_URL, pool_pre_ping=True, pool_recycle=60)

print("=" * 60)
print(f"SEEDING PRODUCTION DATA FOR ORG {ORG_ID}")
print(f"Period: Dec 2025 - Feb 2026")
print("=" * 60)


# ── Phase 1: Preferences + Profiles ────────────────────────
with engine.begin() as conn:
    employees = conn.execute(text(
        "SELECT employee_id, first_name, last_name, hourly_rate, psira_grade "
        "FROM employees WHERE org_id = :oid AND status = 'ACTIVE' ORDER BY employee_id"
    ), {"oid": ORG_ID}).fetchall()

    sites = conn.execute(text(
        "SELECT site_id, site_name, min_staff, required_skill "
        "FROM sites WHERE org_id = :oid ORDER BY site_id"
    ), {"oid": ORG_ID}).fetchall()

    print(f"\nEmployees: {len(employees)}, Sites: {len(sites)}")

    # Set employee preferred_site_ids
    print("\n2. Setting employee site preferences...")
    site_ids = [s[0] for s in sites]
    for emp in employees:
        prefs = random.sample(site_ids, min(2, len(site_ids)))
        conn.execute(text(
            "UPDATE employees SET preferred_site_ids = :prefs WHERE employee_id = :eid"
        ), {"prefs": prefs, "eid": emp[0]})
    print(f"   + Set preferences for {len(employees)} employees")

    # Create staffing profiles
    print("\n3. Creating site staffing profiles...")
    existing_profiles = conn.execute(text(
        "SELECT count(*) FROM site_staffing_profiles WHERE org_id = :oid"
    ), {"oid": ORG_ID}).scalar()

    if existing_profiles == 0:
        for site in sites:
            sid, _, min_staff, _ = site
            min_staff = min_staff or 1
            day_staff = max(min_staff, 2)
            night_staff = max(1, min_staff - 1)
            for pname, period, daytype, staff in [
                ("Weekday Day", "DAY", "WEEKDAY", day_staff),
                ("Weekday Night", "NIGHT", "WEEKDAY", night_staff),
                ("Weekend Day", "DAY", "WEEKEND", max(1, day_staff - 1)),
                ("Weekend Night", "NIGHT", "WEEKEND", night_staff),
            ]:
                conn.execute(text(
                    "INSERT INTO site_staffing_profiles "
                    "(org_id, site_id, profile_name, period_type, day_type, "
                    "required_staff, required_psira_grade, requires_firearm, priority, is_active) "
                    "VALUES (:oid, :sid, :pn, :pt, :dt, :rs, 'ANY', false, 10, true)"
                ), {"oid": ORG_ID, "sid": sid, "pn": pname, "pt": period, "dt": daytype, "rs": staff})
        print(f"   + Created {len(sites) * 4} profiles")
    else:
        print(f"   ~ {existing_profiles} profiles already exist")


# ── Phase 2: Shifts (batch per week) ───────────────────────
print("\n4. Generating shifts...")

# First, fetch ALL existing shifts in one query
with engine.connect() as conn:
    existing_shifts_rows = conn.execute(text(
        "SELECT site_id, start_time, end_time FROM shifts WHERE org_id = :oid "
        "AND start_time >= :s AND start_time < :e"
    ), {"oid": ORG_ID,
        "s": datetime.combine(SEED_START, time(0, 0)),
        "e": datetime.combine(date(2026, 3, 1), time(0, 0))}).fetchall()

existing_shifts = set()
for r in existing_shifts_rows:
    existing_shifts.add((r[0], r[1], r[2]))
print(f"   Existing shifts in range: {len(existing_shifts)}")

# Re-fetch sites for use outside transaction
with engine.connect() as conn:
    sites = conn.execute(text(
        "SELECT site_id, site_name, min_staff FROM sites WHERE org_id = :oid ORDER BY site_id"
    ), {"oid": ORG_ID}).fetchall()

# Build all new shifts in memory, then batch insert per week
total_shift_count = 0
current = SEED_START
week_shifts = []

while current <= SEED_END:
    for site in sites:
        sid = site[0]
        min_staff = site[2] or 1
        day_staff = max(min_staff, 2)
        night_staff = max(1, min_staff - 1)
        is_weekend = current.weekday() >= 5
        past = current < today

        # Day shift
        ds = datetime.combine(current, time(6, 0))
        de = datetime.combine(current, time(18, 0))
        if (sid, ds, de) not in existing_shifts:
            req = max(1, day_staff - 1) if is_weekend else day_staff
            status = 'COMPLETED' if past else ('CONFIRMED' if current <= today + timedelta(days=14) else 'PLANNED')
            week_shifts.append({
                "oid": ORG_ID, "sid": sid, "st": ds, "et": de,
                "req": req, "status": status})

        # Night shift
        ns = datetime.combine(current, time(18, 0))
        ne = datetime.combine(current + timedelta(days=1), time(6, 0))
        if (sid, ns, ne) not in existing_shifts:
            status = 'COMPLETED' if past else ('CONFIRMED' if current <= today + timedelta(days=14) else 'PLANNED')
            week_shifts.append({
                "oid": ORG_ID, "sid": sid, "st": ns, "et": ne,
                "req": night_staff, "status": status})

    # Commit every 2 days to keep transactions short for Railway
    if len(week_shifts) >= 140 or current == SEED_END:
        if week_shifts:
            with engine.begin() as conn:
                for s in week_shifts:
                    conn.execute(text(
                        "INSERT INTO shifts (org_id, site_id, start_time, end_time, required_staff, "
                        "status, includes_meal_break, meal_break_duration_minutes, requires_firearm) "
                        "VALUES (:oid, :sid, :st, :et, :req, :status, true, 60, false)"
                    ), s)
            total_shift_count += len(week_shifts)
            print(f"   + Batch ending {current}: {len(week_shifts)} shifts ({total_shift_count} total)")
            week_shifts = []

    current += timedelta(days=1)

print(f"   Total new shifts: {total_shift_count}")


# ── Phase 3: Assignments (batch per site) ───────────────────
print("\n5. Creating shift assignments...")

with engine.connect() as conn:
    all_shifts = conn.execute(text(
        "SELECT shift_id, site_id, start_time, end_time, required_staff "
        "FROM shifts WHERE org_id = :oid "
        "AND start_time >= :s AND start_time < :e ORDER BY start_time"
    ), {"oid": ORG_ID,
        "s": datetime.combine(SEED_START, time(0, 0)),
        "e": datetime.combine(date(2026, 3, 1), time(0, 0))}).fetchall()

    employees = conn.execute(text(
        "SELECT employee_id, hourly_rate, preferred_site_ids "
        "FROM employees WHERE org_id = :oid AND status = 'ACTIVE' ORDER BY employee_id"
    ), {"oid": ORG_ID}).fetchall()

    # Check which shifts already have assignments
    assigned_shifts = set()
    rows = conn.execute(text(
        "SELECT DISTINCT sa.shift_id FROM shift_assignments sa "
        "JOIN shifts s ON s.shift_id = sa.shift_id "
        "WHERE s.org_id = :oid AND s.start_time >= :s AND s.start_time < :e"
    ), {"oid": ORG_ID,
        "s": datetime.combine(SEED_START, time(0, 0)),
        "e": datetime.combine(date(2026, 3, 1), time(0, 0))}).fetchall()
    for r in rows:
        assigned_shifts.add(r[0])

print(f"   Shifts: {len(all_shifts)}, already assigned: {len(assigned_shifts)}")

groups = ['A', 'B', 'C', 'D']
emp_groups = {emp[0]: groups[i % 4] for i, emp in enumerate(employees)}

# Track employee daily assignments in memory to avoid per-query checks
emp_daily_assigned = {}  # (eid, date) -> True

assignment_count = 0
batch = []
batch_updates = []  # legacy assigned_employee_id updates

for shift in all_shifts:
    shift_id, site_id, start_time, end_time, required_staff = shift

    if shift_id in assigned_shifts:
        continue

    shift_date = start_time.date()
    day_offset = (shift_date - SEED_START).days
    is_night = start_time.hour >= 18
    is_past = shift_date < today

    # Prefer employees with site affinity
    site_emps = [e for e in employees if e[2] and site_id in e[2]]
    other_emps = [e for e in employees if not e[2] or site_id not in e[2]]
    candidate_emps = site_emps + other_emps

    assigned = 0
    first_eid = None

    for emp in candidate_emps:
        if assigned >= (required_staff or 1):
            break

        eid = emp[0]

        # Check memory-based daily assignment tracker
        if (eid, shift_date) in emp_daily_assigned:
            continue

        grp_idx = groups.index(emp_groups.get(eid, 'A'))
        emp_offset = (day_offset + grp_idx * 4) % 16

        if not is_night and 0 <= emp_offset <= 3:
            on_duty = True
        elif is_night and 8 <= emp_offset <= 11:
            on_duty = True
        else:
            on_duty = False

        if not on_duty:
            continue

        hourly = float(emp[1] or 46.0)
        duration = (end_time - start_time).total_seconds() / 3600
        regular_pay = hourly * duration
        night_prem = regular_pay * 0.10 if is_night else 0.0
        sunday_prem = regular_pay * 0.50 if shift_date.weekday() == 6 else 0.0
        holiday_prem = regular_pay * 1.00 if shift_date in sa_holidays else 0.0
        total = regular_pay + night_prem + sunday_prem + holiday_prem

        if is_past:
            a_status = "completed"
            ci_time = start_time + timedelta(minutes=random.randint(-5, 10))
            co_time = end_time + timedelta(minutes=random.randint(-5, 10))
        else:
            a_status = "confirmed"
            ci_time = None
            co_time = None

        batch.append({
            "sid": shift_id, "eid": eid,
            "aat": datetime.combine(shift_date - timedelta(days=7), time(9, 0)),
            "st": a_status, "rh": duration, "rp": regular_pay,
            "np": night_prem, "sp": sunday_prem, "hp": holiday_prem, "tc": total,
            "cdt": datetime.combine(shift_date - timedelta(days=5), time(14, 0)),
            "ci": is_past, "cit": ci_time, "co": is_past, "cot": co_time,
        })
        emp_daily_assigned[(eid, shift_date)] = True
        assigned += 1
        assignment_count += 1

        if first_eid is None:
            first_eid = eid

    if first_eid:
        batch_updates.append({"eid": first_eid, "sid": shift_id})

    # Flush batch every 75 assignments to avoid Railway timeout
    if len(batch) >= 75:
        with engine.begin() as conn:
            for b in batch:
                conn.execute(text(
                    "INSERT INTO shift_assignments "
                    "(shift_id, employee_id, assigned_at, status, regular_hours, overtime_hours, "
                    "regular_pay, overtime_pay, night_premium, weekend_premium, sunday_premium, holiday_premium, "
                    "travel_reimbursement, total_cost, is_confirmed, confirmation_datetime, "
                    "checked_in, check_in_time, checked_out, check_out_time) "
                    "VALUES (:sid, :eid, :aat, :st, :rh, 0, :rp, 0, :np, 0, :sp, :hp, 0, :tc, "
                    "true, :cdt, :ci, :cit, :co, :cot)"
                ), b)
            for u in batch_updates:
                conn.execute(text(
                    "UPDATE shifts SET assigned_employee_id = :eid WHERE shift_id = :sid"
                ), u)
        print(f"   + Flushed {len(batch)} assignments ({assignment_count} total)")
        batch = []
        batch_updates = []

# Flush remaining
if batch:
    with engine.begin() as conn:
        for b in batch:
            conn.execute(text(
                "INSERT INTO shift_assignments "
                "(shift_id, employee_id, assigned_at, status, regular_hours, overtime_hours, "
                "regular_pay, overtime_pay, night_premium, weekend_premium, sunday_premium, holiday_premium, "
                "travel_reimbursement, total_cost, is_confirmed, confirmation_datetime, "
                "checked_in, check_in_time, checked_out, check_out_time) "
                "VALUES (:sid, :eid, :aat, :st, :rh, 0, :rp, 0, :np, 0, :sp, :hp, 0, :tc, "
                "true, :cdt, :ci, :cit, :co, :cot)"
            ), b)
        for u in batch_updates:
            conn.execute(text(
                "UPDATE shifts SET assigned_employee_id = :eid WHERE shift_id = :sid"
            ), u)
    print(f"   + Flushed final {len(batch)} assignments")

print(f"   Total assignments: {assignment_count}")


# ── Phase 4: Payroll ────────────────────────────────────────
print("\n6. Creating payroll summaries...")

payroll_periods = [
    (date(2025, 12, 1), date(2025, 12, 31), "December 2025"),
    (date(2026, 1, 1), date(2026, 1, 31), "January 2026"),
    (date(2026, 2, 1), date(2026, 2, 28), "February 2026"),
]

# Fetch employee assignment totals in bulk per period
with engine.connect() as conn:
    emp_list = conn.execute(text(
        "SELECT employee_id, hourly_rate FROM employees "
        "WHERE org_id = :oid AND status = 'ACTIVE'"
    ), {"oid": ORG_ID}).fetchall()

payroll_count = 0
for ps, pe, pname in payroll_periods:
    # Fetch all assignment totals for this period in one query
    with engine.connect() as conn:
        existing_payroll = set()
        for r in conn.execute(text(
            "SELECT employee_id FROM payroll_summary "
            "WHERE org_id = :oid AND period_start = :ps AND period_end = :pe"
        ), {"oid": ORG_ID, "ps": ps, "pe": pe}).fetchall():
            existing_payroll.add(r[0])

        totals_rows = conn.execute(text("""
            SELECT sa.employee_id, SUM(sa.regular_hours), SUM(sa.total_cost)
            FROM shift_assignments sa JOIN shifts s ON s.shift_id = sa.shift_id
            WHERE s.org_id = :oid AND s.start_time >= :start AND s.start_time < :end
            GROUP BY sa.employee_id
        """), {"oid": ORG_ID,
               "start": datetime.combine(ps, time(0, 0)),
               "end": datetime.combine(pe + timedelta(days=1), time(0, 0))}).fetchall()

    emp_totals = {r[0]: (float(r[1]), float(r[2])) for r in totals_rows}

    batch = []
    for emp in emp_list:
        eid = emp[0]
        if eid in existing_payroll:
            continue
        if eid not in emp_totals:
            continue

        total_hours, gross_pay = emp_totals[eid]
        if total_hours == 0:
            continue

        mg = Decimal(str(gross_pay))
        uif = min(mg * Decimal("0.01"), Decimal("177.12"))
        annual = mg * 12
        if annual <= 237100:
            paye_a = annual * Decimal("0.18")
        elif annual <= 370500:
            paye_a = Decimal("42678") + (annual - 237100) * Decimal("0.26")
        elif annual <= 512800:
            paye_a = Decimal("77362") + (annual - 370500) * Decimal("0.31")
        else:
            paye_a = Decimal("121475") + (annual - 512800) * Decimal("0.36")
        paye_a = max(Decimal("0"), paye_a - Decimal("17235"))
        paye_m = paye_a / 12
        psira = Decimal("22.00")
        deductions = float(uif + paye_m + psira)
        net = max(0, gross_pay - deductions)

        status = "approved" if pe < today else "draft"
        approved_at = (datetime.combine(pe + timedelta(days=5), time(10, 0))
                       if status == "approved" else None)

        batch.append({
            "oid": ORG_ID, "eid": eid, "ps": ps, "pe": pe,
            "th": total_hours, "gp": gross_pay, "dt": deductions, "np": net,
            "st": status, "aa": approved_at,
        })

    if batch:
        with engine.begin() as conn:
            for b in batch:
                conn.execute(text(
                    "INSERT INTO payroll_summary (org_id, employee_id, period_start, period_end, "
                    "total_hours, overtime_hours, gross_pay, expenses_total, net_pay, status, approved_at) "
                    "VALUES (:oid, :eid, :ps, :pe, :th, 0, :gp, :dt, :np, :st, :aa)"
                ), b)
        payroll_count += len(batch)
    print(f"   + {pname}: {len(batch)} records")

print(f"   Total payroll records: {payroll_count}")


# ── Final Summary ───────────────────────────────────────────
with engine.connect() as conn:
    shifts = conn.execute(text(
        "SELECT count(*) FROM shifts WHERE org_id=:oid "
        "AND start_time >= '2025-12-01' AND start_time < '2026-03-01'"
    ), {"oid": ORG_ID}).scalar()
    assignments = conn.execute(text(
        "SELECT count(*) FROM shift_assignments sa "
        "JOIN shifts s ON s.shift_id=sa.shift_id "
        "WHERE s.org_id=:oid AND s.start_time >= '2025-12-01' AND s.start_time < '2026-03-01'"
    ), {"oid": ORG_ID}).scalar()
    payrolls = conn.execute(text(
        "SELECT count(*) FROM payroll_summary WHERE org_id=:oid AND period_start >= '2025-12-01'"
    ), {"oid": ORG_ID}).scalar()

    print(f"\n{'='*60}")
    print("PRODUCTION SEEDING COMPLETE!")
    print(f"{'='*60}")
    print(f"  Org: blaq Cooperation (org_id={ORG_ID})")
    print(f"  User: Sizwe (stkhumalo1@gmail.com)")
    print(f"  Shifts:      {shifts}")
    print(f"  Assignments: {assignments}")
    print(f"  Payroll:     {payrolls}")
    print(f"{'='*60}")
    print(f"\n  Login: https://www.rostracore.com/login")
