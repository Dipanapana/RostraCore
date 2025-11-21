"""Roster generation API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
from app.database import get_db
from app.models.schemas import RosterGenerateRequest, RosterGenerateResponse, ShiftResponse
from app.algorithms.milp_roster_generator import MILPRosterGenerator
from app.algorithms.production_optimizer import ProductionRosterOptimizer, OptimizationConfig
from app.services.shift_service import ShiftService
from app.services.cache_service import CacheInvalidator
from app.config import settings
from app.models.site import Site
from app.models.client import Client
from app.models.user import User
from app.api.deps import get_current_user
from app.auth.security import get_current_org_id

router = APIRouter()


from app.algorithms.scalable_roster_optimizer import PartitionedRosterOptimizer


@router.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {"status": "ok", "message": "Roster API is working"}

@router.post("/generate")
async def generate_roster(
    request: RosterGenerateRequest,
    algorithm: Optional[str] = Query("auto", description="Algorithm: 'auto', 'production', 'milp'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate optimized roster using algorithmic approach.

    **Default: Auto (Partitioned CP-SAT)** - Scalable for 500+ guards

    Algorithms:
    - auto (default): Partitioned CP-SAT (ScalableRosterOptimizer)
    - production: Single-threaded CP-SAT (Legacy Production)
    - milp: Original MILP implementation (Legacy)

    Args:
        request: Roster generation request with dates and site IDs
        algorithm: Algorithm selection (default: 'auto')
        db: Database session

    Returns:
        Roster assignments with summary, costs, fairness metrics, and diagnostics
    """
    try:
        # Convert dates to datetime
        start_datetime = datetime.combine(request.start_date, datetime.min.time())
        end_datetime = datetime.combine(request.end_date, datetime.max.time())

        # Determine which algorithm to use
        selected_algorithm = algorithm or "auto"

        logger.info(f"Roster generation requested: {start_datetime} to {end_datetime}, algorithm={selected_algorithm}")

        # Initialize appropriate optimizer
        if selected_algorithm == "auto" or selected_algorithm == "scalable":
            logger.info("Using Scalable Partitioned Optimizer")
            optimizer = PartitionedRosterOptimizer(
                db,
                config=OptimizationConfig(
                    time_limit_seconds=getattr(settings, 'MILP_TIME_LIMIT', 300),
                    fairness_weight=getattr(settings, 'FAIRNESS_WEIGHT', 0.2)
                ),
                org_id=current_user.org_id if hasattr(current_user, 'org_id') else None
            )
            result = optimizer.optimize(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=request.site_ids
            )

        elif selected_algorithm == "production":
            logger.info("Using Production CP-SAT Optimizer (Single Partition)")
            optimizer = ProductionRosterOptimizer(
                db,
                config=OptimizationConfig(
                    time_limit_seconds=getattr(settings, 'MILP_TIME_LIMIT', 120),
                    fairness_weight=getattr(settings, 'FAIRNESS_WEIGHT', 0.2)
                ),
                org_id=current_user.org_id if hasattr(current_user, 'org_id') else None
            )
            result = optimizer.optimize(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=request.site_ids
            )

        elif selected_algorithm == "milp":
            logger.info("Using Legacy MILP Generator")
            generator = MILPRosterGenerator(db)
            result = generator.generate_roster(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=request.site_ids
            )
            result["algorithm_used"] = "milp"

        else:
            # Unknown algorithm, default to scalable
            logger.warning(f"Unknown algorithm '{selected_algorithm}', defaulting to scalable")
            optimizer = PartitionedRosterOptimizer(
                db,
                config=OptimizationConfig(
                    time_limit_seconds=getattr(settings, 'MILP_TIME_LIMIT', 300),
                    fairness_weight=getattr(settings, 'FAIRNESS_WEIGHT', 0.2)
                ),
                org_id=current_user.org_id if hasattr(current_user, 'org_id') else None
            )
            result = optimizer.optimize(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=request.site_ids
            )

        logger.info(f"Roster generation complete: {result.get('status', 'unknown')}, {len(result.get('assignments', []))} assignments")

        return result

    except Exception as e:
        logger.error(f"Roster generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating roster: {str(e)}"
        )


