"""Roster generation API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
from app.database import get_db
from app.models.schemas import RosterGenerateRequest, RosterGenerateResponse, ShiftResponse
from app.services.shift_service import ShiftService
from app.services.cache_service import CacheInvalidator
from app.services.client_filter_service import ClientFilterService
from app.config import settings
from app.models.site import Site
from app.models.shift import Shift
from app.models.client import Client
from app.models.user import User
from app.api.deps import get_current_user
from app.auth.security import get_current_org_id

router = APIRouter()


# Lazy imports for ortools-dependent modules (loaded on first use)
# This prevents import errors on Railway if ortools has issues
def get_optimizer_classes():
    """Lazy load optimizer classes to defer ortools import."""
    from app.algorithms.milp_roster_generator import MILPRosterGenerator
    from app.algorithms.production_optimizer import ProductionRosterOptimizer, OptimizationConfig
    from app.algorithms.scalable_roster_optimizer import PartitionedRosterOptimizer
    return MILPRosterGenerator, ProductionRosterOptimizer, OptimizationConfig, PartitionedRosterOptimizer


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

        # If client_ids are provided, fetch all sites for those clients
        site_ids = request.site_ids

        # Get accessible clients for client filtering
        accessible_clients = ClientFilterService.get_accessible_clients(db, current_user.org_id)

        if request.client_ids:
            # Filter requested client_ids to only accessible clients
            filtered_client_ids = request.client_ids
            if accessible_clients is not None:
                filtered_client_ids = [cid for cid in request.client_ids if cid in accessible_clients]
                if len(filtered_client_ids) < len(request.client_ids):
                    logger.warning(f"Some requested client_ids are not accessible. Requested: {request.client_ids}, Accessible: {filtered_client_ids}")

            if filtered_client_ids:
                client_sites = db.query(Site).filter(
                    Site.client_id.in_(filtered_client_ids),
                    Site.org_id == current_user.org_id
                ).all()
                client_site_ids = [site.site_id for site in client_sites]

                # Combine with any manually specified site_ids
                if site_ids:
                    site_ids = list(set(site_ids + client_site_ids))
                else:
                    site_ids = client_site_ids

                logger.info(f"Client-specific roster: {len(filtered_client_ids)} clients, {len(site_ids)} sites")

        # If no specific sites/clients requested, apply client filtering to auto-select accessible sites
        if not site_ids and accessible_clients is not None:
            accessible_sites = db.query(Site).filter(
                Site.org_id == current_user.org_id,
                Site.client_id.in_(accessible_clients)
            ).all()
            site_ids = [s.site_id for s in accessible_sites]
            logger.info(f"Auto-filtered to {len(site_ids)} sites for accessible clients")

        # Determine which algorithm to use
        selected_algorithm = algorithm or "auto"

        logger.info(f"Roster generation requested: {start_datetime} to {end_datetime}, algorithm={selected_algorithm}")

        # Log budget constraints if specified
        if request.budget_limit:
            logger.info(f"Budget constraint: R{request.budget_limit:,.2f} total limit")
        if request.budget_per_client:
            logger.info(f"Per-client budgets: {len(request.budget_per_client)} clients")
        if request.budget_per_site:
            logger.info(f"Per-site budgets: {len(request.budget_per_site)} sites")

        # Lazy load optimizer classes
        MILPRosterGenerator, ProductionRosterOptimizer, OptimizationConfig, PartitionedRosterOptimizer = get_optimizer_classes()

        # Build optimization config with budget constraints
        def build_config(time_limit: int = 300) -> OptimizationConfig:
            return OptimizationConfig(
                time_limit_seconds=getattr(settings, 'MILP_TIME_LIMIT', time_limit),
                fairness_weight=getattr(settings, 'FAIRNESS_WEIGHT', 0.2),
                budget_limit=request.budget_limit,
                budget_per_client=request.budget_per_client,
                budget_per_site=request.budget_per_site
            )

        # Initialize appropriate optimizer
        if selected_algorithm == "auto" or selected_algorithm == "scalable":
            logger.info("Using Scalable Partitioned Optimizer")
            optimizer = PartitionedRosterOptimizer(
                db,
                config=build_config(300),
                org_id=current_user.org_id if hasattr(current_user, 'org_id') else None
            )
            result = optimizer.optimize(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=site_ids
            )

        elif selected_algorithm == "production":
            logger.info("Using Production CP-SAT Optimizer (Single Partition)")
            optimizer = ProductionRosterOptimizer(
                db,
                config=build_config(120),
                org_id=current_user.org_id if hasattr(current_user, 'org_id') else None
            )
            result = optimizer.optimize(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=site_ids
            )

        elif selected_algorithm == "milp":
            logger.info("Using Legacy MILP Generator (budget constraints not supported)")
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
                config=build_config(300),
                org_id=current_user.org_id if hasattr(current_user, 'org_id') else None
            )
            result = optimizer.optimize(
                start_date=start_datetime,
                end_date=end_datetime,
                site_ids=site_ids
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
    generate_pdf: Optional[bool] = Query(True, description="Generate PDF after confirmation"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Confirm and save generated roster assignments.

    **Cache Invalidation:** Clears dashboard and shift caches when roster is confirmed.
    **PDF Generation:** Optionally generates a PDF report for the confirmed roster.
    """
    try:
        confirmed_count = 0
        shift_ids = []

        for assignment in assignments:
            shift = ShiftService.assign_employee(
                db,
                assignment["shift_id"],
                assignment["employee_id"]
            )
            if shift:
                confirmed_count += 1
                shift_ids.append(shift.shift_id)

        # Invalidate caches after roster confirmation (include org_id for proper multi-tenancy)
        org_id = current_user.org_id if hasattr(current_user, 'org_id') else None
        CacheInvalidator.invalidate_dashboard(org_id=org_id)
        CacheInvalidator.invalidate_roster(org_id=org_id)
        CacheInvalidator.invalidate_shifts(org_id=org_id)

        logger.info(f"Roster confirmed: {confirmed_count} shifts assigned, caches invalidated")

        response = {
            "success": True,
            "confirmed_shifts": confirmed_count,
            "total_assignments": len(assignments)
        }

        # Generate PDF URL if requested
        if generate_pdf and shift_ids:
            # Get date range from confirmed shifts
            shifts = db.query(Shift).filter(Shift.shift_id.in_(shift_ids)).all()
            if shifts:
                start_date = min(s.start_time for s in shifts).date().isoformat()
                end_date = max(s.end_time for s in shifts).date().isoformat()

                # Construct PDF URL
                pdf_url = f"/api/v1/exports/roster/pdf?start_date={start_date}&end_date={end_date}"
                response["pdf_url"] = pdf_url
                logger.info(f"PDF URL generated: {pdf_url}")

        return response

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
    """Get list of shifts without assigned employees (filtered by organization and accessible clients)."""
    if not start_date:
        start_date = datetime.now()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    # Get accessible clients for client filtering
    accessible_clients = ClientFilterService.get_accessible_clients(db, org_id)

    # Filter site_id to ensure it belongs to the organization if provided
    if site_id:
        site_query = db.query(Site).filter(Site.site_id == site_id, Site.org_id == org_id)
        # Also check if site's client is accessible
        if accessible_clients is not None:
            site_query = site_query.filter(Site.client_id.in_(accessible_clients))
        site = site_query.first()
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site with ID {site_id} not found or not accessible in your organization"
            )
        site_ids = [site_id]
    else:
        # Get all sites for this organization (filtered by accessible clients)
        site_query = db.query(Site.site_id).filter(Site.org_id == org_id)
        if accessible_clients is not None:
            site_query = site_query.filter(Site.client_id.in_(accessible_clients))
        org_sites = site_query.all()
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

        # Check if client is accessible based on client management settings
        if not ClientFilterService.is_client_accessible(db, org_id, client_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Client with ID {client_id} is not accessible based on your client management settings"
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

        # Lazy load optimizer classes
        MILPRosterGenerator, ProductionRosterOptimizer, OptimizationConfig, PartitionedRosterOptimizer = get_optimizer_classes()

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


@router.get("/assignment-dashboard")
async def get_assignment_dashboard(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    client_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get roster assignment dashboard data grouped by client.

    Returns sites organized by client with fill status, available employees,
    and shift staffing information.

    Args:
        start_date: Start date for the dashboard (default: today)
        end_date: End date for the dashboard (default: 7 days from now)
        client_id: Optional filter to specific client
        current_user: Current authenticated user
        db: Database session

    Returns:
        Dashboard data with clients, sites, fill status, and available employees
    """
    from app.models.employee import Employee, EmployeeStatus
    from app.models.shift_assignment import ShiftAssignment

    # Multi-tenancy security - require valid org_id
    org_id = current_user.org_id
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no organization assigned. Please contact administrator."
        )

    if not start_date:
        start_date = datetime.now()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    # Get accessible clients
    accessible_clients = ClientFilterService.get_accessible_clients(db, org_id)

    # Build client query
    client_query = db.query(Client).filter(Client.org_id == org_id)
    if accessible_clients is not None:
        client_query = client_query.filter(Client.client_id.in_(accessible_clients))
    if client_id:
        client_query = client_query.filter(Client.client_id == client_id)

    clients = client_query.order_by(Client.client_name).all()

    dashboard_data = {
        "clients": [],
        "summary": {
            "total_clients": 0,
            "total_sites": 0,
            "total_shifts": 0,
            "filled_shifts": 0,
            "understaffed_shifts": 0,
            "empty_shifts": 0,
        },
        "date_range": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
    }

    for client in clients:
        # Get sites for this client
        sites = db.query(Site).filter(Site.client_id == client.client_id).order_by(Site.site_name).all()

        client_data = {
            "client_id": client.client_id,
            "client_name": client.client_name,
            "status": client.status,
            "sites": [],
            "summary": {
                "total_sites": len(sites),
                "total_shifts": 0,
                "filled_shifts": 0,
                "understaffed_shifts": 0,
                "empty_shifts": 0,
            }
        }

        for site in sites:
            # Get shifts for this site in the date range
            shifts = db.query(Shift).filter(
                Shift.site_id == site.site_id,
                Shift.start_time >= start_date,
                Shift.end_time <= end_date
            ).order_by(Shift.start_time).all()

            site_shifts = []
            for shift in shifts:
                # Get assignments for this shift
                assignments = db.query(ShiftAssignment).filter(
                    ShiftAssignment.shift_id == shift.shift_id
                ).all()

                assigned_count = len(assignments)
                required_staff = shift.required_staff or 1

                # Determine fill status
                if assigned_count >= required_staff:
                    fill_status = "full"
                    client_data["summary"]["filled_shifts"] += 1
                    dashboard_data["summary"]["filled_shifts"] += 1
                elif assigned_count > 0:
                    fill_status = "partial"
                    client_data["summary"]["understaffed_shifts"] += 1
                    dashboard_data["summary"]["understaffed_shifts"] += 1
                else:
                    fill_status = "empty"
                    client_data["summary"]["empty_shifts"] += 1
                    dashboard_data["summary"]["empty_shifts"] += 1

                client_data["summary"]["total_shifts"] += 1
                dashboard_data["summary"]["total_shifts"] += 1

                site_shifts.append({
                    "shift_id": shift.shift_id,
                    "start_time": shift.start_time.isoformat(),
                    "end_time": shift.end_time.isoformat(),
                    "required_staff": required_staff,
                    "assigned_count": assigned_count,
                    "fill_status": fill_status,
                    "status": shift.status.value if shift.status else "planned"
                })

            # Calculate site fill rate
            total_site_shifts = len(site_shifts)
            filled_site_shifts = sum(1 for s in site_shifts if s["fill_status"] == "full")
            site_fill_rate = round(filled_site_shifts / total_site_shifts * 100, 1) if total_site_shifts > 0 else 0

            client_data["sites"].append({
                "site_id": site.site_id,
                "site_name": site.site_name or f"Site {site.site_id}",
                "address": site.address,
                "total_shifts": total_site_shifts,
                "fill_rate": site_fill_rate,
                "shifts": site_shifts
            })

        # Get available employees for this client
        # Employees can work for a client if:
        # 1. They have no client restriction (assigned_client_ids is NULL/empty)
        # 2. OR this client is in their assigned_client_ids
        # 3. OR this client matches their legacy assigned_client_id
        from sqlalchemy import or_, and_

        available_employees_query = db.query(Employee).filter(
            Employee.org_id == org_id,
            Employee.status == EmployeeStatus.ACTIVE,
            or_(
                # No client restriction
                and_(
                    Employee.assigned_client_ids.is_(None),
                    Employee.assigned_client_id.is_(None)
                ),
                # Empty client restriction
                Employee.assigned_client_ids == [],
                # Client is in assigned_client_ids array
                Employee.assigned_client_ids.any(client.client_id),
                # Legacy: matches assigned_client_id
                Employee.assigned_client_id == client.client_id
            )
        )
        available_employees = available_employees_query.all()

        client_data["available_employees"] = [
            {
                "employee_id": emp.employee_id,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "role": emp.role.value if emp.role else None,
                "psira_grade": emp.psira_grade,
                "hourly_rate": emp.hourly_rate
            }
            for emp in available_employees[:50]  # Limit to 50
        ]
        client_data["available_employees_count"] = len(available_employees)

        # Calculate client fill rate
        total_client_shifts = client_data["summary"]["total_shifts"]
        filled_client_shifts = client_data["summary"]["filled_shifts"]
        client_data["fill_rate"] = round(filled_client_shifts / total_client_shifts * 100, 1) if total_client_shifts > 0 else 0

        dashboard_data["clients"].append(client_data)
        dashboard_data["summary"]["total_sites"] += len(sites)

    dashboard_data["summary"]["total_clients"] = len(clients)

    # Calculate overall fill rate
    total = dashboard_data["summary"]["total_shifts"]
    filled = dashboard_data["summary"]["filled_shifts"]
    dashboard_data["summary"]["fill_rate"] = round(filled / total * 100, 1) if total > 0 else 0

    return dashboard_data


# ============== SAVED ROSTER MANAGEMENT ==============

@router.post("/save")
async def save_roster(
    roster_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save a generated roster to the database for future reference.

    This endpoint persists a roster after generation, allowing it to be
    retrieved, published, or exported later.

    Args:
        roster_data: Dictionary containing:
            - name: Human-readable name (e.g., "Week 50 2024 - Cape Town")
            - start_date: Roster start date
            - end_date: Roster end date
            - client_id: Optional client filter
            - assignments: List of shift assignments
            - summary: Optimization summary (costs, fill rate, etc.)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Saved roster with ID and status
    """
    from app.models.roster import Roster
    from app.models.shift_assignment import ShiftAssignment
    import uuid

    try:
        org_id = current_user.org_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must belong to an organization"
            )

        # Generate unique roster code
        start_date = datetime.fromisoformat(roster_data.get('start_date', '').replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(roster_data.get('end_date', '').replace('Z', '+00:00'))
        week_num = start_date.isocalendar()[1]
        year = start_date.year
        unique_suffix = str(uuid.uuid4())[:8].upper()
        roster_code = f"R{year}-W{week_num}-{unique_suffix}"

        # Extract summary data
        summary = roster_data.get('summary', {})

        # Create roster record
        roster = Roster(
            org_id=org_id,
            roster_code=roster_code,
            name=roster_data.get('name', f"Roster {roster_code}"),
            start_date=start_date,
            end_date=end_date,
            client_id=roster_data.get('client_id'),
            status="draft",
            total_shifts=summary.get('total_shifts', 0),
            assigned_shifts=summary.get('assigned_shifts', 0),
            unassigned_shifts=summary.get('unassigned_shifts', 0),
            total_cost=summary.get('total_cost', 0.0),
            regular_pay_cost=summary.get('regular_pay_cost', 0.0),
            overtime_cost=summary.get('overtime_cost', 0.0),
            premium_cost=summary.get('premium_cost', 0.0),
            bcea_compliant=summary.get('bcea_compliant', True),
            psira_compliant=summary.get('psira_compliant', True),
            compliance_issues=summary.get('compliance_issues'),
            solver_status=roster_data.get('solver_status', 'optimal'),
            algorithm_used=roster_data.get('algorithm_used', 'production_cpsat'),
            fairness_score=summary.get('fairness_score'),
            optimization_duration_seconds=roster_data.get('optimization_duration_seconds'),
            created_by=current_user.user_id,
            notes=roster_data.get('notes')
        )

        db.add(roster)
        db.flush()  # Get roster_id

        # Create shift assignments if provided
        assignments = roster_data.get('assignments', [])
        for assignment in assignments:
            shift_assignment = ShiftAssignment(
                shift_id=assignment.get('shift_id'),
                employee_id=assignment.get('employee_id'),
                roster_id=roster.roster_id,
                status='pending',  # Will be confirmed when roster is published
                regular_hours=assignment.get('duration_hours', 0),
                cost_regular=assignment.get('cost', 0)
            )
            db.add(shift_assignment)

        db.commit()
        db.refresh(roster)

        logger.info(f"Roster saved: {roster_code} with {len(assignments)} assignments")

        return {
            "success": True,
            "roster_id": roster.roster_id,
            "roster_code": roster.roster_code,
            "name": roster.name,
            "status": roster.status,
            "total_shifts": roster.total_shifts,
            "assigned_shifts": roster.assigned_shifts,
            "fill_rate": roster.fill_rate
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error saving roster: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving roster: {str(e)}"
        )


@router.get("/saved")
async def list_saved_rosters(
    status_filter: Optional[str] = Query(None, description="Filter by status: draft, published, archived"),
    client_id: Optional[int] = Query(None, description="Filter by client ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date (from)"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date (to)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all saved rosters for the organization.

    Args:
        status_filter: Filter by roster status (draft, published, archived)
        client_id: Filter by specific client
        start_date: Filter rosters starting from this date
        end_date: Filter rosters ending before this date
        skip: Pagination offset
        limit: Maximum number of results
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of saved rosters with summary information
    """
    from app.models.roster import Roster

    try:
        org_id = current_user.org_id
        if not org_id:
            return {"rosters": [], "total": 0}

        query = db.query(Roster).filter(Roster.org_id == org_id)

        # Apply filters
        if status_filter:
            query = query.filter(Roster.status == status_filter)
        if client_id:
            query = query.filter(Roster.client_id == client_id)
        if start_date:
            query = query.filter(Roster.start_date >= start_date)
        if end_date:
            query = query.filter(Roster.end_date <= end_date)

        # Get total count
        total = query.count()

        # Apply pagination and ordering
        rosters = query.order_by(Roster.created_at.desc()).offset(skip).limit(limit).all()

        return {
            "rosters": [roster.to_dict() for roster in rosters],
            "total": total,
            "skip": skip,
            "limit": limit
        }

    except Exception as e:
        logger.error(f"Error listing rosters: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing rosters: {str(e)}"
        )


@router.get("/saved/{roster_id}")
async def get_saved_roster(
    roster_id: int,
    include_assignments: bool = Query(True, description="Include shift assignments in response"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific saved roster by ID.

    Args:
        roster_id: Roster ID
        include_assignments: Whether to include detailed assignments
        current_user: Current authenticated user
        db: Database session

    Returns:
        Roster details with optional assignments
    """
    from app.models.roster import Roster
    from app.models.shift_assignment import ShiftAssignment

    try:
        org_id = current_user.org_id

        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()

        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster with ID {roster_id} not found"
            )

        result = roster.to_dict()

        if include_assignments:
            assignments = db.query(ShiftAssignment).filter(
                ShiftAssignment.roster_id == roster_id
            ).all()

            result["assignments"] = [
                {
                    "assignment_id": a.assignment_id,
                    "shift_id": a.shift_id,
                    "employee_id": a.employee_id,
                    "status": a.status,
                    "regular_hours": a.regular_hours,
                    "overtime_hours": a.overtime_hours,
                    "cost_regular": a.cost_regular,
                    "cost_overtime": a.cost_overtime
                }
                for a in assignments
            ]

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting roster: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting roster: {str(e)}"
        )


@router.put("/saved/{roster_id}/status")
async def update_roster_status(
    roster_id: int,
    new_status: str = Query(..., description="New status: draft, published, archived"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the status of a saved roster.

    Workflow: draft → published → archived

    When publishing:
    - All pending shift assignments are confirmed
    - Published timestamp is recorded

    Args:
        roster_id: Roster ID
        new_status: New status to set
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated roster status
    """
    from app.models.roster import Roster
    from app.models.shift_assignment import ShiftAssignment

    valid_statuses = ["draft", "published", "archived"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )

    try:
        org_id = current_user.org_id

        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()

        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster with ID {roster_id} not found"
            )

        old_status = roster.status
        roster.status = new_status

        # If publishing, confirm all pending assignments
        if new_status == "published" and old_status != "published":
            roster.published_at = datetime.utcnow()
            roster.published_by = current_user.user_id

            # Confirm all pending assignments
            db.query(ShiftAssignment).filter(
                ShiftAssignment.roster_id == roster_id,
                ShiftAssignment.status == 'pending'
            ).update({'status': 'confirmed'})

            # Invalidate caches
            CacheInvalidator.invalidate_dashboard(org_id=org_id)
            CacheInvalidator.invalidate_roster(org_id=org_id)
            CacheInvalidator.invalidate_shifts(org_id=org_id)

            logger.info(f"Roster {roster_id} published with all assignments confirmed")

        db.commit()

        return {
            "success": True,
            "roster_id": roster_id,
            "old_status": old_status,
            "new_status": new_status,
            "published_at": roster.published_at.isoformat() if roster.published_at else None
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating roster status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating roster status: {str(e)}"
        )


@router.delete("/saved/{roster_id}")
async def delete_roster(
    roster_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a saved roster (only draft rosters can be deleted).

    Published rosters should be archived instead.

    Args:
        roster_id: Roster ID to delete
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success confirmation
    """
    from app.models.roster import Roster

    try:
        org_id = current_user.org_id

        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()

        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster with ID {roster_id} not found"
            )

        if roster.status == "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Published rosters cannot be deleted. Archive them instead."
            )

        roster_code = roster.roster_code
        db.delete(roster)  # Cascade will delete assignments
        db.commit()

        logger.info(f"Roster {roster_code} deleted")

        return {
            "success": True,
            "message": f"Roster {roster_code} deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting roster: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting roster: {str(e)}"
        )


@router.get("/spare-pool")
def get_spare_pool(
    buffer_pct: float = 0.15,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Calculate spare/relief guard pool metrics for the next 7 days.

    Returns recommended spare pool size based on the organisation's active guard
    count and their historical leave rate over the past 30 days, compared against
    how many guards are currently unscheduled in the next 7-day window.

    buffer_pct: minimum coverage buffer on top of the historical leave rate (default 15%).
    """
    import math
    from sqlalchemy import func, distinct
    from app.models.employee import Employee, EmployeeStatus
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.leave import LeaveRequest

    now = datetime.utcnow()
    window_start = now.replace(hour=0, minute=0, second=0)
    window_end = window_start + timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # Total active guards in the org
    active_guards = db.query(func.count(Employee.employee_id)).filter(
        Employee.org_id == org_id,
        Employee.status == EmployeeStatus.ACTIVE,
    ).scalar() or 0

    # Guards assigned to at least one non-cancelled shift in the next 7 days
    guards_with_shifts = db.query(
        func.count(distinct(ShiftAssignment.employee_id))
    ).join(
        Shift, ShiftAssignment.shift_id == Shift.shift_id
    ).filter(
        Shift.org_id == org_id,
        Shift.start_time >= window_start,
        Shift.start_time <= window_end,
        ShiftAssignment.status != AssignmentStatus.CANCELLED,
    ).scalar() or 0

    # Historical leave rate: distinct employees on approved leave in last 30 days
    on_leave_count = db.query(
        func.count(distinct(LeaveRequest.employee_id))
    ).filter(
        LeaveRequest.org_id == org_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date >= thirty_days_ago.date(),
    ).scalar() or 0

    leave_rate = (on_leave_count / active_guards) if active_guards > 0 else 0.0
    effective_buffer = max(buffer_pct, leave_rate)
    recommended = max(1, math.ceil(active_guards * effective_buffer)) if active_guards > 0 else 0

    available = max(0, active_guards - guards_with_shifts)
    shortage = recommended - available

    if shortage > 2:
        pool_status = "critical"
    elif shortage > 0:
        pool_status = "warning"
    else:
        pool_status = "ok"

    return {
        "active_guards": active_guards,
        "guards_with_shifts": guards_with_shifts,
        "available_guards": available,
        "recommended_spare_pool": recommended,
        "leave_rate_pct": round(leave_rate * 100, 1),
        "buffer_pct": round(buffer_pct * 100, 1),
        "shortage": shortage,
        "status": pool_status,
    }


@router.get("/cost-forecast")
def get_cost_forecast(
    start_date: datetime,
    end_date: datetime,
    site_id: Optional[int] = None,
    client_id: Optional[int] = None,
    budget_limit: Optional[float] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Project the total wage cost for a roster period before publishing.

    Returns per-site cost breakdown including:
    - Total shifts and filled/unfilled counts
    - Confirmed vs pending wage costs from ShiftAssignment records
    - Projected billing revenue (hours × client billing_rate)
    - Estimated profit margin per site
    - Overall totals and optional budget comparison
    """
    from sqlalchemy import func, distinct
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.employee import Employee
    from app.models.client import Client

    # Normalise date range to midnight boundaries
    start = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end = end_date.replace(hour=23, minute=59, second=59, microsecond=0)

    # Fetch all shifts in the period for this org
    shift_query = db.query(Shift).join(Site, Shift.site_id == Site.site_id).filter(
        Shift.org_id == org_id,
        Shift.start_time >= start,
        Shift.start_time <= end,
        Shift.status.notin_(["cancelled"]),
    )
    if site_id:
        shift_query = shift_query.filter(Shift.site_id == site_id)
    if client_id:
        shift_query = shift_query.filter(Site.client_id == client_id)

    shifts = shift_query.all()
    shift_ids = [s.shift_id for s in shifts]

    # Fetch all non-cancelled assignments for these shifts
    assignments = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id.in_(shift_ids),
        ShiftAssignment.status != AssignmentStatus.CANCELLED,
    ).all() if shift_ids else []

    # Index assignments by shift_id
    assignments_by_shift: dict[int, list] = {}
    for a in assignments:
        assignments_by_shift.setdefault(a.shift_id, []).append(a)

    # Index sites for lookup
    all_sites = {s.site_id: s for s in db.query(Site).filter(Site.org_id == org_id).all()}
    all_clients = {c.client_id: c for c in db.query(Client).filter(Client.org_id == org_id).all()}

    # Aggregate per site
    site_data: dict[int, dict] = {}
    for shift in shifts:
        sid = shift.site_id
        site = all_sites.get(sid)
        if not site:
            continue

        client = all_clients.get(site.client_id) if site.client_id else None
        billing_rate = float(client.billing_rate) if client and client.billing_rate else 120.0

        if sid not in site_data:
            site_data[sid] = {
                "site_id": sid,
                "site_name": site.site_name,
                "client_id": site.client_id,
                "client_name": client.client_name if client else None,
                "billing_rate": billing_rate,
                "target_margin_pct": float(client.target_margin_pct) if client and client.target_margin_pct else None,
                "total_shifts": 0,
                "filled_shifts": 0,
                "unfilled_shifts": 0,
                "required_guards": 0,
                "assigned_guards": 0,
                "confirmed_cost": 0.0,
                "pending_cost": 0.0,
                "total_hours": 0.0,
                "projected_revenue": 0.0,
            }

        sd = site_data[sid]
        sd["total_shifts"] += 1
        sd["required_guards"] += shift.required_staff

        shift_assignments = assignments_by_shift.get(shift.shift_id, [])
        if shift_assignments:
            sd["filled_shifts"] += 1
        else:
            sd["unfilled_shifts"] += 1

        for a in shift_assignments:
            sd["assigned_guards"] += 1
            hours = a.regular_hours + a.overtime_hours
            sd["total_hours"] += hours
            sd["projected_revenue"] += hours * billing_rate
            if a.status == AssignmentStatus.CONFIRMED:
                sd["confirmed_cost"] += a.total_cost
            else:
                sd["pending_cost"] += a.total_cost

    # Build per-site result rows
    sites_result = []
    total_wage_cost = 0.0
    total_revenue = 0.0
    total_shifts = 0
    total_filled = 0
    total_unfilled = 0
    total_hours = 0.0

    for sd in site_data.values():
        wage_cost = sd["confirmed_cost"] + sd["pending_cost"]
        revenue = sd["projected_revenue"]
        profit = revenue - wage_cost
        margin = round((profit / revenue * 100), 1) if revenue > 0 else 0.0
        target = sd.get("target_margin_pct") or 30.0
        margin_status = "green" if margin >= target else "amber" if margin >= target * 0.8 else "red"
        fill_rate = round(sd["filled_shifts"] / sd["total_shifts"] * 100, 1) if sd["total_shifts"] > 0 else 0.0

        sites_result.append({
            "site_id": sd["site_id"],
            "site_name": sd["site_name"],
            "client_id": sd["client_id"],
            "client_name": sd["client_name"],
            "total_shifts": sd["total_shifts"],
            "filled_shifts": sd["filled_shifts"],
            "unfilled_shifts": sd["unfilled_shifts"],
            "fill_rate_pct": fill_rate,
            "required_guards": sd["required_guards"],
            "assigned_guards": sd["assigned_guards"],
            "total_hours": round(sd["total_hours"], 1),
            "confirmed_cost": round(sd["confirmed_cost"], 2),
            "pending_cost": round(sd["pending_cost"], 2),
            "total_wage_cost": round(wage_cost, 2),
            "projected_revenue": round(revenue, 2),
            "projected_profit": round(profit, 2),
            "profit_margin_pct": margin,
            "margin_status": margin_status,
            "target_margin_pct": sd.get("target_margin_pct"),
        })

        total_wage_cost += wage_cost
        total_revenue += revenue
        total_shifts += sd["total_shifts"]
        total_filled += sd["filled_shifts"]
        total_unfilled += sd["unfilled_shifts"]
        total_hours += sd["total_hours"]

    # Sort by total wage cost descending
    sites_result.sort(key=lambda x: x["total_wage_cost"], reverse=True)

    overall_profit = total_revenue - total_wage_cost
    overall_margin = round((overall_profit / total_revenue * 100), 1) if total_revenue > 0 else 0.0
    overall_fill_rate = round(total_filled / total_shifts * 100, 1) if total_shifts > 0 else 0.0

    # Budget comparison
    budget_comparison = None
    if budget_limit is not None:
        variance = budget_limit - total_wage_cost
        budget_comparison = {
            "budget_limit": round(budget_limit, 2),
            "total_wage_cost": round(total_wage_cost, 2),
            "variance": round(variance, 2),
            "status": "under_budget" if variance >= 0 else "over_budget",
            "pct_used": round((total_wage_cost / budget_limit * 100), 1) if budget_limit > 0 else 0.0,
        }

    return {
        "period_start": start.date().isoformat(),
        "period_end": end.date().isoformat(),
        "summary": {
            "total_shifts": total_shifts,
            "filled_shifts": total_filled,
            "unfilled_shifts": total_unfilled,
            "fill_rate_pct": overall_fill_rate,
            "total_hours": round(total_hours, 1),
            "total_wage_cost": round(total_wage_cost, 2),
            "projected_revenue": round(total_revenue, 2),
            "projected_profit": round(overall_profit, 2),
            "profit_margin_pct": overall_margin,
        },
        "budget_comparison": budget_comparison,
        "sites": sites_result,
    }


@router.get("/site-coverage-calendar")
def get_site_coverage_calendar(
    start_date: datetime,
    end_date: datetime,
    site_id: Optional[int] = None,
    client_id: Optional[int] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Site coverage calendar: per-site, per-day staffing summary for calendar grid view.

    Returns a matrix of sites x dates with required_staff, assigned_staff, gap, and fill_rate.
    """
    from datetime import date as date_type, timedelta as td
    from collections import defaultdict
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus

    start = start_date if isinstance(start_date, date_type) else start_date.date()
    end = end_date if isinstance(end_date, date_type) else end_date.date()

    # Limit to 62 days
    if (end - start).days > 62:
        end = start + td(days=62)

    # Query shifts in range for org
    shift_q = (
        db.query(Shift)
        .join(Site, Shift.site_id == Site.site_id)
        .filter(
            Site.org_id == org_id,
            Shift.start_time >= datetime.combine(start, datetime.min.time()),
            Shift.start_time <= datetime.combine(end, datetime.max.time()),
            Shift.status != "cancelled",
        )
    )

    if site_id:
        shift_q = shift_q.filter(Shift.site_id == site_id)
    if client_id:
        shift_q = shift_q.filter(Site.client_id == client_id)

    shifts = shift_q.all()

    if not shifts:
        return {"period_start": start.isoformat(), "period_end": end.isoformat(), "sites": [], "dates": []}

    # Get assignment counts per shift
    shift_ids = [s.shift_id for s in shifts]
    assignment_counts: dict[int, int] = defaultdict(int)
    if shift_ids:
        from sqlalchemy import func
        counts = (
            db.query(ShiftAssignment.shift_id, func.count(ShiftAssignment.assignment_id))
            .filter(
                ShiftAssignment.shift_id.in_(shift_ids),
                ShiftAssignment.status != AssignmentStatus.CANCELLED,
            )
            .group_by(ShiftAssignment.shift_id)
            .all()
        )
        for sid, cnt in counts:
            assignment_counts[sid] = cnt

    # Get site info
    site_ids_in_result = list(set(s.site_id for s in shifts))
    sites_data = db.query(Site).filter(Site.site_id.in_(site_ids_in_result)).all()
    site_map = {s.site_id: s for s in sites_data}

    # Client names
    client_ids_list = list(set(s.client_id for s in sites_data if s.client_id))
    client_map: dict[int, str] = {}
    if client_ids_list:
        clients = db.query(Client).filter(Client.client_id.in_(client_ids_list)).all()
        client_map = {c.client_id: c.client_name for c in clients}

    # Build per-site per-date aggregation
    # Structure: {site_id: {date_str: {required, assigned}}}
    site_date_agg: dict[int, dict[str, dict]] = defaultdict(lambda: defaultdict(lambda: {"required": 0, "assigned": 0, "shifts": 0}))

    for s in shifts:
        d = s.start_time.date().isoformat()
        sid = s.site_id
        req = s.required_staff or 1
        asgn = assignment_counts.get(s.shift_id, 0)
        site_date_agg[sid][d]["required"] += req
        site_date_agg[sid][d]["assigned"] += asgn
        site_date_agg[sid][d]["shifts"] += 1

    # Build date list
    dates = []
    current = start
    while current <= end:
        dates.append(current.isoformat())
        current += td(days=1)

    # Build sites result
    sites_result = []
    for sid in sorted(site_ids_in_result):
        site = site_map.get(sid)
        if not site:
            continue
        day_data = []
        total_req = 0
        total_asgn = 0
        for d in dates:
            agg = site_date_agg[sid].get(d, {"required": 0, "assigned": 0, "shifts": 0})
            gap = agg["required"] - agg["assigned"]
            fill = round(agg["assigned"] / agg["required"] * 100, 1) if agg["required"] > 0 else None
            status = "no_shifts" if agg["shifts"] == 0 else "full" if gap <= 0 else "partial" if agg["assigned"] > 0 else "empty"
            total_req += agg["required"]
            total_asgn += agg["assigned"]
            day_data.append({
                "date": d,
                "required": agg["required"],
                "assigned": agg["assigned"],
                "gap": gap,
                "fill_rate": fill,
                "shifts": agg["shifts"],
                "status": status,
            })

        sites_result.append({
            "site_id": sid,
            "site_name": site.site_name or site.client_name,
            "client_name": client_map.get(site.client_id, "") if site.client_id else "",
            "total_required": total_req,
            "total_assigned": total_asgn,
            "overall_fill_rate": round(total_asgn / total_req * 100, 1) if total_req > 0 else None,
            "days": day_data,
        })

    return {
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "dates": dates,
        "sites": sites_result,
    }


@router.get("/posting-alerts")
def get_posting_alerts(
    start_date: datetime,
    end_date: datetime,
    site_id: Optional[int] = None,
    client_id: Optional[int] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Return over/under-posting alerts for shifts within the given date range.

    Severity levels:
    - critical  : 0 guards assigned AND shift starts within 24 hours
    - warning   : fewer guards than required (but ≥ 1 assigned), or shift is unassigned but not imminent
    - over       : more guards assigned than required
    - ok        : exactly the right number assigned
    """
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus

    now = datetime.utcnow()
    start = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end = end_date.replace(hour=23, minute=59, second=59, microsecond=0)

    # Fetch shifts in range (non-cancelled)
    shift_query = (
        db.query(Shift)
        .join(Site, Shift.site_id == Site.site_id)
        .filter(
            Shift.org_id == org_id,
            Shift.start_time >= start,
            Shift.start_time <= end,
            Shift.status.notin_(["cancelled", "completed"]),
        )
    )
    if site_id:
        shift_query = shift_query.filter(Shift.site_id == site_id)
    if client_id:
        shift_query = shift_query.filter(Site.client_id == client_id)

    shifts = shift_query.all()
    if not shifts:
        return {
            "as_of": now.isoformat(),
            "period_start": start.date().isoformat(),
            "period_end": end.date().isoformat(),
            "summary": {"critical": 0, "warning": 0, "over_posted": 0, "ok": 0, "total_shifts": 0},
            "alerts": [],
        }

    shift_ids = [s.shift_id for s in shifts]

    # Count active assignments per shift
    active_assignments = (
        db.query(
            ShiftAssignment.shift_id,
            ShiftAssignment.assignment_id,
        )
        .filter(
            ShiftAssignment.shift_id.in_(shift_ids),
            ShiftAssignment.status.notin_(["cancelled"]),
        )
        .all()
    )
    assigned_count: dict[int, int] = {}
    for a in active_assignments:
        assigned_count[a.shift_id] = assigned_count.get(a.shift_id, 0) + 1

    # Index sites and clients
    all_sites = {s.site_id: s for s in db.query(Site).filter(Site.org_id == org_id).all()}
    all_clients: dict[int, Client] = {}
    for s in all_sites.values():
        if s.client_id and s.client_id not in all_clients:
            c = db.query(Client).filter(Client.client_id == s.client_id).first()
            if c:
                all_clients[s.client_id] = c

    alerts = []
    summary = {"critical": 0, "warning": 0, "over_posted": 0, "ok": 0, "total_shifts": len(shifts)}

    for shift in shifts:
        required = shift.required_staff or 1
        assigned = assigned_count.get(shift.shift_id, 0)
        gap = assigned - required  # negative = under, positive = over

        if gap == 0:
            summary["ok"] += 1
            continue

        site = all_sites.get(shift.site_id)
        client = all_clients.get(site.client_id) if site and site.client_id else None
        hours_until = (shift.start_time - now).total_seconds() / 3600

        if gap < 0:
            # Under-posted
            if assigned == 0 and hours_until <= 24:
                severity = "critical"
                summary["critical"] += 1
            else:
                severity = "warning"
                summary["warning"] += 1
        else:
            # Over-posted
            severity = "over_posted"
            summary["over_posted"] += 1

        alerts.append({
            "shift_id": shift.shift_id,
            "site_id": shift.site_id,
            "site_name": site.site_name if site else f"Site {shift.site_id}",
            "client_id": site.client_id if site else None,
            "client_name": client.client_name if client else None,
            "shift_start": shift.start_time.isoformat(),
            "shift_end": shift.end_time.isoformat(),
            "required_staff": required,
            "assigned_staff": assigned,
            "gap": gap,
            "severity": severity,
            "hours_until_start": round(hours_until, 1),
        })

    # Sort: critical first, then warning, then over_posted; within each by shift start time
    severity_order = {"critical": 0, "warning": 1, "over_posted": 2}
    alerts.sort(key=lambda a: (severity_order.get(a["severity"], 9), a["shift_start"]))

    return {
        "as_of": now.isoformat(),
        "period_start": start.date().isoformat(),
        "period_end": end.date().isoformat(),
        "summary": summary,
        "alerts": alerts,
    }


@router.get("/spare-pool")
def get_spare_pool(
    lookback_days: int = 90,
    buffer_pct: float = 5.0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Calculate the recommended spare/relief guard pool size for the organisation.

    Uses historical absence data (approved leave + no-show/AWOL exceptions) to
    compute the historical absence rate, then recommends a spare headcount to
    cover expected daily absences plus a configurable safety buffer.
    """
    from math import ceil
    from datetime import date, timedelta, datetime, time as dt_time
    from app.models.leave import LeaveRequest
    from app.models.shift_exception import ShiftException
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.employee import Employee, EmployeeStatus

    today = date.today()
    lookback_start = today - timedelta(days=lookback_days)
    lookback_start_dt = datetime.combine(lookback_start, dt_time(0, 0))
    today_dt = datetime.combine(today, dt_time(23, 59))

    # 1. Active guard headcount
    active_count = db.query(Employee).filter(
        Employee.org_id == org_id,
        Employee.status == EmployeeStatus.ACTIVE,
    ).count()

    # 2. Approved leave incidents + days in lookback window
    leave_records = db.query(LeaveRequest).filter(
        LeaveRequest.org_id == org_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date >= lookback_start,
        LeaveRequest.start_date <= today,
    ).all()
    total_leave_days = sum(float(lr.days_requested or 1) for lr in leave_records)
    leave_incident_count = len(leave_records)

    # 3. No-show / AWOL exceptions in lookback window
    no_show_count = db.query(ShiftException).filter(
        ShiftException.org_id == org_id,
        ShiftException.exception_date >= lookback_start,
        ShiftException.exception_date <= today,
        ShiftException.exception_type.in_(["no_show", "awol"]),
    ).count()

    # 4. Total non-cancelled guard-shifts scheduled in lookback window
    scheduled_shifts = db.query(ShiftAssignment).join(
        Shift, ShiftAssignment.shift_id == Shift.shift_id
    ).filter(
        Shift.org_id == org_id,
        Shift.start_time >= lookback_start_dt,
        Shift.start_time <= today_dt,
        ShiftAssignment.status != AssignmentStatus.CANCELLED,
    ).count()

    # 5. Absence rate = absent units / (scheduled + absent)
    total_absent = total_leave_days + no_show_count
    total_possible = scheduled_shifts + total_absent
    absence_rate = (total_absent / total_possible * 100) if total_possible > 0 else 0.0

    # 6. Recommended spare pool (absence rate + safety buffer applied to active headcount)
    effective_rate = absence_rate / 100.0 + buffer_pct / 100.0
    recommended_spare = ceil(active_count * effective_rate) if active_count > 0 else 0

    # 7. Per-site unique guard deployment (last 30 days)
    site_window_dt = datetime.combine(today - timedelta(days=30), dt_time(0, 0))
    site_rows = db.query(
        Shift.site_id,
        ShiftAssignment.employee_id,
    ).join(
        Shift, ShiftAssignment.shift_id == Shift.shift_id
    ).filter(
        Shift.org_id == org_id,
        Shift.start_time >= site_window_dt,
        ShiftAssignment.status != AssignmentStatus.CANCELLED,
    ).distinct().all()

    site_guard_counts: dict[int, set] = {}
    for sid, emp_id in site_rows:
        site_guard_counts.setdefault(sid, set()).add(emp_id)

    all_sites_map = {s.site_id: s for s in db.query(Site).filter(Site.org_id == org_id).all()}
    client_cache: dict[int, Client] = {}
    for s in all_sites_map.values():
        if s.client_id and s.client_id not in client_cache:
            c = db.query(Client).filter(Client.client_id == s.client_id).first()
            if c:
                client_cache[s.client_id] = c

    site_breakdown = []
    for sid, emp_set in sorted(site_guard_counts.items(), key=lambda x: -len(x[1])):
        site = all_sites_map.get(sid)
        client = client_cache.get(site.client_id) if site and site.client_id else None
        site_breakdown.append({
            "site_id": sid,
            "site_name": site.site_name if site else f"Site {sid}",
            "client_name": client.client_name if client else None,
            "deployed_guards": len(emp_set),
        })

    return {
        "as_of": today.isoformat(),
        "lookback_days": lookback_days,
        "buffer_pct": buffer_pct,
        "active_guards": active_count,
        "absence_stats": {
            "leave_incidents": leave_incident_count,
            "total_leave_days": round(total_leave_days, 1),
            "no_show_awol_count": no_show_count,
            "total_absent_units": round(total_absent, 1),
            "total_scheduled_shifts": scheduled_shifts,
            "absence_rate_pct": round(absence_rate, 1),
        },
        "recommended_spare_pool": recommended_spare,
        "effective_rate_pct": round(effective_rate * 100, 1),
        "site_breakdown": site_breakdown,
    }


@router.get("/overtime-compliance")
def get_overtime_compliance(
    week_start: Optional[str] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    BCEA overtime compliance check for the specified week.

    South African BCEA limits:
    - Normal working time: 45 hours per week (Section 9)
    - Maximum overtime: 10 hours per week (Section 10)
    - Daily overtime: max 3 hours per day

    Returns per-employee hours breakdown with compliance status:
    - green:  total_hours < 45
    - amber:  45 <= total_hours <= 55  (within legal OT limit)
    - red:    total_hours > 55  (exceeds BCEA maximum)
    """
    from datetime import date, timedelta, datetime, time as dt_time
    from collections import defaultdict
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.employee import Employee, EmployeeStatus

    # Determine the Monday–Sunday week window
    if week_start:
        try:
            ws = datetime.fromisoformat(week_start).date()
        except ValueError:
            ws = date.today()
    else:
        ws = date.today()

    # Roll back to Monday
    monday = ws - timedelta(days=ws.weekday())
    sunday = monday + timedelta(days=6)
    start_dt = datetime.combine(monday, dt_time(0, 0))
    end_dt = datetime.combine(sunday, dt_time(23, 59, 59))

    # Fetch all non-cancelled assignments in the week for this org
    assignments = (
        db.query(ShiftAssignment)
        .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
        .filter(
            Shift.org_id == org_id,
            Shift.start_time >= start_dt,
            Shift.start_time <= end_dt,
            ShiftAssignment.status != AssignmentStatus.CANCELLED,
        )
        .all()
    )

    # Aggregate per employee
    emp_hours: dict[int, dict] = defaultdict(lambda: {
        "regular_hours": 0.0,
        "overtime_hours": 0.0,
        "shift_count": 0,
    })
    for a in assignments:
        emp_hours[a.employee_id]["regular_hours"] += a.regular_hours
        emp_hours[a.employee_id]["overtime_hours"] += a.overtime_hours
        emp_hours[a.employee_id]["shift_count"] += 1

    # Fetch employee details
    emp_ids = list(emp_hours.keys())
    employees_map: dict[int, Employee] = {}
    if emp_ids:
        for emp in db.query(Employee).filter(Employee.employee_id.in_(emp_ids)).all():
            employees_map[emp.employee_id] = emp

    BCEA_NORMAL = 45.0
    BCEA_MAX_OT = 10.0
    BCEA_ABSOLUTE = BCEA_NORMAL + BCEA_MAX_OT  # 55 hours

    rows = []
    summary = {"green": 0, "amber": 0, "red": 0, "total_employees": 0}

    for eid, hrs in emp_hours.items():
        emp = employees_map.get(eid)
        if not emp:
            continue

        total = round(hrs["regular_hours"] + hrs["overtime_hours"], 1)
        ot = round(hrs["overtime_hours"], 1)
        reg = round(hrs["regular_hours"], 1)
        max_week = emp.max_hours_week or 48

        if total > BCEA_ABSOLUTE:
            status = "red"
            summary["red"] += 1
        elif total >= BCEA_NORMAL:
            status = "amber"
            summary["amber"] += 1
        else:
            status = "green"
            summary["green"] += 1

        summary["total_employees"] += 1

        rows.append({
            "employee_id": eid,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "employee_number": str(eid).zfill(5),
            "role": emp.role.value if emp.role else None,
            "regular_hours": reg,
            "overtime_hours": ot,
            "total_hours": total,
            "max_hours_week": max_week,
            "shift_count": hrs["shift_count"],
            "compliance_status": status,
        })

    # Sort: red first, then amber, then green; within each by total hours descending
    status_order = {"red": 0, "amber": 1, "green": 2}
    rows.sort(key=lambda r: (status_order.get(r["compliance_status"], 9), -r["total_hours"]))

    return {
        "week_start": monday.isoformat(),
        "week_end": sunday.isoformat(),
        "bcea_limits": {
            "normal_hours": BCEA_NORMAL,
            "max_overtime": BCEA_MAX_OT,
            "absolute_max": BCEA_ABSOLUTE,
        },
        "summary": summary,
        "employees": rows,
    }
