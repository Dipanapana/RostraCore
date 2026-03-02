"""Roster generation API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
from app.database import get_db, SessionLocal
from app.models.schemas import RosterGenerateRequest, RosterGenerateResponse, ShiftResponse
from app.services.shift_service import ShiftService
from app.services.cache_service import CacheInvalidator
from app.services.client_filter_service import ClientFilterService
from app.config import settings
from app.models.site import Site
from app.models.shift import Shift, ShiftStatus
from app.models.client import Client
from app.models.user import User
from app.api.deps import get_current_user
from app.auth.security import get_current_org_id
from app.services.audit_service import AuditService

router = APIRouter()


# Lazy imports for ortools-dependent modules (loaded on first use)
# This prevents import errors on Railway if ortools has issues
def get_optimizer_classes():
    """Lazy load optimizer classes to defer ortools import."""
    from app.algorithms.production_optimizer import ProductionRosterOptimizer, OptimizationConfig
    from app.algorithms.scalable_roster_optimizer import PartitionedRosterOptimizer
    return None, ProductionRosterOptimizer, OptimizationConfig, PartitionedRosterOptimizer


@router.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {"status": "ok", "message": "Roster API is working"}

@router.post("/generate")
async def generate_roster(
    request: RosterGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate optimized roster using Google OR-Tools CP-SAT solver.

    Uses Partitioned CP-SAT — splits sites by province and solves in parallel.
    Scales to 1000+ employees with sub-minute response times.

    Args:
        request: Roster generation request with dates and site IDs
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

        logger.info(f"Roster generation requested: {start_datetime} to {end_datetime}")

        # Log budget constraints if specified
        if request.budget_limit:
            logger.info(f"Budget constraint: R{request.budget_limit:,.2f} total limit")
        if request.budget_per_client:
            logger.info(f"Per-client budgets: {len(request.budget_per_client)} clients")
        if request.budget_per_site:
            logger.info(f"Per-site budgets: {len(request.budget_per_site)} sites")

        # Lazy load optimizer classes
        _, ProductionRosterOptimizer, OptimizationConfig, PartitionedRosterOptimizer = get_optimizer_classes()

        # Build optimization config with budget constraints
        config = OptimizationConfig(
            time_limit_seconds=getattr(settings, 'MILP_TIME_LIMIT', 300),
            fairness_weight=getattr(settings, 'FAIRNESS_WEIGHT', 0.2),
            budget_limit=request.budget_limit,
            budget_per_client=request.budget_per_client,
            budget_per_site=request.budget_per_site
        )

        # Always use Partitioned CP-SAT (Google OR-Tools) — scales to 1000+ employees
        logger.info("Using Partitioned CP-SAT Optimizer (Google OR-Tools)")
        optimizer = PartitionedRosterOptimizer(
            db,
            config=config,
            org_id=current_user.org_id if hasattr(current_user, 'org_id') else None,
            session_factory=SessionLocal
        )
        result = optimizer.optimize(
            start_date=start_datetime,
            end_date=end_datetime,
            site_ids=site_ids
        )
        result["algorithm_used"] = "cpsat_partitioned"

        # -------------------------------------------------------------------
        # Auto-create shifts if none found, then retry optimization once.
        # ShiftAutoGenerator is idempotent — skips existing shifts.
        # Falls back to default 06:00-18:00 / 18:00-06:00 if no profiles.
        #
        # Condition: no assignments AND no unfilled_shifts means no shifts
        # existed at all. PartitionedOptimizer converts "empty" → "feasible"
        # so we cannot rely on status alone.
        # -------------------------------------------------------------------
        no_shifts_at_all = (
            result.get("status") == "empty"
            or (not result.get("assignments") and not result.get("unfilled_shifts"))
        )
        if no_shifts_at_all:
            logger.info("No shifts found — auto-generating from site profiles and retrying")
            from app.services.shift_auto_generator import ShiftAutoGenerator
            auto_result = ShiftAutoGenerator.generate_shifts_for_org(
                db=db,
                org_id=current_user.org_id,
                site_ids=site_ids,
                start_date=start_datetime.date(),
                end_date=end_datetime.date(),
            )
            shifts_created = auto_result.get("shifts_created", 0)
            if shifts_created > 0:
                logger.info(f"Auto-created {shifts_created} shifts, retrying optimization")
                retry_optimizer = PartitionedRosterOptimizer(
                    db,
                    config=config,
                    org_id=current_user.org_id if hasattr(current_user, 'org_id') else None,
                    session_factory=SessionLocal
                )
                result = retry_optimizer.optimize(start_datetime, end_datetime, site_ids)
                result["shifts_auto_created"] = shifts_created

        logger.info(f"Roster generation complete: {result.get('status', 'unknown')}, {len(result.get('assignments', []))} assignments")

        # Build summary object expected by the frontend
        assignments_list = result.get("assignments", [])
        unfilled_list = result.get("unfilled_shifts", [])
        total_shifts = len(assignments_list) + len(unfilled_list)
        total_cost = sum(a.get("cost", 0) for a in assignments_list)
        avg_cost = total_cost / len(assignments_list) if assignments_list else 0
        emp_ids = set(a.get("employee_id") for a in assignments_list)

        result["summary"] = {
            "total_cost": round(total_cost, 2),
            "total_shifts": total_shifts,
            "total_shifts_filled": len(assignments_list),
            "fill_rate": round(len(assignments_list) / total_shifts * 100, 1) if total_shifts > 0 else 0,
            "employees_utilized": len(emp_ids),
            "average_cost_per_shift": round(avg_cost, 2),
            "total_warnings": 0,
            "employee_hours": {},
        }

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
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.employee import Employee

    if not start_date:
        start_date = datetime.now()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    # Use ShiftAssignment join for multi-guard support (replaces deprecated assigned_employee_id)
    query = (
        db.query(ShiftAssignment, Shift)
        .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
        .filter(
            Shift.org_id == org_id,
            Shift.start_time >= start_date,
            Shift.start_time < end_date,
            ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED]),
        )
    )
    if employee_id:
        query = query.filter(ShiftAssignment.employee_id == employee_id)

    results = query.all()

    employee_hours = {}
    for assignment, shift in results:
        eid = assignment.employee_id
        duration = (shift.end_time - shift.start_time).total_seconds() / 3600
        if eid not in employee_hours:
            employee_hours[eid] = {
                "employee_id": eid,
                "total_hours": 0,
                "shift_count": 0
            }
        employee_hours[eid]["total_hours"] += duration
        employee_hours[eid]["shift_count"] += 1

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
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.employee import Employee

    if not start_date:
        start_date = datetime.now()
    if not end_date:
        end_date = start_date + timedelta(days=7)

    # Use ShiftAssignment join for multi-guard support (replaces deprecated assigned_employee_id)
    shift_query = db.query(Shift).filter(
        Shift.org_id == org_id,
        Shift.start_time >= start_date,
        Shift.start_time < end_date,
    )
    if site_id:
        shift_query = shift_query.filter(Shift.site_id == site_id)
    all_shifts = shift_query.all()
    shift_ids = [s.shift_id for s in all_shifts]

    total_cost = 0
    total_hours = 0
    filled_shifts = 0

    if shift_ids:
        assignments = (
            db.query(ShiftAssignment, Shift, Employee)
            .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
            .join(Employee, ShiftAssignment.employee_id == Employee.employee_id)
            .filter(
                ShiftAssignment.shift_id.in_(shift_ids),
                ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED]),
            )
            .all()
        )
        seen_shifts = set()
        for assignment, shift, emp in assignments:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            cost = duration * (emp.hourly_rate or 0)
            total_cost += cost
            total_hours += duration
            seen_shifts.add(shift.shift_id)
        filled_shifts = len(seen_shifts)

    return {
        "total_cost": round(total_cost, 2),
        "total_hours": round(total_hours, 2),
        "filled_shifts": filled_shifts,
        "total_shifts": len(all_shifts),
        "fill_rate": round(filled_shifts / len(all_shifts) * 100, 2) if all_shifts else 0
    }


@router.post("/generate-for-client/{client_id}", response_model=RosterGenerateResponse)
async def generate_roster_for_client(
    client_id: int,
    start_date: datetime,
    end_date: datetime,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Generate optimized roster for a specific client's sites using CP-SAT.

    Automatically includes all sites belonging to the specified client.

    Args:
        client_id: Client ID to generate roster for
        start_date: Start date for roster period
        end_date: End date for roster period
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

        # Lazy load optimizer classes
        _, ProductionRosterOptimizer, OptimizationConfig, PartitionedRosterOptimizer = get_optimizer_classes()

        # Always use Partitioned CP-SAT (Google OR-Tools)
        logger.info("Using Partitioned CP-SAT Optimizer (Google OR-Tools)")
        optimizer = PartitionedRosterOptimizer(
            db,
            config=OptimizationConfig(
                time_limit_seconds=getattr(settings, 'MILP_TIME_LIMIT', 300),
                fairness_weight=getattr(settings, 'FAIRNESS_WEIGHT', 0.2)
            ),
            org_id=org_id,
            session_factory=SessionLocal
        )
        result = optimizer.optimize(
            start_date=start_datetime,
            end_date=end_datetime,
            site_ids=site_ids
        )
        result["algorithm_used"] = "cpsat_partitioned"

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
                    "status": shift.status.value if shift.status else "PLANNED"
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

        # Create shift assignments if provided — skip duplicates
        assignments = roster_data.get('assignments', [])
        created_count = 0
        for assignment in assignments:
            shift_id = assignment.get('shift_id')
            employee_id = assignment.get('employee_id')
            # Skip if this shift+employee combo already exists
            existing = db.query(ShiftAssignment).filter(
                ShiftAssignment.shift_id == shift_id,
                ShiftAssignment.employee_id == employee_id
            ).first()
            if existing:
                # Update to link to this roster if not already linked
                if not existing.roster_id:
                    existing.roster_id = roster.roster_id
                continue
            shift_assignment = ShiftAssignment(
                shift_id=shift_id,
                employee_id=employee_id,
                roster_id=roster.roster_id,
                status='pending',
                regular_hours=assignment.get('duration_hours', 0),
                regular_pay=assignment.get('cost', 0)
            )
            db.add(shift_assignment)
            created_count += 1

        db.commit()

        # Audit trail
        AuditService.log_change(
            db=db, org_id=org_id, entity_type="roster", entity_id=roster.roster_id,
            action="create", changes={"name": roster.name, "assignments": len(assignments)},
            user_id=current_user.user_id, user_email=current_user.email
        )
        db.commit()

        db.refresh(roster)

        # Create initial snapshot for version history
        _create_roster_snapshot(db, roster, current_user.user_id, label="Initial save")
        db.commit()

        logger.info(f"Roster saved: {roster_code} with {created_count} new assignments ({len(assignments) - created_count} already existed)")

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
            from app.models.employee import Employee

            assignments = db.query(ShiftAssignment).filter(
                ShiftAssignment.roster_id == roster_id
            ).all()

            # Build employee name lookup
            emp_ids = list({a.employee_id for a in assignments if a.employee_id})
            emp_map = {}
            if emp_ids:
                employees = db.query(Employee.employee_id, Employee.first_name, Employee.last_name).filter(
                    Employee.employee_id.in_(emp_ids)
                ).all()
                emp_map = {e.employee_id: f"{e.first_name} {e.last_name}" for e in employees}

            result["assignments"] = [
                {
                    "assignment_id": a.assignment_id,
                    "shift_id": a.shift_id,
                    "employee_id": a.employee_id,
                    "employee_name": emp_map.get(a.employee_id, f"Employee #{a.employee_id}"),
                    "status": a.status,
                    "regular_hours": a.regular_hours,
                    "overtime_hours": a.overtime_hours,
                    "cost_regular": a.regular_pay,
                    "cost_overtime": a.overtime_pay
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

        # Create snapshot on publish for version history
        if new_status == "published" and old_status != "published":
            _create_roster_snapshot(db, roster, current_user.user_id, label="Published")
            db.commit()

        # Audit trail
        AuditService.log_change(
            db=db, org_id=org_id, entity_type="roster", entity_id=roster_id,
            action=new_status, changes={"old_status": old_status, "new_status": new_status},
            user_id=current_user.user_id, user_email=current_user.email
        )
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

        # Audit trail
        AuditService.log_change(
            db=db, org_id=org_id, entity_type="roster", entity_id=roster_id,
            action="delete", changes={"name": roster.name, "status": roster.status},
            user_id=current_user.user_id, user_email=current_user.email
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
        Shift.status.notin_([ShiftStatus.CANCELLED]),
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
            Shift.status != ShiftStatus.CANCELLED,
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
            Shift.status.notin_([ShiftStatus.CANCELLED, ShiftStatus.COMPLETED]),
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


# ============== ROSTER SNAPSHOT HELPER ==============

def _create_roster_snapshot(db, roster, user_id, label=None):
    """Create a snapshot of the current roster state with enriched metadata."""
    from app.models.roster_snapshot import RosterSnapshot
    from app.models.shift_assignment import ShiftAssignment
    from app.models.employee import Employee
    from app.models.shift import Shift
    from app.models.site import Site
    from sqlalchemy import func

    # Get current version count
    max_version = db.query(func.max(RosterSnapshot.version)).filter(
        RosterSnapshot.roster_id == roster.roster_id
    ).scalar() or 0

    # Serialize current assignments with enriched data
    assignments = db.query(ShiftAssignment).filter(
        ShiftAssignment.roster_id == roster.roster_id
    ).all()

    # Build lookup maps for employee names, shift details, site names
    emp_ids = list(set(a.employee_id for a in assignments if a.employee_id))
    shift_ids = list(set(a.shift_id for a in assignments if a.shift_id))

    emp_map = {}
    if emp_ids:
        emps = db.query(Employee.employee_id, Employee.first_name, Employee.last_name).filter(
            Employee.employee_id.in_(emp_ids)
        ).all()
        emp_map = {e.employee_id: f"{e.first_name} {e.last_name}" for e in emps}

    shift_map = {}
    site_ids = set()
    if shift_ids:
        shifts = db.query(Shift.shift_id, Shift.site_id, Shift.start_time, Shift.end_time).filter(
            Shift.shift_id.in_(shift_ids)
        ).all()
        shift_map = {s.shift_id: {"site_id": s.site_id, "start_time": s.start_time, "end_time": s.end_time} for s in shifts}
        site_ids = set(s.site_id for s in shifts if s.site_id)

    site_map = {}
    if site_ids:
        sites = db.query(Site.site_id, Site.site_name).filter(
            Site.site_id.in_(list(site_ids))
        ).all()
        site_map = {s.site_id: s.site_name for s in sites}

    total_cost = 0.0
    enriched_assignments = []
    for a in assignments:
        shift_info = shift_map.get(a.shift_id, {})
        site_id = shift_info.get("site_id")
        cost = float(a.regular_pay or 0) + float(a.overtime_pay or 0)
        total_cost += cost

        enriched_assignments.append({
            "assignment_id": a.assignment_id,
            "shift_id": a.shift_id,
            "employee_id": a.employee_id,
            "status": a.status,
            "regular_hours": float(a.regular_hours or 0),
            "employee_name": emp_map.get(a.employee_id, f"Employee #{a.employee_id}"),
            "site_name": site_map.get(site_id, f"Site #{site_id}") if site_id else None,
            "shift_start": shift_info.get("start_time").isoformat() if shift_info.get("start_time") else None,
            "shift_end": shift_info.get("end_time").isoformat() if shift_info.get("end_time") else None,
            "cost": cost,
        })

    snapshot_data = {
        "assignments": enriched_assignments,
        "total_shifts": roster.total_shifts,
        "assigned_shifts": roster.assigned_shifts,
        "total_cost": round(total_cost, 2),
    }

    snapshot = RosterSnapshot(
        roster_id=roster.roster_id,
        org_id=roster.org_id,
        version=max_version + 1,
        snapshot_data=snapshot_data,
        label=label,
        created_by=user_id
    )
    db.add(snapshot)
    db.flush()
    return snapshot


# ============== PHASE 2: AUDIT TRAIL ENDPOINTS ==============

@router.get("/audit-log")
async def get_roster_audit_log(
    roster_id: Optional[int] = None,
    entity_type: Optional[str] = Query(None, description="Filter: roster, shift, assignment"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get roster audit log entries.

    If roster_id is provided, returns history for that specific roster.
    Otherwise returns recent changes filtered by entity_type and date range.
    """
    try:
        org_id = current_user.org_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must belong to an organization"
            )

        if roster_id:
            # Return history for a specific roster
            entries = AuditService.get_entity_history(
                db=db, org_id=org_id, entity_type="roster",
                entity_id=roster_id, limit=limit
            )
        else:
            # Return recent changes with optional filters
            entity_types_filter = [entity_type] if entity_type else ["roster", "shift", "assignment"]
            parsed_start = datetime.fromisoformat(start_date) if start_date else None
            parsed_end = datetime.fromisoformat(end_date) if end_date else None

            entries = AuditService.get_recent_changes(
                db=db, org_id=org_id, entity_types=entity_types_filter,
                limit=limit, start_date=parsed_start, end_date=parsed_end
            )

        return {
            "audit_log": [
                {
                    "log_id": e.log_id,
                    "entity_type": e.entity_type,
                    "entity_id": e.entity_id,
                    "action": e.action,
                    "changes": e.changes,
                    "reason": e.reason,
                    "user_id": e.user_id,
                    "user_email": e.user_email,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
                for e in entries
            ],
            "total": len(entries),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching audit log: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching audit log: {str(e)}"
        )


@router.get("/saved/{roster_id}/versions")
async def get_roster_versions(
    roster_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all version snapshots for a roster, ordered by version descending.
    """
    from app.models.roster_snapshot import RosterSnapshot
    from app.models.roster import Roster

    try:
        org_id = current_user.org_id

        # Verify roster belongs to org
        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster with ID {roster_id} not found"
            )

        snapshots = db.query(RosterSnapshot).filter(
            RosterSnapshot.roster_id == roster_id,
            RosterSnapshot.org_id == org_id
        ).order_by(RosterSnapshot.version.desc()).all()

        return {
            "roster_id": roster_id,
            "versions": [
                {
                    "snapshot_id": s.snapshot_id,
                    "version": s.version,
                    "label": s.label,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "created_by": s.created_by,
                    "assignment_count": len(s.snapshot_data.get("assignments", [])) if s.snapshot_data else 0,
                    "total_shifts": s.snapshot_data.get("total_shifts", 0) if s.snapshot_data else 0,
                    "assigned_shifts": s.snapshot_data.get("assigned_shifts", 0) if s.snapshot_data else 0,
                    "total_cost": s.snapshot_data.get("total_cost") if s.snapshot_data else None,
                }
                for s in snapshots
            ],
            "total": len(snapshots),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching roster versions: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching roster versions: {str(e)}"
        )


@router.get("/saved/{roster_id}/compare")
async def compare_roster_versions(
    roster_id: int,
    v1: int = Query(..., description="First version number to compare"),
    v2: int = Query(..., description="Second version number to compare"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compare two roster version snapshots.

    Returns assignments added, removed, and changed between v1 and v2.
    Compares by (shift_id, employee_id) tuples.
    """
    from app.models.roster_snapshot import RosterSnapshot
    from app.models.roster import Roster

    try:
        org_id = current_user.org_id

        # Verify roster belongs to org
        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster with ID {roster_id} not found"
            )

        # Load both snapshots
        snap1 = db.query(RosterSnapshot).filter(
            RosterSnapshot.roster_id == roster_id,
            RosterSnapshot.version == v1
        ).first()
        snap2 = db.query(RosterSnapshot).filter(
            RosterSnapshot.roster_id == roster_id,
            RosterSnapshot.version == v2
        ).first()

        if not snap1:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version {v1} not found for roster {roster_id}"
            )
        if not snap2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version {v2} not found for roster {roster_id}"
            )

        # Build lookup maps keyed by (shift_id, employee_id)
        assignments_v1 = snap1.snapshot_data.get("assignments", [])
        assignments_v2 = snap2.snapshot_data.get("assignments", [])

        # Collect all employee/shift IDs for hydration of older snapshots
        all_emp_ids = set()
        all_shift_ids = set()
        for a in assignments_v1 + assignments_v2:
            if a.get("employee_id"):
                all_emp_ids.add(a["employee_id"])
            if a.get("shift_id"):
                all_shift_ids.add(a["shift_id"])

        # Build hydration maps (employee name, shift info, site name)
        from app.models.employee import Employee
        from app.models.shift import Shift
        from app.models.site import Site

        emp_map = {}
        if all_emp_ids:
            emps = db.query(Employee.employee_id, Employee.first_name, Employee.last_name).filter(
                Employee.employee_id.in_(list(all_emp_ids))
            ).all()
            emp_map = {e.employee_id: f"{e.first_name} {e.last_name}" for e in emps}

        shift_map = {}
        site_ids = set()
        if all_shift_ids:
            shifts = db.query(Shift.shift_id, Shift.site_id, Shift.start_time, Shift.end_time).filter(
                Shift.shift_id.in_(list(all_shift_ids))
            ).all()
            shift_map = {s.shift_id: {"site_id": s.site_id, "start_time": s.start_time, "end_time": s.end_time} for s in shifts}
            site_ids = set(s.site_id for s in shifts if s.site_id)

        site_map = {}
        if site_ids:
            sites = db.query(Site.site_id, Site.site_name).filter(
                Site.site_id.in_(list(site_ids))
            ).all()
            site_map = {s.site_id: s.site_name for s in sites}

        def _hydrate(assignment):
            """Add human-readable fields to assignment if missing."""
            a = dict(assignment)
            if "employee_name" not in a:
                a["employee_name"] = emp_map.get(a.get("employee_id"), f"Employee #{a.get('employee_id')}")
            shift_info = shift_map.get(a.get("shift_id"), {})
            if "site_name" not in a:
                sid = shift_info.get("site_id")
                a["site_name"] = site_map.get(sid, f"Site #{sid}") if sid else None
            if "shift_start" not in a and shift_info.get("start_time"):
                a["shift_start"] = shift_info["start_time"].isoformat()
            if "shift_end" not in a and shift_info.get("end_time"):
                a["shift_end"] = shift_info["end_time"].isoformat()
            return a

        map_v1 = {}
        for a in assignments_v1:
            key = (a.get("shift_id"), a.get("employee_id"))
            map_v1[key] = a

        map_v2 = {}
        for a in assignments_v2:
            key = (a.get("shift_id"), a.get("employee_id"))
            map_v2[key] = a

        keys_v1 = set(map_v1.keys())
        keys_v2 = set(map_v2.keys())

        # Assignments only in v2 (added going from v1 to v2)
        added = [_hydrate(map_v2[k]) for k in (keys_v2 - keys_v1)]
        # Assignments only in v1 (removed going from v1 to v2)
        removed = [_hydrate(map_v1[k]) for k in (keys_v1 - keys_v2)]
        # Assignments in both but with different fields
        changed = []
        for k in (keys_v1 & keys_v2):
            a1 = map_v1[k]
            a2 = map_v2[k]
            if a1 != a2:
                changed.append({"v1": _hydrate(a1), "v2": _hydrate(a2)})

        return {
            "roster_id": roster_id,
            "v1": v1,
            "v2": v2,
            "v1_label": snap1.label,
            "v2_label": snap2.label,
            "v1_created_at": snap1.created_at.isoformat() if snap1.created_at else None,
            "v2_created_at": snap2.created_at.isoformat() if snap2.created_at else None,
            "added": added,
            "removed": removed,
            "changed": changed,
            "summary": {
                "added_count": len(added),
                "removed_count": len(removed),
                "changed_count": len(changed),
                "v1_total_cost": snap1.snapshot_data.get("total_cost"),
                "v2_total_cost": snap2.snapshot_data.get("total_cost"),
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing roster versions: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error comparing roster versions: {str(e)}"
        )


# ============== PHASE 3: ROSTER UX ENDPOINTS ==============

@router.post("/clone/{roster_id}")
async def clone_roster(
    roster_id: int,
    clone_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clone a roster with shifted dates.

    Args:
        roster_id: Source roster ID to clone
        clone_data: {
            "new_start_date": "2026-03-01",
            "name": "Optional new name"
        }

    Creates a new draft roster with all shifts and assignments duplicated,
    dates shifted by the offset between the original start_date and new_start_date.
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

        # Load source roster
        source_roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()
        if not source_roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster with ID {roster_id} not found"
            )

        # Parse new start date
        new_start_str = clone_data.get("new_start_date")
        if not new_start_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="new_start_date is required"
            )
        new_start_date = datetime.fromisoformat(new_start_str.replace("Z", "+00:00"))

        # Calculate date offset
        date_offset = new_start_date - source_roster.start_date
        new_end_date = source_roster.end_date + date_offset

        # Generate new roster code
        week_num = new_start_date.isocalendar()[1]
        year = new_start_date.year
        unique_suffix = str(uuid.uuid4())[:8].upper()
        roster_code = f"R{year}-W{week_num}-{unique_suffix}"

        # Create new roster
        new_roster = Roster(
            org_id=org_id,
            roster_code=roster_code,
            name=clone_data.get("name", f"Clone of {source_roster.name}"),
            start_date=new_start_date,
            end_date=new_end_date,
            client_id=source_roster.client_id,
            status="draft",
            total_shifts=source_roster.total_shifts,
            assigned_shifts=0,
            unassigned_shifts=source_roster.total_shifts,
            total_cost=0.0,
            regular_pay_cost=0.0,
            overtime_cost=0.0,
            premium_cost=0.0,
            bcea_compliant=True,
            psira_compliant=True,
            algorithm_used="cloned",
            created_by=current_user.user_id,
            notes=f"Cloned from roster {source_roster.roster_code}"
        )
        db.add(new_roster)
        db.flush()

        # Load source assignments with their shifts
        source_assignments = db.query(ShiftAssignment).filter(
            ShiftAssignment.roster_id == roster_id
        ).all()

        # Map old shift_id -> new shift for creating shifted shifts
        shift_id_map = {}
        new_assignment_count = 0

        for sa in source_assignments:
            old_shift = sa.shift
            if not old_shift:
                continue

            # Create new shift with shifted dates if we haven't already
            if old_shift.shift_id not in shift_id_map:
                new_shift = Shift(
                    org_id=org_id,
                    site_id=old_shift.site_id,
                    start_time=old_shift.start_time + date_offset,
                    end_time=old_shift.end_time + date_offset,
                    required_skill=old_shift.required_skill,
                    required_staff=old_shift.required_staff,
                    status=ShiftStatus.PLANNED,
                    is_overtime=old_shift.is_overtime,
                    includes_meal_break=old_shift.includes_meal_break,
                    meal_break_duration_minutes=old_shift.meal_break_duration_minutes,
                    required_psira_grade=old_shift.required_psira_grade,
                    requires_firearm=old_shift.requires_firearm,
                    required_firearm_type=old_shift.required_firearm_type,
                    notes=old_shift.notes,
                    created_by=current_user.email,
                )
                db.add(new_shift)
                db.flush()
                shift_id_map[old_shift.shift_id] = new_shift

            # Create new assignment linking to new shift
            new_assignment = ShiftAssignment(
                shift_id=shift_id_map[old_shift.shift_id].shift_id,
                employee_id=sa.employee_id,
                roster_id=new_roster.roster_id,
                status="pending",
                regular_hours=sa.regular_hours,
            )
            db.add(new_assignment)
            new_assignment_count += 1

        # Update roster counts
        new_roster.assigned_shifts = new_assignment_count
        new_roster.unassigned_shifts = max(0, new_roster.total_shifts - new_assignment_count)

        db.commit()

        # Audit trail
        AuditService.log_change(
            db=db, org_id=org_id, entity_type="roster", entity_id=new_roster.roster_id,
            action="create", changes={
                "cloned_from": roster_id,
                "source_code": source_roster.roster_code,
                "assignments": new_assignment_count,
                "shifts_created": len(shift_id_map),
            },
            user_id=current_user.user_id, user_email=current_user.email
        )
        db.commit()

        logger.info(f"Roster {source_roster.roster_code} cloned to {roster_code}")

        return {
            "success": True,
            "roster_id": new_roster.roster_id,
            "roster_code": new_roster.roster_code,
            "name": new_roster.name,
            "status": new_roster.status,
            "start_date": new_roster.start_date.isoformat(),
            "end_date": new_roster.end_date.isoformat(),
            "assignments_cloned": new_assignment_count,
            "shifts_created": len(shift_id_map),
            "cloned_from": {
                "roster_id": source_roster.roster_id,
                "roster_code": source_roster.roster_code,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error cloning roster: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cloning roster: {str(e)}"
        )


@router.post("/generate-from-templates")
async def generate_from_templates(
    template_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate shifts from site shift templates across a date range.

    Args:
        template_data: {
            "site_ids": [1, 2, 3],
            "start_date": "2026-03-01",
            "end_date": "2026-03-07"
        }

    Loads ShiftTemplate records for requested sites, expands them across the
    date range matching day_of_week, and creates Shift records.
    """
    from app.models.shift_template import ShiftTemplate

    try:
        org_id = current_user.org_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must belong to an organization"
            )

        site_ids = template_data.get("site_ids", [])
        start_date_str = template_data.get("start_date")
        end_date_str = template_data.get("end_date")

        if not site_ids or not start_date_str or not end_date_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="site_ids, start_date, and end_date are required"
            )

        start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
        end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))

        if end_date <= start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date must be after start_date"
            )

        # Verify sites belong to org
        valid_sites = db.query(Site).filter(
            Site.site_id.in_(site_ids),
            Site.org_id == org_id
        ).all()
        valid_site_ids = {s.site_id for s in valid_sites}

        if not valid_site_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No valid sites found for this organization"
            )

        # Load templates for the sites
        templates = db.query(ShiftTemplate).filter(
            ShiftTemplate.site_id.in_(valid_site_ids)
        ).all()

        if not templates:
            return {
                "success": True,
                "shifts_created": 0,
                "message": "No shift templates found for the specified sites",
                "shifts": [],
            }

        # Expand templates across date range
        created_shifts = []
        current_date = start_date.date() if hasattr(start_date, 'date') else start_date
        end_date_only = end_date.date() if hasattr(end_date, 'date') else end_date

        while current_date <= end_date_only:
            day_of_week = current_date.weekday()  # 0=Monday, 6=Sunday

            for tmpl in templates:
                if tmpl.day_of_week is not None and tmpl.day_of_week != day_of_week:
                    continue

                # Create shift for this template on this date
                shift_start = datetime.combine(current_date, tmpl.start_time)
                shift_end = datetime.combine(current_date, tmpl.end_time)

                # Handle overnight shifts
                if shift_end <= shift_start:
                    shift_end += timedelta(days=1)

                # Create required number of shift records
                for _ in range(tmpl.required_staff_count or 1):
                    new_shift = Shift(
                        org_id=org_id,
                        site_id=tmpl.site_id,
                        start_time=shift_start,
                        end_time=shift_end,
                        required_skill=tmpl.required_skill,
                        required_staff=1,
                        status=ShiftStatus.PLANNED,
                        is_overtime=False,
                        created_by=current_user.email,
                        notes=f"Generated from template: {tmpl.template_name}",
                    )
                    db.add(new_shift)
                    db.flush()
                    created_shifts.append({
                        "shift_id": new_shift.shift_id,
                        "site_id": new_shift.site_id,
                        "start_time": new_shift.start_time.isoformat(),
                        "end_time": new_shift.end_time.isoformat(),
                        "required_skill": new_shift.required_skill,
                        "template_name": tmpl.template_name,
                    })

            current_date += timedelta(days=1)

        db.commit()

        logger.info(f"Generated {len(created_shifts)} shifts from templates for sites {list(valid_site_ids)}")

        return {
            "success": True,
            "shifts_created": len(created_shifts),
            "date_range": {
                "start_date": start_date_str,
                "end_date": end_date_str,
            },
            "sites_processed": len(valid_site_ids),
            "templates_used": len(templates),
            "shifts": created_shifts,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating from templates: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating from templates: {str(e)}"
        )


@router.post("/validate-assignment")
async def validate_assignment(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lightweight feasibility check for a single (shift_id, employee_id) pair.
    Used by the drag-and-drop roster board to validate before persisting.

    Args:
        data: {"shift_id": int, "employee_id": int}

    Returns:
        {feasible: bool, reasons: [], warnings: [], estimated_cost: float}
    """
    from app.models.employee import Employee
    from app.models.certification import Certification
    from app.models.availability import Availability
    from app.utils.holidays import PremiumRateCalculator

    try:
        org_id = current_user.org_id
        shift_id = data.get("shift_id")
        employee_id = data.get("employee_id")

        if not shift_id or not employee_id:
            raise HTTPException(status_code=400, detail="shift_id and employee_id are required")

        # Load shift and employee
        shift = db.query(Shift).filter(Shift.shift_id == shift_id, Shift.org_id == org_id).first()
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")

        employee = db.query(Employee).filter(Employee.employee_id == employee_id, Employee.org_id == org_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        reasons = []
        warnings = []

        # 1. Skill match check
        if shift.required_skill:
            emp_role = employee.role.value.lower() if employee.role else ""
            required = shift.required_skill.lower()
            skill_ok = (emp_role == required or
                       (emp_role == "armed" and required == "unarmed") or
                       emp_role == "supervisor")
            if not skill_ok:
                reasons.append(f"Skill mismatch: employee is {emp_role}, shift requires {required}")

        # 2. Client assignment check
        if employee.assigned_client_id is not None:
            site = db.query(Site).filter(Site.site_id == shift.site_id).first()
            if site and site.client_id != employee.assigned_client_id:
                reasons.append(f"Employee assigned to client {employee.assigned_client_id}, shift belongs to client {site.client_id}")

        # 3. Certification check (warnings only)
        certs = db.query(Certification).filter(Certification.employee_id == employee_id).all()
        shift_date = shift.start_time.date()
        valid_certs = [c for c in certs if c.verified and c.expiry_date and c.expiry_date >= shift_date]
        if not valid_certs:
            if certs:
                warnings.append("All certifications expired or unverified")
            else:
                warnings.append("No certifications on file")

        # 4. Availability check
        avail = db.query(Availability).filter(
            Availability.employee_id == employee_id,
            Availability.date == shift_date
        ).first()
        if avail and not avail.available:
            reasons.append("Employee marked as unavailable on this date")

        # 5. Overlap check (existing assignments)
        from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
        existing = (
            db.query(ShiftAssignment)
            .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
            .filter(
                ShiftAssignment.employee_id == employee_id,
                ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED]),
                Shift.start_time < shift.end_time,
                Shift.end_time > shift.start_time,
            )
            .first()
        )
        if existing:
            reasons.append("Employee already assigned to an overlapping shift")

        # 6. Weekly hours check
        from sqlalchemy import func, and_
        week_start = shift.start_time - timedelta(days=shift.start_time.weekday())
        week_end = week_start + timedelta(days=7)
        weekly_hours_result = (
            db.query(func.sum(Shift.end_time - Shift.start_time))
            .join(ShiftAssignment, ShiftAssignment.shift_id == Shift.shift_id)
            .filter(
                ShiftAssignment.employee_id == employee_id,
                ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED]),
                Shift.start_time >= week_start,
                Shift.start_time < week_end,
            )
            .scalar()
        )
        current_weekly_hours = weekly_hours_result.total_seconds() / 3600 if weekly_hours_result else 0
        shift_hours = (shift.end_time - shift.start_time).total_seconds() / 3600
        if current_weekly_hours + shift_hours > 48:
            warnings.append(f"Adding this shift would total {current_weekly_hours + shift_hours:.1f}h this week (BCEA max: 48h)")

        # Calculate estimated cost
        estimated_cost = 0.0
        if not reasons and employee.hourly_rate:
            paid_hours = shift.paid_hours if hasattr(shift, 'paid_hours') else shift_hours
            total_cost, premium_amount, premium_type = PremiumRateCalculator.calculate_shift_cost(
                base_hourly_rate=float(employee.hourly_rate),
                hours=paid_hours,
                shift_date=shift_date,
            )
            estimated_cost = total_cost

        return {
            "feasible": len(reasons) == 0,
            "reasons": reasons,
            "warnings": warnings,
            "estimated_cost": round(estimated_cost, 2),
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "shift_time": f"{shift.start_time.strftime('%H:%M')} - {shift.end_time.strftime('%H:%M')}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating assignment: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggest-guards")
async def suggest_guards(
    shift_id: int = Query(..., description="Shift to get suggestions for"),
    roster_id: int = Query(..., description="Roster context for existing assignments"),
    limit: int = Query(5, ge=1, le=20, description="Max suggestions to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Suggest the best-fit guards for a specific shift, scored by multiple factors.
    Read-only, no solver — returns in <200ms.

    Scoring (0-100):
    - Client match: +30 (employee assigned to same client as shift's site)
    - Role match: +20 (employee role matches shift required_skill)
    - PSIRA grade: +15 (higher grades score more)
    - Cost efficiency: +15 (lower hourly_rate is better)
    - Not double-booked: +10 (no overlapping shift that day)
    - Fairness bonus: +10 (fewer existing assignments = higher)
    """
    from app.models.employee import Employee, EmployeeStatus
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus
    from app.models.roster import Roster
    from sqlalchemy import func

    try:
        org_id = current_user.org_id
        if not org_id:
            raise HTTPException(status_code=400, detail="User must belong to an organization")

        # Load shift
        shift = db.query(Shift).filter(Shift.shift_id == shift_id, Shift.org_id == org_id).first()
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")

        # Load site for client matching
        site = db.query(Site).filter(Site.site_id == shift.site_id).first()
        site_client_id = site.client_id if site else None

        # Get employees already assigned to this shift (in any active roster)
        already_assigned_ids = set(
            row[0] for row in db.query(ShiftAssignment.employee_id).filter(
                ShiftAssignment.shift_id == shift_id,
                ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED]),
            ).all()
        )

        # Get all roster assignments for fairness counting
        roster = db.query(Roster).filter(Roster.roster_id == roster_id, Roster.org_id == org_id).first()
        assignment_counts = {}
        if roster:
            counts = (
                db.query(ShiftAssignment.employee_id, func.count(ShiftAssignment.assignment_id))
                .filter(
                    ShiftAssignment.roster_id == roster_id,
                    ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED]),
                )
                .group_by(ShiftAssignment.employee_id)
                .all()
            )
            assignment_counts = {row[0]: row[1] for row in counts}
        max_assignments = max(assignment_counts.values()) if assignment_counts else 1

        # Get employees with overlapping shifts on the same day
        shift_date = shift.start_time.date()
        overlapping_employee_ids = set(
            row[0] for row in (
                db.query(ShiftAssignment.employee_id)
                .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
                .filter(
                    ShiftAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED]),
                    Shift.start_time < shift.end_time,
                    Shift.end_time > shift.start_time,
                )
                .all()
            )
        )

        # Load all active employees for this org
        employees = (
            db.query(Employee)
            .filter(Employee.org_id == org_id, Employee.status == EmployeeStatus.ACTIVE)
            .all()
        )

        # Get hourly rates for cost efficiency scoring
        rates = [e.hourly_rate for e in employees if e.hourly_rate]
        max_rate = max(rates) if rates else 100
        min_rate = min(rates) if rates else 0

        suggestions = []
        for emp in employees:
            if emp.employee_id in already_assigned_ids:
                continue

            score = 0
            reasons = []

            # Client match (+30)
            if site_client_id and emp.assigned_client_id == site_client_id:
                score += 30
                reasons.append("Assigned to this client")
            elif emp.assigned_client_id is None:
                score += 15
                reasons.append("Available for any client")

            # Role match (+20)
            emp_role = emp.role.value.lower() if emp.role else ""
            required = (shift.required_skill or "").lower()
            if required:
                if emp_role == required:
                    score += 20
                    reasons.append(f"Role: {emp_role}")
                elif emp_role == "armed" and required == "unarmed":
                    score += 15
                    reasons.append("Armed (overqualified)")
                elif emp_role == "supervisor":
                    score += 15
                    reasons.append("Supervisor")
            else:
                score += 10

            # PSIRA grade (+15)
            grade_scores = {"Grade A": 15, "Grade B": 12, "Grade C": 9, "Grade D": 6, "Grade E": 3}
            if emp.psira_grade:
                score += grade_scores.get(emp.psira_grade, 5)
                reasons.append(emp.psira_grade)

            # Cost efficiency (+15) — lower rate = higher score
            if emp.hourly_rate and max_rate > min_rate:
                cost_score = 15 * (1 - (float(emp.hourly_rate) - min_rate) / (max_rate - min_rate))
                score += round(cost_score, 1)

            # Not double-booked (+10)
            if emp.employee_id not in overlapping_employee_ids:
                score += 10
            else:
                score -= 20
                reasons.append("Has overlapping shift")

            # Fairness bonus (+10) — fewer assignments = higher
            emp_count = assignment_counts.get(emp.employee_id, 0)
            if max_assignments > 0:
                fairness_score = 10 * (1 - emp_count / max(max_assignments, 1))
                score += round(fairness_score, 1)

            is_feasible = emp.employee_id not in overlapping_employee_ids

            suggestions.append({
                "employee_id": emp.employee_id,
                "name": f"{emp.first_name} {emp.last_name}",
                "role": emp_role,
                "psira_grade": emp.psira_grade,
                "hourly_rate": float(emp.hourly_rate) if emp.hourly_rate else None,
                "fit_score": round(min(100, max(0, score)), 1),
                "reasons": reasons,
                "feasible": is_feasible,
                "current_assignments": assignment_counts.get(emp.employee_id, 0),
            })

        # Sort by score descending, then by feasibility
        suggestions.sort(key=lambda s: (s["feasible"], s["fit_score"]), reverse=True)

        return suggestions[:limit]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suggesting guards: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/saved/{roster_id}/gap-insights")
async def get_gap_insights(
    roster_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Intelligent gap analysis for a saved roster.

    For every unfilled shift, checks ALL active employees against 7 blocker
    categories, then generates actionable recommendations sorted by impact.

    Returns in <2s for 200 shifts × 60 employees by pre-loading all data
    into memory and running checks without DB round-trips.
    """
    import time as _time
    import math
    from collections import defaultdict
    from app.models.employee import Employee, EmployeeStatus
    from app.models.shift_assignment import ShiftAssignment
    from app.models.roster import Roster
    from app.models.availability import Availability
    from app.models.certification import Certification
    from sqlalchemy import func
    from sqlalchemy.orm import joinedload

    t0 = _time.time()

    try:
        org_id = current_user.org_id
        if not org_id:
            raise HTTPException(status_code=400, detail="User must belong to an organization")

        # ── 1. Load roster ──────────────────────────────────────────────
        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id, Roster.org_id == org_id
        ).first()
        if not roster:
            raise HTTPException(status_code=404, detail="Roster not found")

        start_date = roster.start_date
        end_date = roster.end_date

        # ── 2. Load ALL shifts in the roster period ─────────────────────
        all_shifts = (
            db.query(Shift)
            .filter(Shift.org_id == org_id, Shift.start_time >= start_date, Shift.end_time <= end_date)
            .all()
        )

        # ── 3. Load assignment counts per shift in this roster ──────────
        assignment_rows = (
            db.query(ShiftAssignment.shift_id, func.count(ShiftAssignment.assignment_id))
            .filter(
                ShiftAssignment.roster_id == roster_id,
                ShiftAssignment.status.notin_(["cancelled", "CANCELLED"]),
            )
            .group_by(ShiftAssignment.shift_id)
            .all()
        )
        assignment_counts = {row[0]: row[1] for row in assignment_rows}

        # Identify unfilled shifts (gap > 0)
        unfilled_shifts = []
        for shift in all_shifts:
            assigned = assignment_counts.get(shift.shift_id, 0)
            required = shift.required_staff or 1
            gap = required - assigned
            if gap > 0:
                unfilled_shifts.append((shift, gap))

        if not unfilled_shifts:
            elapsed = (_time.time() - t0) * 1000
            return {
                "roster_id": roster_id,
                "analysis_time_ms": round(elapsed),
                "unfilled_count": 0,
                "total_gap_slots": 0,
                "gap_summary": [],
                "recommendations": [],
                "per_shift_diagnostics": [],
            }

        # ── 4. Pre-load ALL employees (active) ─────────────────────────
        employees = (
            db.query(Employee)
            .filter(Employee.org_id == org_id, Employee.status == EmployeeStatus.ACTIVE)
            .all()
        )

        # ── 5. Pre-load sites + clients for name lookups ────────────────
        site_ids = list(set(s.site_id for s, _ in unfilled_shifts))
        sites = db.query(Site).filter(Site.site_id.in_(site_ids)).all() if site_ids else []
        site_map = {s.site_id: s for s in sites}

        client_ids = list(set(s.client_id for s in sites if s.client_id))
        clients = db.query(Client).filter(Client.client_id.in_(client_ids)).all() if client_ids else []
        client_map = {c.client_id: c.client_name for c in clients}

        # ── 6. Pre-load availability records for the period ─────────────
        avail_records = (
            db.query(Availability)
            .filter(
                Availability.employee_id.in_([e.employee_id for e in employees]),
                Availability.date >= start_date.date() if hasattr(start_date, 'date') else start_date,
                Availability.date <= end_date.date() if hasattr(end_date, 'date') else end_date,
            )
            .all()
        )
        avail_map = {}  # (employee_id, date) -> Availability
        for a in avail_records:
            avail_map[(a.employee_id, a.date)] = a

        # ── 7. Pre-load existing assignments for overlap/hours checks ───
        existing_assignments = (
            db.query(ShiftAssignment)
            .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
            .filter(
                ShiftAssignment.roster_id == roster_id,
                ShiftAssignment.status.notin_(["cancelled", "CANCELLED"]),
            )
            .all()
        )

        # Build per-employee shift time ranges for overlap detection
        emp_shift_times = defaultdict(list)  # employee_id -> [(start, end, shift_id)]
        shift_lookup = {s.shift_id: s for s in all_shifts}
        for sa in existing_assignments:
            s = shift_lookup.get(sa.shift_id)
            if s:
                emp_shift_times[sa.employee_id].append(
                    (s.start_time, s.end_time, s.shift_id)
                )

        # Build weekly hours per employee
        weekly_hours = defaultdict(float)  # (employee_id, iso_week) -> hours
        for sa in existing_assignments:
            s = shift_lookup.get(sa.shift_id)
            if s:
                hours = (s.end_time - s.start_time).total_seconds() / 3600
                iso_week = s.start_time.isocalendar()[1]
                weekly_hours[(sa.employee_id, iso_week)] += hours

        # Pre-load certifications
        cert_records = (
            db.query(Certification)
            .filter(Certification.employee_id.in_([e.employee_id for e in employees]))
            .all()
        )
        emp_certs = defaultdict(list)
        for c in cert_records:
            emp_certs[c.employee_id].append(c)

        # Get hourly rates for fit_score cost efficiency
        rates = [float(e.hourly_rate) for e in employees if e.hourly_rate]
        max_rate = max(rates) if rates else 100
        min_rate = min(rates) if rates else 0

        # Fairness: assignment counts per employee in this roster
        fairness_counts = defaultdict(int)
        for sa in existing_assignments:
            fairness_counts[sa.employee_id] += 1
        max_fairness = max(fairness_counts.values()) if fairness_counts else 1

        # ── 8. Blocker classification + feasibility matrix ──────────────
        BLOCKER_DESCRIPTIONS = {
            "skill_mismatch": "No employees with the required skill/role",
            "client_restriction": "Qualified employees are assigned to a different client",
            "unavailable": "Employees not available on this date/time",
            "time_conflict": "Employees already have an overlapping shift",
            "hours_exceeded": "Assigning would exceed the employee's weekly hour limit",
            "rest_violation": "Insufficient rest period between consecutive shifts",
            "psira_issue": "PSIRA certification expired, insufficient grade, or missing",
        }

        def check_skill(emp, shift):
            if not shift.required_skill:
                return True
            emp_role = emp.role.value.lower() if emp.role else ""
            req = shift.required_skill.lower()
            if emp_role == req:
                return True
            if emp_role == "armed" and req == "unarmed":
                return True
            if emp_role == "supervisor":
                return True
            return False

        def check_client(emp, shift):
            if emp.assigned_client_id is None:
                return True
            site = site_map.get(shift.site_id)
            if not site:
                return False
            return site.client_id == emp.assigned_client_id

        def check_availability(emp, shift):
            shift_date = shift.start_time.date()
            key = (emp.employee_id, shift_date)
            avail = avail_map.get(key)
            if not avail:
                return emp.shift_pattern_id is None  # No record: pattern=OFF, manual=available
            if not avail.available:
                return False
            shift_start = shift.start_time.time()
            shift_end = shift.end_time.time()
            if shift_end > shift_start:
                return avail.start_time <= shift_start and shift_end <= avail.end_time
            else:
                # Overnight shift
                if avail.start_time <= shift_start:
                    return True
            return False

        def check_overlap(emp, shift):
            for s_start, s_end, _ in emp_shift_times.get(emp.employee_id, []):
                if shift.start_time < s_end and shift.end_time > s_start:
                    return False
            return True

        def check_hours(emp, shift):
            shift_hours = (shift.end_time - shift.start_time).total_seconds() / 3600
            iso_week = shift.start_time.isocalendar()[1]
            current = weekly_hours.get((emp.employee_id, iso_week), 0)
            max_h = emp.max_hours_week if emp.max_hours_week else 48
            return (current + shift_hours) <= max_h

        def check_rest(emp, shift):
            min_rest = 12 * 3600  # 12 hours in seconds
            for s_start, s_end, _ in emp_shift_times.get(emp.employee_id, []):
                gap_before = (shift.start_time - s_end).total_seconds()
                gap_after = (s_start - shift.end_time).total_seconds()
                if 0 < gap_before < min_rest or 0 < gap_after < min_rest:
                    return False
            return True

        def check_psira(emp, shift):
            if not shift.required_psira_grade and not getattr(shift, 'requires_firearm', False):
                return True
            certs = emp_certs.get(emp.employee_id, [])
            shift_date = shift.start_time.date()
            # Check PSIRA grade
            if shift.required_psira_grade:
                grade_hierarchy = {"E": 1, "D": 2, "C": 3, "B": 4, "A": 5}
                required_val = grade_hierarchy.get(str(shift.required_psira_grade).replace("Grade ", "").replace("GRADE_", ""), 0)
                emp_grade = emp.psira_grade or ""
                emp_val = grade_hierarchy.get(emp_grade.replace("Grade ", ""), 0)
                if emp_val < required_val:
                    return False
            # Check expiry
            if emp.psira_expiry_date and emp.psira_expiry_date < shift_date:
                return False
            return True

        def classify_blocker(emp, shift):
            """Return the first HARD blocker category, or None if feasible."""
            if not check_skill(emp, shift):
                return "skill_mismatch"
            if not check_client(emp, shift):
                return "client_restriction"
            if not check_availability(emp, shift):
                return "unavailable"
            if not check_overlap(emp, shift):
                return "time_conflict"
            if not check_hours(emp, shift):
                return "hours_exceeded"
            if not check_rest(emp, shift):
                return "rest_violation"
            if not check_psira(emp, shift):
                return "psira_issue"
            return None

        def compute_fit_score(emp, shift):
            score = 0
            site = site_map.get(shift.site_id)
            site_client_id = site.client_id if site else None
            # Client match (+30)
            if site_client_id and emp.assigned_client_id == site_client_id:
                score += 30
            elif emp.assigned_client_id is None:
                score += 15
            # Role match (+20)
            emp_role = emp.role.value.lower() if emp.role else ""
            req = (shift.required_skill or "").lower()
            if req and emp_role == req:
                score += 20
            elif not req:
                score += 10
            # PSIRA grade (+15)
            grade_scores = {"Grade A": 15, "Grade B": 12, "Grade C": 9, "Grade D": 6, "Grade E": 3}
            if emp.psira_grade:
                score += grade_scores.get(emp.psira_grade, 5)
            # Cost efficiency (+15)
            if emp.hourly_rate and max_rate > min_rate:
                cost_score = 15 * (1 - (float(emp.hourly_rate) - min_rate) / (max_rate - min_rate))
                score += round(cost_score, 1)
            # No overlap (+10) — already checked, so always True here
            score += 10
            # Fairness (+10)
            emp_count = fairness_counts.get(emp.employee_id, 0)
            if max_fairness > 0:
                score += round(10 * (1 - emp_count / max(max_fairness, 1)), 1)
            return round(min(100, max(0, score)), 1)

        # ── Run the matrix ──────────────────────────────────────────────
        gap_slot_blockers = defaultdict(int)   # reason -> count of SLOTS blocked
        per_shift_diags = []
        quick_fill_all = []  # (shift_id, employee_id, fit_score)
        client_restriction_by_client = defaultdict(int)  # client_name -> shifts unlockable

        for shift, gap_count in unfilled_shifts:
            shift_blockers = defaultdict(int)
            feasible_candidates = []
            near_miss_candidates = []  # blocked by soft/fixable constraint

            for emp in employees:
                # Skip employees already assigned to this shift
                if any(sid == shift.shift_id for _, _, sid in emp_shift_times.get(emp.employee_id, [])):
                    continue

                blocker = classify_blocker(emp, shift)
                if blocker is None:
                    score = compute_fit_score(emp, shift)
                    feasible_candidates.append({
                        "employee_id": emp.employee_id,
                        "name": f"{emp.first_name} {emp.last_name}",
                        "blocker": None,
                        "fit_score": score,
                    })
                else:
                    shift_blockers[blocker] += 1
                    # Track near-miss candidates (client restriction is most fixable)
                    if blocker == "client_restriction":
                        score = compute_fit_score(emp, shift)
                        near_miss_candidates.append({
                            "employee_id": emp.employee_id,
                            "name": f"{emp.first_name} {emp.last_name}",
                            "blocker": blocker,
                            "fit_score": score,
                        })
                        site = site_map.get(shift.site_id)
                        if site and site.client_id:
                            cname = client_map.get(site.client_id, f"Client #{site.client_id}")
                            client_restriction_by_client[cname] += 1

            # Determine top blocker for this shift
            if shift_blockers:
                top_blocker = max(shift_blockers, key=shift_blockers.get)
            elif not feasible_candidates:
                top_blocker = "insufficient_staff"
            else:
                top_blocker = None  # Has feasible candidates

            # Aggregate ALL blocker encounters into gap_summary
            # This counts every (employee, shift) pair that was blocked,
            # giving a comprehensive view of what constraints are most restrictive.
            for blocker_reason, blocker_count in shift_blockers.items():
                gap_slot_blockers[blocker_reason] += blocker_count

            # Best candidates: top 3 feasible + top 2 near-miss
            feasible_sorted = sorted(feasible_candidates, key=lambda c: c["fit_score"], reverse=True)
            near_miss_sorted = sorted(near_miss_candidates, key=lambda c: c["fit_score"], reverse=True)
            best = feasible_sorted[:3] + near_miss_sorted[:2]

            # Add feasible candidates to quick_fill pool
            for fc in feasible_sorted[:gap_count]:
                quick_fill_all.append((shift.shift_id, fc["employee_id"], fc["fit_score"]))

            site = site_map.get(shift.site_id)
            site_name = site.site_name if site else f"Site #{shift.site_id}"
            client_name = client_map.get(site.client_id, "") if site and site.client_id else ""

            per_shift_diags.append({
                "shift_id": shift.shift_id,
                "site_name": site_name,
                "client_name": client_name,
                "date": shift.start_time.strftime("%Y-%m-%d"),
                "time": f"{shift.start_time.strftime('%H:%M')}-{shift.end_time.strftime('%H:%M')}",
                "required_skill": shift.required_skill,
                "gaps": gap_count,
                "top_blocker": top_blocker,
                "blocker_counts": dict(shift_blockers),
                "best_candidates": best[:5],
            })

        # ── 9. Build gap_summary ────────────────────────────────────────
        total_gap_slots = sum(g for _, g in unfilled_shifts)
        # Count quick-fillable slots separately
        quick_fill_shift_ids = set(sf for sf, _, _ in quick_fill_all)
        quick_fillable_slots = sum(
            g for s, g in unfilled_shifts if s.shift_id in quick_fill_shift_ids
        )
        blocked_slots = total_gap_slots - quick_fillable_slots

        gap_summary = []
        total_blocker_encounters = sum(gap_slot_blockers.values())
        for reason, count in sorted(gap_slot_blockers.items(), key=lambda x: x[1], reverse=True):
            pct = round((count / total_blocker_encounters) * 100, 1) if total_blocker_encounters > 0 else 0
            gap_summary.append({
                "reason": reason,
                "count": count,
                "pct": pct,
                "description": BLOCKER_DESCRIPTIONS.get(reason, reason),
            })

        # ── 10. Build recommendations ───────────────────────────────────
        recommendations = []

        # Quick-fill: deduplicate (employee can only fill one shift)
        used_employees = set()
        unique_quick_fills = []
        for sf_id, emp_id, score in sorted(quick_fill_all, key=lambda x: x[2], reverse=True):
            if emp_id not in used_employees:
                unique_quick_fills.append({"shift_id": sf_id, "employee_id": emp_id})
                used_employees.add(emp_id)
            if len(unique_quick_fills) >= 50:
                break

        if unique_quick_fills:
            recommendations.append({
                "type": "quick_fill",
                "priority": "high",
                "impact": len(unique_quick_fills),
                "message": f"{len(unique_quick_fills)} shifts can be auto-filled right now with available guards",
                "action": {"assignments": unique_quick_fills},
            })

        # Relax client assignment
        for cname, count in sorted(client_restriction_by_client.items(), key=lambda x: x[1], reverse=True)[:3]:
            if count >= 3:
                recommendations.append({
                    "type": "relax_constraint",
                    "priority": "high",
                    "impact": count,
                    "message": f"Relax client assignment for {cname} — {count} extra guard-slots become fillable",
                    "action": None,
                })

        # Hire recommendation: group skill deficits
        skill_demand = defaultdict(float)   # required_skill -> total hours needed
        skill_supply = defaultdict(float)   # required_skill -> total available hours
        for shift, gap in unfilled_shifts:
            skill = shift.required_skill or "general"
            hours = (shift.end_time - shift.start_time).total_seconds() / 3600
            skill_demand[skill] += hours * gap
        for emp in employees:
            emp_role = emp.role.value.lower() if emp.role else "general"
            max_h = emp.max_hours_week if emp.max_hours_week else 48
            # Approximate weekly capacity minus already assigned
            total_assigned = sum(
                (s_end - s_start).total_seconds() / 3600
                for s_start, s_end, _ in emp_shift_times.get(emp.employee_id, [])
            )
            remaining = max(0, max_h - total_assigned)
            skill_supply[emp_role] += remaining
            # Armed can do unarmed, supervisor can do any
            if emp_role == "armed":
                skill_supply["unarmed"] += remaining
            if emp_role == "supervisor":
                for sk in skill_demand:
                    skill_supply[sk] += remaining

        for skill, demand_hours in sorted(skill_demand.items(), key=lambda x: x[1], reverse=True):
            supply = skill_supply.get(skill, 0)
            deficit = demand_hours - supply
            if deficit > 0:
                headcount = math.ceil(deficit / 48)
                shift_impact = sum(
                    g for s, g in unfilled_shifts
                    if (s.required_skill or "general").lower() == skill
                )
                recommendations.append({
                    "type": "hire",
                    "priority": "critical",
                    "impact": min(shift_impact, headcount * 7),
                    "message": f"Hire {headcount} {skill.title()} guard{'s' if headcount > 1 else ''} — {round(deficit)}h of unfilled {skill} demand this period",
                    "action": None,
                })

        # Sort recommendations by priority then impact
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        recommendations.sort(key=lambda r: (priority_order.get(r["priority"], 9), -r["impact"]))

        # Sort diagnostics by gap count descending
        per_shift_diags.sort(key=lambda d: d["gaps"], reverse=True)

        elapsed = (_time.time() - t0) * 1000
        return {
            "roster_id": roster_id,
            "analysis_time_ms": round(elapsed),
            "unfilled_count": len(unfilled_shifts),
            "total_gap_slots": total_gap_slots,
            "gap_summary": gap_summary,
            "recommendations": recommendations,
            "per_shift_diagnostics": per_shift_diags[:100],  # Limit to top 100
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error computing gap insights: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/saved/{roster_id}/assign")
async def manual_assign(
    roster_id: int,
    assign_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually assign an employee to a shift within a roster.

    Args:
        roster_id: Roster ID (must be draft)
        assign_data: {"shift_id": int, "employee_id": int}

    Validates roster ownership, draft status, duplicate assignment,
    and runs a basic BCEA weekly hours check (<48h).
    """
    from app.models.roster import Roster
    from app.models.shift_assignment import ShiftAssignment
    from sqlalchemy import func

    try:
        org_id = current_user.org_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must belong to an organization"
            )

        shift_id = assign_data.get("shift_id")
        employee_id = assign_data.get("employee_id")

        if not shift_id or not employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="shift_id and employee_id are required"
            )

        # Verify roster belongs to org and is draft
        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster with ID {roster_id} not found"
            )
        if roster.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only assign shifts in draft rosters"
            )

        # Verify shift belongs to org
        shift = db.query(Shift).filter(
            Shift.shift_id == shift_id,
            Shift.org_id == org_id
        ).first()
        if not shift:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shift with ID {shift_id} not found"
            )

        # Check if already assigned
        existing = db.query(ShiftAssignment).filter(
            ShiftAssignment.shift_id == shift_id,
            ShiftAssignment.employee_id == employee_id,
            ShiftAssignment.roster_id == roster_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee is already assigned to this shift in this roster"
            )

        # ── BCEA & qualification constraint checks ──
        from app.models.employee import Employee
        from app.models.certification import PSIRAGrade, Certification
        from datetime import date as date_type

        warnings = []
        errors = []

        # Load the employee once for all checks
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with ID {employee_id} not found"
            )

        # 1. Check shift capacity (required_staff vs current assignments)
        current_assigned = db.query(ShiftAssignment).filter(
            ShiftAssignment.shift_id == shift_id,
            ShiftAssignment.status.notin_(["cancelled"])
        ).count()
        if current_assigned >= shift.required_staff:
            errors.append(
                f"Shift is already fully staffed ({current_assigned}/{shift.required_staff})"
            )

        # 2. BCEA weekly hours check
        shift_date = shift.start_time.date() if shift.start_time else None
        if shift_date:
            week_start = shift_date - timedelta(days=shift_date.weekday())
            week_end = week_start + timedelta(days=7)

            existing_hours = db.query(func.coalesce(func.sum(ShiftAssignment.regular_hours), 0)).join(
                Shift, ShiftAssignment.shift_id == Shift.shift_id
            ).filter(
                ShiftAssignment.employee_id == employee_id,
                Shift.start_time >= datetime.combine(week_start, datetime.min.time()),
                Shift.start_time < datetime.combine(week_end, datetime.min.time()),
            ).scalar() or 0

            new_hours = shift.paid_hours
            total_weekly = float(existing_hours) + new_hours

            if total_weekly > 48:
                warnings.append(
                    f"BCEA warning: employee will have {total_weekly:.1f} hours this week "
                    f"(limit is 48h). Current: {float(existing_hours):.1f}h + new: {new_hours:.1f}h."
                )

        # 3. Check rest period (min 8h between shifts — BCEA requirement)
        # Check gap from previous shift ending to this shift starting
        prev_assignment = db.query(ShiftAssignment).join(Shift).filter(
            ShiftAssignment.employee_id == employee_id,
            ShiftAssignment.status.notin_(["cancelled"]),
            Shift.end_time <= shift.start_time,
            Shift.end_time >= shift.start_time - timedelta(hours=24)
        ).order_by(Shift.end_time.desc()).first()

        if prev_assignment:
            prev_shift = prev_assignment.shift
            rest_gap = (shift.start_time - prev_shift.end_time).total_seconds() / 3600
            if rest_gap < 8:
                warnings.append(
                    f"Only {rest_gap:.1f}h rest period before this shift (BCEA requires minimum 8h)"
                )

        # Check gap from this shift ending to next shift starting
        next_assignment = db.query(ShiftAssignment).join(Shift).filter(
            ShiftAssignment.employee_id == employee_id,
            ShiftAssignment.status.notin_(["cancelled"]),
            Shift.start_time >= shift.end_time,
            Shift.start_time <= shift.end_time + timedelta(hours=24)
        ).order_by(Shift.start_time.asc()).first()

        if next_assignment:
            next_shift = next_assignment.shift
            rest_gap = (next_shift.start_time - shift.end_time).total_seconds() / 3600
            if rest_gap < 8:
                warnings.append(
                    f"Only {rest_gap:.1f}h until next shift (BCEA requires minimum 8h)"
                )

        # 4. Check consecutive work days (BCEA max 6 consecutive days)
        if shift_date:
            consecutive_before = 0
            check_date = shift_date - timedelta(days=1)
            while consecutive_before < 7:
                has_shift = db.query(ShiftAssignment).join(Shift).filter(
                    ShiftAssignment.employee_id == employee_id,
                    ShiftAssignment.status.notin_(["cancelled"]),
                    func.date(Shift.start_time) == check_date
                ).first()
                if has_shift:
                    consecutive_before += 1
                    check_date -= timedelta(days=1)
                else:
                    break

            consecutive_after = 0
            check_date = shift_date + timedelta(days=1)
            while consecutive_after < 7:
                has_shift = db.query(ShiftAssignment).join(Shift).filter(
                    ShiftAssignment.employee_id == employee_id,
                    ShiftAssignment.status.notin_(["cancelled"]),
                    func.date(Shift.start_time) == check_date
                ).first()
                if has_shift:
                    consecutive_after += 1
                    check_date += timedelta(days=1)
                else:
                    break

            total_consecutive = consecutive_before + 1 + consecutive_after
            if total_consecutive > 6:
                warnings.append(
                    f"Would result in {total_consecutive} consecutive work days (BCEA max is 6)"
                )

        # 5. Check PSIRA grade requirement
        if shift.required_psira_grade:
            # Employee psira_grade is stored as a plain string ("A", "B", etc.)
            # Convert to PSIRAGrade enum for comparison
            grade_map = {"A": PSIRAGrade.GRADE_A, "B": PSIRAGrade.GRADE_B, "C": PSIRAGrade.GRADE_C, "D": PSIRAGrade.GRADE_D, "E": PSIRAGrade.GRADE_E}
            emp_psira_enum = grade_map.get(employee.psira_grade) if employee.psira_grade else None
            if not emp_psira_enum or not PSIRAGrade.can_work_grade(emp_psira_enum, shift.required_psira_grade):
                emp_display = employee.psira_grade or "None"
                req_display = shift.required_psira_grade.value if shift.required_psira_grade else "Unknown"
                warnings.append(
                    f"Employee PSIRA grade ({emp_display}) below required ({req_display})"
                )

        # 6. Check firearm competency
        if shift.requires_firearm:
            has_firearm_cert = db.query(Certification).filter(
                Certification.employee_id == employee_id,
                Certification.firearm_competency.isnot(None),
                Certification.expiry_date >= date_type.today()
            ).first()
            if not has_firearm_cert:
                warnings.append("Employee lacks valid firearm competency certification")

        # If there are blocking errors, reject the assignment
        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"errors": errors, "warnings": warnings}
            )

        # Create assignment
        assignment = ShiftAssignment(
            shift_id=shift_id,
            employee_id=employee_id,
            roster_id=roster_id,
            status="pending",
            regular_hours=shift.paid_hours,
            assigned_by=current_user.user_id,
        )
        db.add(assignment)

        # Update roster counts
        roster.assigned_shifts = (roster.assigned_shifts or 0) + 1
        roster.unassigned_shifts = max(0, (roster.unassigned_shifts or 0) - 1)

        db.commit()
        db.refresh(assignment)

        # Audit trail
        AuditService.log_change(
            db=db, org_id=org_id, entity_type="assignment", entity_id=assignment.assignment_id,
            action="create", changes={
                "roster_id": roster_id,
                "shift_id": shift_id,
                "employee_id": employee_id,
            },
            user_id=current_user.user_id, user_email=current_user.email
        )
        db.commit()

        # Create snapshot for version history
        _create_roster_snapshot(db, roster, current_user.user_id, label="Manual assignment")
        db.commit()

        return {
            "success": True,
            "assignment_id": assignment.assignment_id,
            "shift_id": shift_id,
            "employee_id": employee_id,
            "roster_id": roster_id,
            "status": assignment.status,
            "regular_hours": assignment.regular_hours,
            "warnings": warnings,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error assigning shift: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error assigning shift: {str(e)}"
        )


@router.post("/saved/{roster_id}/bulk-assign")
async def bulk_assign(
    roster_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Bulk assign multiple employees to shifts in a single transaction.
    Used by the auto-fill feature. Skips duplicates and full shifts silently.

    Args:
        roster_id: Roster ID (must be draft)
        data: {"assignments": [{"shift_id": int, "employee_id": int}, ...]}

    Returns:
        {"assigned": int, "skipped": int, "errors": [str]}
    """
    from app.models.roster import Roster
    from app.models.shift_assignment import ShiftAssignment
    from app.models.employee import Employee

    try:
        org_id = current_user.org_id
        if not org_id:
            raise HTTPException(status_code=400, detail="User must belong to an organization")

        assignments_list = data.get("assignments", [])
        if not assignments_list:
            return {"assigned": 0, "skipped": 0, "errors": []}

        # Verify roster
        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id,
        ).first()
        if not roster:
            raise HTTPException(status_code=404, detail="Roster not found")
        if roster.status != "draft":
            raise HTTPException(status_code=400, detail="Can only assign in draft rosters")

        # Pre-load shifts and employees for this org
        shift_ids = list({a["shift_id"] for a in assignments_list})
        shifts_map = {
            s.shift_id: s
            for s in db.query(Shift).filter(Shift.shift_id.in_(shift_ids), Shift.org_id == org_id).all()
        }

        emp_ids = list({a["employee_id"] for a in assignments_list})
        emps_map = {
            e.employee_id: e
            for e in db.query(Employee).filter(Employee.employee_id.in_(emp_ids), Employee.org_id == org_id).all()
        }

        # Pre-load existing assignments to skip duplicates
        existing = set(
            (sa.shift_id, sa.employee_id)
            for sa in db.query(ShiftAssignment.shift_id, ShiftAssignment.employee_id).filter(
                ShiftAssignment.roster_id == roster_id,
                ShiftAssignment.shift_id.in_(shift_ids),
            ).all()
        )

        # Count current assignments per shift for capacity check
        from sqlalchemy import func
        capacity_counts = dict(
            db.query(ShiftAssignment.shift_id, func.count(ShiftAssignment.assignment_id))
            .filter(
                ShiftAssignment.shift_id.in_(shift_ids),
                ShiftAssignment.status.notin_(["cancelled"]),
            )
            .group_by(ShiftAssignment.shift_id)
            .all()
        )

        assigned_count = 0
        skipped_count = 0
        errors = []

        for item in assignments_list:
            sid = item.get("shift_id")
            eid = item.get("employee_id")

            if not sid or not eid:
                skipped_count += 1
                continue

            # Skip if already assigned
            if (sid, eid) in existing:
                skipped_count += 1
                continue

            shift = shifts_map.get(sid)
            emp = emps_map.get(eid)
            if not shift or not emp:
                skipped_count += 1
                continue

            # Skip if shift full
            current_count = capacity_counts.get(sid, 0)
            if current_count >= shift.required_staff:
                skipped_count += 1
                continue

            # Create assignment
            assignment = ShiftAssignment(
                shift_id=sid,
                employee_id=eid,
                roster_id=roster_id,
                status="pending",
                regular_hours=shift.paid_hours,
                assigned_by=current_user.user_id,
            )
            db.add(assignment)
            existing.add((sid, eid))
            capacity_counts[sid] = current_count + 1
            assigned_count += 1

        # Update roster counts
        if assigned_count > 0:
            roster.assigned_shifts = (roster.assigned_shifts or 0) + assigned_count
            roster.unassigned_shifts = max(0, (roster.unassigned_shifts or 0) - assigned_count)

            db.commit()

            # Single audit entry for bulk
            AuditService.log_change(
                db=db, org_id=org_id, entity_type="roster", entity_id=roster_id,
                action="bulk_assign",
                changes={"assigned": assigned_count, "skipped": skipped_count},
                user_id=current_user.user_id, user_email=current_user.email,
            )
            db.commit()

            # Single snapshot
            _create_roster_snapshot(db, roster, current_user.user_id, label=f"Bulk assign ({assigned_count})")
            db.commit()

        return {"assigned": assigned_count, "skipped": skipped_count, "errors": errors}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error bulk assigning: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/saved/{roster_id}/unassign")
async def manual_unassign(
    roster_id: int,
    unassign_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a shift assignment from a roster.

    Args:
        roster_id: Roster ID (must be draft)
        unassign_data: {"assignment_id": int}
    """
    from app.models.roster import Roster
    from app.models.shift_assignment import ShiftAssignment

    try:
        org_id = current_user.org_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must belong to an organization"
            )

        assignment_id = unassign_data.get("assignment_id")
        if not assignment_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="assignment_id is required"
            )

        # Verify roster belongs to org and is draft
        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster with ID {roster_id} not found"
            )
        if roster.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only unassign shifts in draft rosters"
            )

        # Find the assignment
        assignment = db.query(ShiftAssignment).filter(
            ShiftAssignment.assignment_id == assignment_id,
            ShiftAssignment.roster_id == roster_id
        ).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment with ID {assignment_id} not found in roster {roster_id}"
            )

        removed_shift_id = assignment.shift_id
        removed_employee_id = assignment.employee_id

        # Audit trail (before delete so we can capture the data)
        AuditService.log_change(
            db=db, org_id=org_id, entity_type="assignment", entity_id=assignment_id,
            action="delete", changes={
                "roster_id": roster_id,
                "shift_id": removed_shift_id,
                "employee_id": removed_employee_id,
            },
            user_id=current_user.user_id, user_email=current_user.email
        )

        db.delete(assignment)

        # Update roster counts
        roster.assigned_shifts = max(0, (roster.assigned_shifts or 0) - 1)
        roster.unassigned_shifts = (roster.unassigned_shifts or 0) + 1

        db.commit()

        # Create snapshot for version history
        _create_roster_snapshot(db, roster, current_user.user_id, label="Unassignment")
        db.commit()

        return {
            "success": True,
            "message": f"Assignment {assignment_id} removed from roster {roster_id}",
            "removed": {
                "assignment_id": assignment_id,
                "shift_id": removed_shift_id,
                "employee_id": removed_employee_id,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error unassigning shift: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error unassigning shift: {str(e)}"
        )


@router.post("/saved/{roster_id}/swap")
async def swap_assignments(
    roster_id: int,
    swap_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Swap employee_ids between two assignments in a roster.

    Args:
        roster_id: Roster ID (must be draft)
        swap_data: {"assignment_id_a": int, "assignment_id_b": int}
    """
    from app.models.roster import Roster
    from app.models.shift_assignment import ShiftAssignment
    from app.models.employee import Employee
    from app.models.certification import PSIRAGrade, Certification
    from datetime import date as date_type

    try:
        org_id = current_user.org_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must belong to an organization"
            )

        assignment_id_a = swap_data.get("assignment_id_a")
        assignment_id_b = swap_data.get("assignment_id_b")

        if not assignment_id_a or not assignment_id_b:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="assignment_id_a and assignment_id_b are required"
            )

        if assignment_id_a == assignment_id_b:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot swap an assignment with itself"
            )

        # Verify roster belongs to org and is draft
        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roster with ID {roster_id} not found"
            )
        if roster.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only swap assignments in draft rosters"
            )

        # Load both assignments
        assignment_a = db.query(ShiftAssignment).filter(
            ShiftAssignment.assignment_id == assignment_id_a,
            ShiftAssignment.roster_id == roster_id
        ).first()
        assignment_b = db.query(ShiftAssignment).filter(
            ShiftAssignment.assignment_id == assignment_id_b,
            ShiftAssignment.roster_id == roster_id
        ).first()

        if not assignment_a:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment {assignment_id_a} not found in roster {roster_id}"
            )
        if not assignment_b:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment {assignment_id_b} not found in roster {roster_id}"
            )

        # ── BCEA & qualification constraint checks for swap ──
        # Validate BOTH directions: Emp A -> Shift B, Emp B -> Shift A
        old_emp_a = assignment_a.employee_id
        old_emp_b = assignment_b.employee_id

        shift_a = assignment_a.shift
        shift_b = assignment_b.shift

        employee_a = db.query(Employee).filter(Employee.employee_id == old_emp_a).first()
        employee_b = db.query(Employee).filter(Employee.employee_id == old_emp_b).first()

        warnings = []
        grade_map = {"A": PSIRAGrade.GRADE_A, "B": PSIRAGrade.GRADE_B, "C": PSIRAGrade.GRADE_C, "D": PSIRAGrade.GRADE_D, "E": PSIRAGrade.GRADE_E}

        def _check_swap_qualifications(employee, target_shift, label):
            """Check if an employee is qualified for the target shift after swap."""
            swap_warnings = []

            # PSIRA grade check
            if target_shift.required_psira_grade and employee:
                emp_psira_enum = grade_map.get(employee.psira_grade) if employee.psira_grade else None
                if not emp_psira_enum or not PSIRAGrade.can_work_grade(emp_psira_enum, target_shift.required_psira_grade):
                    emp_display = employee.psira_grade or "None"
                    req_display = target_shift.required_psira_grade.value
                    swap_warnings.append(
                        f"{label}: PSIRA grade ({emp_display}) below required ({req_display})"
                    )

            # Firearm competency check
            if target_shift.requires_firearm and employee:
                has_firearm_cert = db.query(Certification).filter(
                    Certification.employee_id == employee.employee_id,
                    Certification.firearm_competency.isnot(None),
                    Certification.expiry_date >= date_type.today()
                ).first()
                if not has_firearm_cert:
                    swap_warnings.append(
                        f"{label}: lacks valid firearm competency certification"
                    )

            return swap_warnings

        def _check_swap_rest_periods(employee_id, target_shift, current_assignment_id, label):
            """Check rest periods for an employee on the target shift, ignoring the assignment being swapped."""
            swap_warnings = []

            # Check gap from previous shift to target shift
            prev_assignment = db.query(ShiftAssignment).join(Shift).filter(
                ShiftAssignment.employee_id == employee_id,
                ShiftAssignment.assignment_id != current_assignment_id,
                ShiftAssignment.status.notin_(["cancelled"]),
                Shift.end_time <= target_shift.start_time,
                Shift.end_time >= target_shift.start_time - timedelta(hours=24)
            ).order_by(Shift.end_time.desc()).first()

            if prev_assignment:
                prev_shift = prev_assignment.shift
                rest_gap = (target_shift.start_time - prev_shift.end_time).total_seconds() / 3600
                if rest_gap < 8:
                    swap_warnings.append(
                        f"{label}: only {rest_gap:.1f}h rest before shift (BCEA requires minimum 8h)"
                    )

            # Check gap from target shift to next shift
            next_assignment = db.query(ShiftAssignment).join(Shift).filter(
                ShiftAssignment.employee_id == employee_id,
                ShiftAssignment.assignment_id != current_assignment_id,
                ShiftAssignment.status.notin_(["cancelled"]),
                Shift.start_time >= target_shift.end_time,
                Shift.start_time <= target_shift.end_time + timedelta(hours=24)
            ).order_by(Shift.start_time.asc()).first()

            if next_assignment:
                next_shift = next_assignment.shift
                rest_gap = (next_shift.start_time - target_shift.end_time).total_seconds() / 3600
                if rest_gap < 8:
                    swap_warnings.append(
                        f"{label}: only {rest_gap:.1f}h rest after shift (BCEA requires minimum 8h)"
                    )

            return swap_warnings

        # Direction 1: Employee A -> Shift B
        if employee_a and shift_b:
            label_a = f"Employee {old_emp_a} -> Shift {shift_b.shift_id}"
            warnings.extend(_check_swap_qualifications(employee_a, shift_b, label_a))
            warnings.extend(_check_swap_rest_periods(old_emp_a, shift_b, assignment_a.assignment_id, label_a))

        # Direction 2: Employee B -> Shift A
        if employee_b and shift_a:
            label_b = f"Employee {old_emp_b} -> Shift {shift_a.shift_id}"
            warnings.extend(_check_swap_qualifications(employee_b, shift_a, label_b))
            warnings.extend(_check_swap_rest_periods(old_emp_b, shift_a, assignment_b.assignment_id, label_b))

        # Execute the swap (warnings are informational, not blocking)
        assignment_a.employee_id = old_emp_b
        assignment_b.employee_id = old_emp_a

        db.commit()

        # Audit trail
        AuditService.log_change(
            db=db, org_id=org_id, entity_type="assignment", entity_id=assignment_id_a,
            action="swap", changes={
                "roster_id": roster_id,
                "swapped_with": assignment_id_b,
                "old_employee_id": old_emp_a,
                "new_employee_id": old_emp_b,
            },
            user_id=current_user.user_id, user_email=current_user.email
        )
        AuditService.log_change(
            db=db, org_id=org_id, entity_type="assignment", entity_id=assignment_id_b,
            action="swap", changes={
                "roster_id": roster_id,
                "swapped_with": assignment_id_a,
                "old_employee_id": old_emp_b,
                "new_employee_id": old_emp_a,
            },
            user_id=current_user.user_id, user_email=current_user.email
        )
        db.commit()

        # Create snapshot for version history
        _create_roster_snapshot(db, roster, current_user.user_id, label="Swap")
        db.commit()

        return {
            "success": True,
            "message": "Assignments swapped successfully",
            "warnings": warnings,
            "swap": {
                "assignment_a": {
                    "assignment_id": assignment_id_a,
                    "old_employee_id": old_emp_a,
                    "new_employee_id": old_emp_b,
                },
                "assignment_b": {
                    "assignment_id": assignment_id_b,
                    "old_employee_id": old_emp_b,
                    "new_employee_id": old_emp_a,
                },
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error swapping assignments: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error swapping assignments: {str(e)}"
        )


@router.post("/saved/{roster_id}/rollback/{snapshot_id}")
async def rollback_roster(
    roster_id: int,
    snapshot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rollback a roster to a previous snapshot version.

    Deletes all current assignments, recreates from snapshot_data,
    creates a new snapshot (version bump), and logs the audit trail.
    """
    from app.models.roster import Roster
    from app.models.roster_snapshot import RosterSnapshot
    from app.models.shift_assignment import ShiftAssignment

    try:
        org_id = current_user.org_id
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must belong to an organization"
            )

        # Verify roster belongs to org
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
                detail="Cannot rollback a published roster. Archive it first."
            )

        # Load the target snapshot
        snapshot = db.query(RosterSnapshot).filter(
            RosterSnapshot.snapshot_id == snapshot_id,
            RosterSnapshot.roster_id == roster_id
        ).first()
        if not snapshot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Snapshot {snapshot_id} not found for roster {roster_id}"
            )

        # Use a savepoint so that if recreate fails after delete, data is not lost
        try:
            savepoint = db.begin_nested()

            # Create a snapshot of the CURRENT state before rollback
            _create_roster_snapshot(db, roster, current_user.user_id, label="Before rollback")

            # Delete all current assignments for this roster
            db.query(ShiftAssignment).filter(
                ShiftAssignment.roster_id == roster_id
            ).delete(synchronize_session="fetch")

            # Recreate assignments from snapshot data
            snapshot_assignments = snapshot.snapshot_data.get("assignments", [])
            restored_count = 0

            for sa_data in snapshot_assignments:
                new_assignment = ShiftAssignment(
                    shift_id=sa_data.get("shift_id"),
                    employee_id=sa_data.get("employee_id"),
                    roster_id=roster_id,
                    status=sa_data.get("status", "pending"),
                    regular_hours=sa_data.get("regular_hours", 0),
                )
                db.add(new_assignment)
                restored_count += 1

            # Update roster stats from snapshot
            roster.total_shifts = snapshot.snapshot_data.get("total_shifts", roster.total_shifts)
            roster.assigned_shifts = snapshot.snapshot_data.get("assigned_shifts", restored_count)
            roster.unassigned_shifts = max(0, roster.total_shifts - roster.assigned_shifts)

            # Create a new snapshot for the rollback state
            rollback_snapshot = _create_roster_snapshot(
                db, roster, current_user.user_id,
                label=f"Rollback to v{snapshot.version}"
            )

            savepoint.commit()
        except Exception as e:
            savepoint.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Rollback failed: {str(e)}"
            )

        db.commit()

        # Audit trail
        AuditService.log_change(
            db=db, org_id=org_id, entity_type="roster", entity_id=roster_id,
            action="rollback", changes={
                "rollback_to_snapshot_id": snapshot_id,
                "rollback_to_version": snapshot.version,
                "assignments_restored": restored_count,
                "new_version": rollback_snapshot.version,
            },
            user_id=current_user.user_id, user_email=current_user.email
        )
        db.commit()

        logger.info(f"Roster {roster_id} rolled back to snapshot {snapshot_id} (v{snapshot.version})")

        return {
            "success": True,
            "roster_id": roster_id,
            "rolled_back_to": {
                "snapshot_id": snapshot_id,
                "version": snapshot.version,
            },
            "new_version": rollback_snapshot.version,
            "assignments_restored": restored_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error rolling back roster: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rolling back roster: {str(e)}"
        )
