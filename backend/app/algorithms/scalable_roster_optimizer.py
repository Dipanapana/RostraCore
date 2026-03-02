"""
Scalable Roster Optimizer with Partitioning (Google OR-Tools CP-SAT)

Splits the problem by province and solves partitions in parallel.
Scales to 1000+ employees with automatic time-limit tuning.
"""

import logging
import math
import time
from typing import List, Dict, Optional, Any, Callable
from datetime import datetime
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.models.site import Site
from app.models.employee import Employee, EmployeeStatus
from app.models.shift import Shift, ShiftStatus
from app.algorithms.production_optimizer import ProductionRosterOptimizer, OptimizationConfig

logger = logging.getLogger(__name__)

class PartitionedRosterOptimizer:
    """
    Orchestrator that splits the roster problem into smaller partitions (by region/province)
    and solves them in parallel using ProductionRosterOptimizer.

    Thread safety: Each partition thread gets its own SQLAlchemy Session via session_factory.
    The main thread uses `db` for partition discovery queries.
    """

    def __init__(
        self,
        db: Session,
        config: Optional[OptimizationConfig] = None,
        org_id: Optional[int] = None,
        session_factory: Optional[Callable[[], Session]] = None
    ):
        self.db = db  # Main-thread session for partition discovery
        self.config = config or OptimizationConfig()
        self.org_id = org_id
        self.session_factory = session_factory  # Factory for per-thread sessions

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

        # Count total active employees for dynamic tuning
        emp_count_query = self.db.query(func.count(Employee.employee_id)).filter(
            Employee.status == EmployeeStatus.ACTIVE
        )
        if self.org_id:
            emp_count_query = emp_count_query.filter(Employee.org_id == self.org_id)
        total_employees = emp_count_query.scalar() or 0

        # Count total shifts in range
        shift_count_query = self.db.query(func.count(Shift.shift_id)).filter(
            Shift.start_time >= start_date,
            Shift.start_time < end_date,
            Shift.status != ShiftStatus.CANCELLED,
        )
        if self.org_id:
            shift_count_query = shift_count_query.filter(Shift.org_id == self.org_id)
        if site_ids:
            shift_count_query = shift_count_query.filter(Shift.site_id.in_(site_ids))
        total_shifts = shift_count_query.scalar() or 0

        logger.info(f"Scale: {total_employees} employees, {total_shifts} shifts, {len(all_sites)} sites")

        # Group sites by province (or 'default' if null)
        partitions = defaultdict(list)
        for site in all_sites:
            region = site.province or "Unknown"
            partitions[region].append(site.site_id)

        num_partitions = max(len(partitions), 1)
        logger.info(f"Identified {num_partitions} partitions: {list(partitions.keys())}")

        # Dynamic time limit: scale with problem size
        # Base: 120s for <=200 employees, +60s per additional 200 employees, cap at 600s
        base_time = self.config.time_limit_seconds
        if total_employees > 200:
            extra = math.ceil((total_employees - 200) / 200) * 60
            per_partition_time = min(base_time + extra, 600)
        else:
            per_partition_time = base_time

        # Each partition gets its own config with scaled time limit
        self._partition_config = OptimizationConfig(
            time_limit_seconds=per_partition_time,
            num_workers=self.config.num_workers,
            fairness_weight=self.config.fairness_weight,
            cost_weight=self.config.cost_weight,
            night_premium_per_hour=self.config.night_premium_per_hour,
            weekend_premium_per_hour=self.config.weekend_premium_per_hour,
            night_shift_start_hour=self.config.night_shift_start_hour,
            night_shift_end_hour=self.config.night_shift_end_hour,
            budget_limit=self.config.budget_limit,
            budget_per_client=self.config.budget_per_client,
            budget_per_site=self.config.budget_per_site,
        )

        logger.info(f"Per-partition time limit: {per_partition_time}s (employees={total_employees})")

        # 2. Solve partitions in parallel (cap at 4 parallel partitions to avoid memory pressure)
        max_parallel = min(num_partitions, 4)
        results = []
        with ThreadPoolExecutor(max_workers=max_parallel) as executor:
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
        final_result["scale"] = {
            "total_employees": total_employees,
            "total_shifts": total_shifts,
            "partitions": num_partitions,
            "per_partition_time_limit": per_partition_time,
        }
        final_result["algorithm_used"] = "cpsat_partitioned"

        return final_result

    def _solve_partition(
        self,
        region: str,
        site_ids: List[int],
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Solve a single partition using a dedicated DB session for thread safety.

        Each thread gets its own SQLAlchemy Session via session_factory (if provided).
        Sessions are NOT thread-safe, so sharing the main-thread session across
        ThreadPoolExecutor workers causes race conditions and corrupted state.
        """
        logger.info(f"Solving partition '{region}' with {len(site_ids)} sites")

        # Create a thread-local session if factory is available; otherwise fall back
        # to the shared session (legacy behavior for callers that haven't been updated).
        thread_db = self.session_factory() if self.session_factory else self.db
        owns_session = self.session_factory is not None

        try:
            # Subclass to scope employees to this partition's region
            class RegionScopedOptimizer(ProductionRosterOptimizer):
                def _load_data(inner_self, start, end, sites):
                    super()._load_data(start, end, sites)
                    if region != "Unknown":
                        inner_self.employees = [
                            e for e in inner_self.employees
                            if e.province == region or e.province is None
                        ]
                    logger.info(f"Partition '{region}': Filtered to {len(inner_self.employees)} employees")

            partition_cfg = getattr(self, '_partition_config', self.config)
            optimizer = RegionScopedOptimizer(thread_db, partition_cfg, self.org_id)
            return optimizer.optimize(start_date, end_date, site_ids)
        finally:
            if owns_session:
                thread_db.close()

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
            
            # total_cost lives under "summary" in the production optimizer result
            summary = res.get("summary", {})
            merged["total_cost"] += summary.get("total_cost", 0.0) or res.get("total_cost", 0.0)
            
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
