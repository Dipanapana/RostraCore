"""Deep diagnostic tool for roster optimizer"""

from app.database import SessionLocal
from app.models.shift import Shift, ShiftStatus
from app.models.employee import Employee
from app.models.site import Site
from app.algorithms.production_optimizer import ProductionRosterOptimizer, OptimizationConfig
from app.config import settings
from datetime import datetime
from collections import defaultdict

print("="*80)
print("ROSTRACORE DEEP DIAGNOSTIC")
print("="*80)

db = SessionLocal()

# Get data
shifts = db.query(Shift).filter(
    Shift.start_time >= datetime(2025, 11, 5),
    Shift.start_time < datetime(2025, 11, 13),
    Shift.assigned_employee_id == None,
    Shift.status != ShiftStatus.CANCELLED
).all()

employees = db.query(Employee).filter(Employee.status == 'ACTIVE').all()
sites = db.query(Site).all()

print(f"\n1. DATA SUMMARY")
print(f"   Unassigned shifts: {len(shifts)}")
print(f"   Active employees: {len(employees)}")
print(f"   Sites: {len(sites)}")

# Check configuration
print(f"\n2. CURRENT CONFIGURATION")
print(f"   MAX_HOURS_WEEK: {settings.MAX_HOURS_WEEK}")
print(f"   MIN_REST_HOURS: {settings.MIN_REST_HOURS}")
print(f"   MAX_DISTANCE_KM: {settings.MAX_DISTANCE_KM}")
print(f"   FAIRNESS_WEIGHT: {settings.FAIRNESS_WEIGHT}")
print(f"   SKIP_CERTIFICATION_CHECK: {settings.SKIP_CERTIFICATION_CHECK}")
print(f"   SKIP_SKILL_MATCHING: {settings.SKIP_SKILL_MATCHING}")
print(f"   SKIP_AVAILABILITY_CHECK: {settings.SKIP_AVAILABILITY_CHECK}")

if shifts and employees:
    # Create optimizer
    optimizer = ProductionRosterOptimizer(
        db,
        config=OptimizationConfig(
            time_limit_seconds=10,
            fairness_weight=settings.FAIRNESS_WEIGHT,
            max_distance_km=settings.MAX_DISTANCE_KM
        )
    )

    # Load data
    optimizer.shifts = shifts
    optimizer.employees = employees

    # Build feasibility matrix
    print(f"\n3. BUILDING FEASIBILITY MATRIX...")
    optimizer._build_feasibility_matrix()

    # Analyze feasibility
    feasible_count = sum(1 for check in optimizer.feasibility_matrix.values() if check.is_feasible)
    total_count = len(optimizer.feasibility_matrix)

    print(f"\n4. FEASIBILITY ANALYSIS")
    print(f"   Total employee-shift pairs: {total_count}")
    print(f"   Feasible assignments: {feasible_count}")
    print(f"   Infeasible: {total_count - feasible_count}")
    print(f"   Feasibility rate: {feasible_count/total_count*100:.1f}%")

    # Get top reasons for infeasibility
    reason_counts = defaultdict(int)

    for check in optimizer.feasibility_matrix.values():
        if not check.is_feasible:
            for reason in check.reasons:
                reason_counts[reason] += 1

    print(f"\n5. TOP INFEASIBILITY REASONS:")
    for reason, count in sorted(reason_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {count:5d} ({count/total_count*100:5.1f}%) - {reason}")

    if feasible_count == 0:
        print(f"\n6. CRITICAL: NO FEASIBLE ASSIGNMENTS!")
        print(f"   This means the CP-SAT solver has no valid variables to work with.")
        print(f"   The optimizer will return 0 assignments regardless of solver status.")

        # Check some specific pairs
        print(f"\n7. SAMPLE INFEASIBLE PAIRS (first 5):")
        count = 0
        for key, check in optimizer.feasibility_matrix.items():
            if not check.is_feasible and count < 5:
                emp_id, shift_id = key
                emp = next(e for e in employees if e.employee_id == emp_id)
                shift = next(s for s in shifts if s.shift_id == shift_id)
                print(f"\n   Employee {emp.employee_id} ({emp.first_name} {emp.last_name}, {emp.role.value})")
                print(f"   Shift {shift.shift_id} (Site {shift.site_id}, {shift.start_time.time()}-{shift.end_time.time()})")
                print(f"   Required skill: {shift.required_skill}")
                print(f"   Reasons: {', '.join(check.reasons)}")
                count += 1
    else:
        print(f"\n6. RUNNING OPTIMIZER WITH {feasible_count} FEASIBLE ASSIGNMENTS...")

        # Run optimizer
        try:
            result = optimizer.optimize(
                start_date=datetime(2025, 11, 5),
                end_date=datetime(2025, 11, 13)
            )

            print(f"\n7. OPTIMIZER RESULT:")
            print(f"   Status: {result.get('status', 'unknown')}")
            print(f"   Assignments: {len(result.get('assignments', []))}")
            print(f"   Unfilled: {len(result.get('unfilled_shifts', []))}")

            if 'solver_info' in result:
                print(f"\n8. SOLVER INFO:")
                for key, value in result['solver_info'].items():
                    print(f"   {key}: {value}")

            if 'diagnostics' in result:
                print(f"\n9. DIAGNOSTICS:")
                for key, value in result['diagnostics'].items():
                    print(f"   {key}: {value}")

        except Exception as e:
            print(f"\n7. OPTIMIZER ERROR: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

print(f"\n" + "="*80)
print("DIAGNOSTIC COMPLETE")
print("="*80)
