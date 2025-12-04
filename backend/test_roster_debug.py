"""
Quick test script to diagnose roster generation issue
"""
import sys
sys.path.insert(0, 'c:\\Users\\USER\\Documents\\Master Plan\\RostraCore\\backend')

from datetime import datetime, date
from app.database import SessionLocal
from app.algorithms.production_optimizer import ProductionRosterOptimizer, OptimizationConfig

def test_roster_generation():
    db = SessionLocal()
    try:
        print("Testing roster generation...")
        print(f"Start date: 2025-11-20")
        print(f"End date: 2025-11-25")
        
        start_date = datetime(2025, 11, 20)
        end_date = datetime(2025, 11, 25, 23, 59, 59)
        
        optimizer = ProductionRosterOptimizer(
            db,
            config=OptimizationConfig(
                time_limit_seconds=120,
                fairness_weight=0.2
            )
        )
        
        print("Calling optimizer.optimize()...")
        result = optimizer.optimize(
            start_date=start_date,
            end_date=end_date,
            site_ids=None
        )
        
        print(f"\nResult status: {result.get('status')}")
        print(f"Assignments: {len(result.get('assignments', []))}")
        print(f"Summary: {result.get('summary')}")
        
    except Exception as e:
        print(f"\nERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_roster_generation()
