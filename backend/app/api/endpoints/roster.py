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
                config=OptimizationConfig(
                    time_limit_seconds=getattr(settings, 'MILP_TIME_LIMIT', 120),
                    fairness_weight=getattr(settings, 'FAIRNESS_WEIGHT', 0.2)
                ),
                org_id=current_user.org_id if hasattr(current_user, 'org_id') else None
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
                ),
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

    org_id = current_user.org_id or 1

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