@router.post("/confirm")
async def confirm_roster(
    assignments: List[dict],
    db: Session = Depends(get_db)
):
    """
    Confirm and save generated roster assignments.

    **Cache Invalidation:** Clears dashboard and shift caches when roster is confirmed.
    """
    try:
        confirmed_count = 0
        for assignment in assignments:
            shift = ShiftService.assign_employee(
                db,
                assignment["shift_id"],
                assignment["employee_id"]
            )
            if shift:
                confirmed_count += 1

        # Invalidate caches after roster confirmation
        CacheInvalidator.invalidate_dashboard()
        CacheInvalidator.invalidate_roster()
        CacheInvalidator.invalidate_shifts()

        logger.info(f"Roster confirmed: {confirmed_count} shifts assigned, caches invalidated")

        return {
            "success": True,
            "confirmed_shifts": confirmed_count,
            "total_assignments": len(assignments)
        }

    except Exception as e:
        logger.error(f"Error confirming roster: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error confirming roster: {str(e)}"
        )


@router.get("/unfilled-shifts", response_model=List[ShiftResponse])
async def get_unfilled_shifts(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    site_id: Optional[int] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get list of shifts without assigned employees (filtered by organization)."""
    if not start_date:
        start_date = datetime.now()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    # Filter site_id to ensure it belongs to the organization if provided
    if site_id:
        site = db.query(Site).filter(Site.site_id == site_id, Site.org_id == org_id).first()
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site with ID {site_id} not found in your organization"
            )
        site_ids = [site_id]
    else:
        # Get all sites for this organization
        org_sites = db.query(Site.site_id).filter(Site.org_id == org_id).all()
        site_ids = [s.site_id for s in org_sites] if org_sites else []

    if not site_ids:
        return []

    shifts = ShiftService.get_unassigned_shifts(
        db,
        start_date=start_date,
        end_date=end_date,
        site_ids=site_ids
    )

    return shifts


@router.get("/employee-hours")
async def get_employee_hours(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    employee_id: Optional[int] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get hours breakdown per employee (filtered by organization)."""
    if not start_date:
        start_date = datetime.now()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    shifts = ShiftService.get_all(
        db,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        org_id=org_id,
        limit=1000
    )

    # Calculate hours per employee
    employee_hours = {}
    for shift in shifts:
        if shift.assigned_employee_id:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            if shift.assigned_employee_id not in employee_hours:
                employee_hours[shift.assigned_employee_id] = {
                    "employee_id": shift.assigned_employee_id,
                    "total_hours": 0,
                    "shift_count": 0
                }
            employee_hours[shift.assigned_employee_id]["total_hours"] += duration
            employee_hours[shift.assigned_employee_id]["shift_count"] += 1

    return {"employee_hours": list(employee_hours.values())}


@router.get("/budget-summary")
async def get_budget_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    site_id: Optional[int] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get budget summary for a roster period (filtered by organization)."""
    if not start_date:
        start_date = datetime.now()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    shifts = ShiftService.get_all(
        db,
        site_id=site_id,
        start_date=start_date,
        end_date=end_date,
        org_id=org_id,
        limit=1000
    )

    total_cost = 0
    total_hours = 0
    filled_shifts = 0

    for shift in shifts:
        if shift.assigned_employee_id and shift.employee:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            cost = duration * shift.employee.hourly_rate
            total_cost += cost
            total_hours += duration
            filled_shifts += 1

    return {
        "total_cost": round(total_cost, 2),
        "total_hours": round(total_hours, 2),
        "filled_shifts": filled_shifts,
        "total_shifts": len(shifts),
        "fill_rate": round(filled_shifts / len(shifts) * 100, 2) if shifts else 0
    }


@router.post("/generate-for-client/{client_id}", response_model=RosterGenerateResponse)
async def generate_roster_for_client(
    client_id: int,
    start_date: datetime,
    end_date: datetime,
    algorithm: Optional[str] = Query("production", description="Algorithm: 'production', 'milp', 'auto'"),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Generate optimized roster for a specific client's sites (filtered by organization).

    **Client-Specific Roster Generation**

    This endpoint automatically includes all sites belonging to the specified client,
    making it easy to generate rosters for specific clients without manually selecting sites.

    Args:
        client_id: Client ID to generate roster for
        start_date: Start date for roster period
        end_date: End date for roster period
        algorithm: Algorithm selection (default: 'production')
        org_id: Organization ID (from current user)
        db: Database session

    Returns:
        Roster assignments with summary, costs, fairness metrics, and diagnostics
    """
    try:
        # Verify client exists and belongs to organization
        client = db.query(Client).filter(
            Client.client_id == client_id,
            Client.org_id == org_id
        ).first()

        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client with ID {client_id} not found in your organization"
            )

        # Get all sites for this client
        sites = db.query(Site).filter(Site.client_id == client_id).all()

        if not sites:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No sites found for client '{client.client_name}' (ID: {client_id})"
            )

        site_ids = [site.site_id for site in sites]

        logger.info(
            f"Client-specific roster generation for '{client.client_name}' "
            f"(ID: {client_id}): {len(site_ids)} sites, "
            f"{start_date} to {end_date}"
        )

        # Convert dates to datetime if needed
        if isinstance(start_date, datetime):
            start_datetime = start_date
        else:
            start_datetime = datetime.combine(start_date, datetime.min.time())

        if isinstance(end_date, datetime):
            end_datetime = end_date
        else:
            end_datetime = datetime.combine(end_date, datetime.max.time())

        # Determine which algorithm to use
        selected_algorithm = algorithm or "auto"

        # Auto-select based on roster period and complexity
        if selected_algorithm == "auto":
            # Always use production optimizer (most robust)
            selected_algorithm = "production"
            logger.info(f"Auto-selected {selected_algorithm}")

        # Initialize appropriate optimizer
        if selected_algorithm == "auto" or selected_algorithm == "scalable":
            logger.info("Using Scalable Partitioned Optimizer")
            optimizer = PartitionedRosterOptimizer(
                db,
                config=OptimizationConfig(
                    time_limit_seconds=getattr(settings, 'MILP_TIME_LIMIT', 300),
                    fairness_weight=getattr(settings, 'FAIRNESS_WEIGHT', 0.2)
                ),
                org_id=org_id
            )
            result = optimizer.optimize(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=site_ids
            )

        elif selected_algorithm == "production":
            logger.info("Using Production CP-SAT Optimizer")
            optimizer = ProductionRosterOptimizer(
                db,
                config=OptimizationConfig(
                    time_limit_seconds=getattr(settings, 'MILP_TIME_LIMIT', 120),
                    fairness_weight=getattr(settings, 'FAIRNESS_WEIGHT', 0.2)
                )
            )
            result = optimizer.optimize(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=site_ids
            )

        elif selected_algorithm == "milp":
            logger.info("Using Legacy MILP Generator")
            generator = MILPRosterGenerator(db)
            result = generator.generate_roster(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=site_ids
            )
            result["algorithm_used"] = "milp"

        else:
            # Unknown algorithm, default to scalable
            logger.warning(f"Unknown algorithm '{selected_algorithm}', defaulting to scalable")
            optimizer = PartitionedRosterOptimizer(
                db,
                config=OptimizationConfig(
                    time_limit_seconds=getattr(settings, 'MILP_TIME_LIMIT', 300),
                    fairness_weight=getattr(settings, 'FAIRNESS_WEIGHT', 0.2)
                )
            )
            result = optimizer.optimize(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=site_ids
            )

        # Add client information to result
        result["client"] = {
            "client_id": client.client_id,
            "client_name": client.client_name,
            "site_count": len(site_ids),
            "sites": [
                {
                    "site_id": site.site_id,
                    "site_name": site.site_name or site.client_name,
                    "address": site.address
                }
                for site in sites
            ]
        }

        logger.info(
            f"Client-specific roster complete for '{client.client_name}': "
            f"{result.get('status', 'unknown')}, "
            f"{len(result.get('assignments', []))} assignments"
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Client-specific roster generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating roster for client: {str(e)}"
        )
