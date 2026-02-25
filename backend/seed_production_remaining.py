#!/usr/bin/env python3
"""Complete production seeding: remaining assignments + payroll.

Smaller batches (50) and flushed output to work with Railway timeouts.
"""

import sys
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

engine = create_engine(DB_URL, pool_pre_ping=True, pool_recycle=30,
                       connect_args={'connect_timeout': 30})

print("=" * 60, flush=True)
print("COMPLETING PRODUCTION SEED (Assignments + Payroll)", flush=True)
print("=" * 60, flush=True)

# ── Fetch base data ─────────────────────────────────────────
print("\n1. Fetching base data...", flush=True)
with engine.connect() as conn:
    employees = conn.execute(text(
        "SELECT employee_id, hourly_rate, preferred_site_ids "
        "FROM employees WHERE org_id = :oid AND status = 'ACTIVE' ORDER BY employee_id"
    ), {"oid": ORG_ID}).fetchall()
    print(f"   Employees: {len(employees)}", flush=True)

# ── Phase A: Remaining Assignments ──────────────────────────
print("\n2. Fetching unassigned shifts...", flush=True)
with engine.connect() as conn:
    # Get shifts that have NO assignments at all
    unassigned_shifts = conn.execute(text("""
        SELECT s.shift_id, s.site_id, s.start_time, s.end_time, s.required_staff
        FROM shifts s
        WHERE s.org_id = :oid
        AND s.start_time >= :start AND s.start_time < :end
        AND s.shift_id NOT IN (
            SELECT DISTINCT shift_id FROM shift_assignments
        )
        ORDER BY s.start_time
    """), {"oid": ORG_ID,
           "start": datetime.combine(SEED_START, time(0, 0)),
           "end": datetime.combine(date(2026, 3, 1), time(0, 0))}).fetchall()

    # Also get all existing assigned (shift_id, employee_id) pairs to track daily usage
    existing_pairs = conn.execute(text("""
        SELECT sa.shift_id, sa.employee_id, s.start_time::date
        FROM shift_assignments sa
        JOIN shifts s ON s.shift_id = sa.shift_id
        WHERE s.org_id = :oid AND s.start_time >= :start AND s.start_time < :end
    """), {"oid": ORG_ID,
           "start": datetime.combine(SEED_START, time(0, 0)),
           "end": datetime.combine(date(2026, 3, 1), time(0, 0))}).fetchall()

print(f"   Unassigned shifts: {len(unassigned_shifts)}", flush=True)
print(f"   Existing assignment pairs: {len(existing_pairs)}", flush=True)

# Build daily assignment tracker from existing data
emp_daily_assigned = {}
for row in existing_pairs:
    emp_daily_assigned[(row[1], row[2])] = True

groups = ['A', 'B', 'C', 'D']
emp_groups = {emp[0]: groups[i % 4] for i, emp in enumerate(employees)}

assignment_count = 0
batch = []
batch_updates = []

print(f"\n3. Creating assignments for {len(unassigned_shifts)} unassigned shifts...", flush=True)

for idx, shift in enumerate(unassigned_shifts):
    shift_id, site_id, start_time, end_time, required_staff = shift

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

    # Flush every 50 assignments
    if len(batch) >= 50:
        try:
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
            print(f"   + Batch: {len(batch)} assignments ({assignment_count} total, shift {idx+1}/{len(unassigned_shifts)})", flush=True)
        except Exception as e:
            print(f"   ! Error on batch: {e}", flush=True)
            print(f"   Retrying with individual inserts...", flush=True)
            saved = 0
            for b in batch:
                try:
                    with engine.begin() as conn:
                        conn.execute(text(
                            "INSERT INTO shift_assignments "
                            "(shift_id, employee_id, assigned_at, status, regular_hours, overtime_hours, "
                            "regular_pay, overtime_pay, night_premium, weekend_premium, sunday_premium, holiday_premium, "
                            "travel_reimbursement, total_cost, is_confirmed, confirmation_datetime, "
                            "checked_in, check_in_time, checked_out, check_out_time) "
                            "VALUES (:sid, :eid, :aat, :st, :rh, 0, :rp, 0, :np, 0, :sp, :hp, 0, :tc, "
                            "true, :cdt, :ci, :cit, :co, :cot)"
                        ), b)
                    saved += 1
                except Exception:
                    pass
            print(f"   Recovered {saved}/{len(batch)} from failed batch", flush=True)
        batch = []
        batch_updates = []

# Flush remaining
if batch:
    try:
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
        print(f"   + Final batch: {len(batch)} assignments ({assignment_count} total)", flush=True)
    except Exception as e:
        print(f"   ! Error on final batch: {e}", flush=True)

print(f"\n   New assignments created: {assignment_count}", flush=True)


# ── Phase B: Payroll ────────────────────────────────────────
print("\n4. Creating payroll summaries...", flush=True)

payroll_periods = [
    (date(2025, 12, 1), date(2025, 12, 31), "December 2025"),
    (date(2026, 1, 1), date(2026, 1, 31), "January 2026"),
    (date(2026, 2, 1), date(2026, 2, 28), "February 2026"),
]

with engine.connect() as conn:
    emp_list = conn.execute(text(
        "SELECT employee_id, hourly_rate FROM employees "
        "WHERE org_id = :oid AND status = 'ACTIVE'"
    ), {"oid": ORG_ID}).fetchall()

payroll_count = 0
for ps, pe, pname in payroll_periods:
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

    period_batch = []
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

        period_batch.append({
            "oid": ORG_ID, "eid": eid, "ps": ps, "pe": pe,
            "th": total_hours, "gp": gross_pay, "dt": deductions, "np": net,
            "st": status, "aa": approved_at,
        })

    if period_batch:
        # Insert payroll in small batches of 25
        for i in range(0, len(period_batch), 25):
            chunk = period_batch[i:i+25]
            try:
                with engine.begin() as conn:
                    for b in chunk:
                        conn.execute(text(
                            "INSERT INTO payroll_summary (org_id, employee_id, period_start, period_end, "
                            "total_hours, overtime_hours, gross_pay, expenses_total, net_pay, status, approved_at) "
                            "VALUES (:oid, :eid, :ps, :pe, :th, 0, :gp, :dt, :np, :st, :aa)"
                        ), b)
                payroll_count += len(chunk)
                print(f"   + {pname}: batch {i//25+1} ({len(chunk)} records, {payroll_count} total)", flush=True)
            except Exception as e:
                print(f"   ! Error in {pname} batch: {e}", flush=True)
    else:
        print(f"   ~ {pname}: no new records needed", flush=True)

print(f"\n   Total new payroll records: {payroll_count}", flush=True)


# ── Final Summary ───────────────────────────────────────────
print("\n5. Final counts...", flush=True)
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

    print(f"\n{'='*60}", flush=True)
    print("PRODUCTION SEEDING COMPLETE!", flush=True)
    print(f"{'='*60}", flush=True)
    print(f"  Shifts:      {shifts}", flush=True)
    print(f"  Assignments: {assignments}", flush=True)
    print(f"  Payroll:     {payrolls}", flush=True)
    print(f"{'='*60}", flush=True)
