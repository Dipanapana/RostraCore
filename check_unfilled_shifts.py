"""Check what unfilled_shifts structure looks like"""
import sys
sys.path.insert(0, 'backend')

from app.database import SessionLocal
from app.algorithms.production_optimizer import ProductionRosterOptimizer, OptimizationConfig
from datetime import datetime, timedelta

db = SessionLocal()

try:
    optimizer = ProductionRosterOptimizer(
        db,
        config=OptimizationConfig(time_limit_seconds=30, fairness_weight=0.2),
        org_id=13
    )

    result = optimizer.optimize(
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=7),
        site_ids=None
    )

    print(f"Number of unfilled_shifts: {len(result.get('unfilled_shifts', []))}")

    if result.get('unfilled_shifts'):
        first = result['unfilled_shifts'][0]
        print(f"\nFirst unfilled shift type: {type(first)}")
        print(f"First unfilled shift: {first}")

        if hasattr(first, '__dict__'):
            print(f"\nAttributes: {first.__dict__}")
    else:
        print("No unfilled shifts!")

finally:
    db.close()
