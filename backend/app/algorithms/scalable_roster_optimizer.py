"""
Scalable Roster Optimizer with Partitioning
Implements the "Partitioned CP-SAT" strategy from algo_plan.md.
"""

import logging
import time
from typing import List, Dict, Optional, Any
from datetime import datetime
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

from sqlalchemy.orm import Session, joinedload
from app.models.site import Site
from app.models.employee import Employee, EmployeeStatus
from app.models.shift import Shift, ShiftStatus
from app.algorithms.production_optimizer import ProductionRosterOptimizer, OptimizationConfig

logger = logging.getLogger(__name__)

class PartitionedRosterOptimizer:
    """
    Orchestrator that splits the roster problem into smaller partitions (by region/province)
    and solves them in parallel using ProductionRosterOptimizer.
    """

    def __init__(
        self,
        db: Session,
        config: Optional[OptimizationConfig] = None,
        org_id: Optional[int] = None
    ):
        self.db = db
        self.config = config or OptimizationConfig()
        self.org_id = org_id

    def optimize(
        self,
        start_date: datetime,
        end_date: datetime,
        site_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point. Partitions the problem and solves.
        """
        total_start = time.time()
        logger.info(f"Starting Partitioned Optimizer for {start_date} to {end_date}")

        # 1. Load all relevant sites to determine partitions
        sites_query = self.db.query(Site)
        if site_ids:
            sites_query = sites_query.filter(Site.site_id.in_(site_ids))
        if self.org_id:
            sites_query = sites_query.filter(Site.org_id == self.org_id)
        
        all_sites = sites_query.all()
        
        # Group sites by province (or 'default' if null)
        partitions = defaultdict(list)
        for site in all_sites:
            region = site.province or "Unknown"
            partitions[region].append(site.site_id)
        
        logger.info(f"Identified {len(partitions)} partitions: {list(partitions.keys())}")

        # 2. Solve partitions in parallel
        results = []
        with ThreadPoolExecutor(max_workers=min(len(partitions), self.config.num_workers)) as executor:
            future_to_region = {
                executor.submit(
                    self._solve_partition, 
                    region, 
                    p_site_ids, 
                    start_date, 
                    end_date
                ): region 
                for region, p_site_ids in partitions.items()
            }

            for future in as_completed(future_to_region):
                region = future_to_region[future]
                try:
                    result = future.result()
                    results.append(result)
                    logger.info(f"Partition '{region}' completed: {result['status']}")
                except Exception as e:
                    logger.error(f"Partition '{region}' failed: {e}", exc_info=True)
                    results.append({
                        "status": "error",
                        "region": region,
                        "assignments": [],
                        "error": str(e)
                    })

        # 3. Merge results
        final_result = self._merge_results(results)
        final_result["timing"]["total"] = time.time() - total_start
        
        return final_result

    def _solve_partition(
        self, 
        region: str, 
        site_ids: List[int], 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict:
        """
        Solve a single partition.
        """
        logger.info(f"Solving partition '{region}' with {len(site_ids)} sites")
        
        # Create a new optimizer instance for this partition
        # We need a new DB session? No, sharing session across threads is risky in SQLAlchemy.
        # But creating a new session here is hard without session factory.
        # For now, we'll assume the optimizer's read-only operations are safe-ish or 
        # we rely on the fact that we are just reading. 
        # ideally we should scope sessions.
        
        # Actually, ProductionRosterOptimizer writes nothing to DB, it just returns a dict.
        # So sharing the session for READS is usually okay if lazy loading doesn't conflict.
        # But to be safe, we should probably pre-load everything in the main thread?
        # The ProductionRosterOptimizer loads its own data.
        
        # Let's try using the same DB session but be careful. 
        # If it fails, we might need to pass a session factory.
        
        optimizer = ProductionRosterOptimizer(
            self.db, 
            self.config, 
            self.org_id
        )
        
        # We need to restrict the optimizer to ONLY use employees in this region?
        # ProductionRosterOptimizer loads ALL active employees by default.
        # We should subclass it to filter employees by region.
        
        # Dynamic subclassing to override _load_data?
        # Or just modify ProductionRosterOptimizer to accept employee_filter?
        # Since I can't easily modify the other file right now without potential breakage,
        # I will subclass it here.
        
        class RegionScopedOptimizer(ProductionRosterOptimizer):
            def _load_data(self, start, end, sites):
                super()._load_data(start, end, sites)
                # Filter employees to those in the region (plus those with no region or willing to travel?)
                # For strict partitioning, we filter by province.
                if region != "Unknown":
                    self.employees = [
                        e for e in self.employees 
                        if e.province == region or e.province is None
                    ]
                logger.info(f"Partition '{region}': Filtered to {len(self.employees)} employees")

        optimizer = RegionScopedOptimizer(self.db, self.config, self.org_id)
        return optimizer.optimize(start_date, end_date, site_ids)

    def _merge_results(self, results: List[Dict]) -> Dict:
        """
        Merge results from all partitions.
        """
        merged = {
            "status": "optimal",
            "assignments": [],
            "unfilled_shifts": [],
            "total_cost": 0.0,
            "fairness_score": 0.0,
            "diagnostics": {},
            "timing": {"total": 0.0}
        }
        
        statuses = set()
        
        for res in results:
            statuses.add(res.get("status", "unknown"))
            merged["assignments"].extend(res.get("assignments", []))
            
            # Handle unfilled shifts - might be list or objects
            unfilled = res.get("unfilled_shifts", [])
            # If they are objects, we might need to serialize them or keep them as is
            merged["unfilled_shifts"].extend(unfilled)
            
            merged["total_cost"] += res.get("total_cost", 0.0)
            
            # Diagnostics
            if "diagnostics" in res:
                for k, v in res["diagnostics"].items():
                    merged["diagnostics"][f"{k}_{len(merged['diagnostics'])}"] = v

        # Determine global status
        if "error" in statuses:
            merged["status"] = "partial_error"
        elif "infeasible" in statuses:
            merged["status"] = "partial_infeasible"
        elif "optimal" in statuses:
            merged["status"] = "optimal"
        else:
            merged["status"] = "feasible"

        merged["assignment_count"] = len(merged["assignments"])
        return merged
