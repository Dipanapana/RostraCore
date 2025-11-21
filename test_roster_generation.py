"""Test roster generation to see actual error"""
import sys
import os
sys.path.insert(0, 'backend')

from datetime import datetime, timedelta
from app.database import SessionLocal
from app.algorithms.production_optimizer import ProductionRosterOptimizer, OptimizationConfig

db = SessionLocal()

try:
    print("Testing roster generation...")

    optimizer = ProductionRosterOptimizer(
        db,
        config=OptimizationConfig(
            time_limit_seconds=30,
            fairness_weight=0.2
        ),
        org_id=13  # TEST001 organization
    )

    start_date = datetime.now()
    end_date = start_date + timedelta(days=7)

    print(f"Generating roster from {start_date.date()} to {end_date.date()}")

    result = optimizer.optimize(
        start_date=start_date,
        end_date=end_date,
        site_ids=None
    )

    print("\n=== RESULT ===")
    print(f"Status: {result.get('status')}")
    print(f"Assignments: {len(result.get('assignments', []))}")
    print(f"Unfilled shifts: {len(result.get('unfilled_shifts', []))}")

    if result.get('error'):
        print(f"ERROR: {result.get('error')}")

    if result.get('summary'):
        print("\nSummary:")
        for k, v in result['summary'].items():
            print(f"  {k}: {v}")

    print("\n=== SUCCESS ===")

except Exception as e:
    print(f"\n=== EXCEPTION ===")
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
