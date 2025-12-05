"""Organization settings endpoints for client management mode and default hourly rates."""

from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.organization import Organization
from app.models.client import Client
from app.models.default_hourly_rate import DefaultHourlyRate
from app.models.employee import Employee
from app.auth.security import get_current_org_id

router = APIRouter()


# Pydantic schemas
class ClientManagementSettingsResponse(BaseModel):
    """Response schema for client management settings."""
    mode: str  # 'all' or 'selected'
    managed_client_ids: List[int]
    available_clients: List[dict]

    class Config:
        from_attributes = True


class ClientManagementSettingsRequest(BaseModel):
    """Request schema for updating client management settings."""
    mode: str  # 'all' or 'selected'
    client_ids: Optional[List[int]] = None


class ClientOption(BaseModel):
    """Schema for client selection options."""
    client_id: int
    client_name: str
    site_count: int


# Endpoints
@router.get("/client-management", response_model=ClientManagementSettingsResponse)
async def get_client_management_settings(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get the current client management settings for the organization.
    Returns the mode ('all' or 'selected') and list of managed client IDs.
    """
    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get all available clients for this organization
    clients = db.query(Client).filter(Client.org_id == org_id).all()

    # Build available clients list with site counts
    available_clients = []
    for client in clients:
        site_count = len(client.sites) if hasattr(client, 'sites') else 0
        available_clients.append({
            "client_id": client.client_id,
            "client_name": client.client_name,
            "site_count": site_count,
            "status": client.status
        })

    return {
        "mode": org.client_management_mode or 'all',
        "managed_client_ids": org.managed_client_ids or [],
        "available_clients": available_clients
    }


@router.put("/client-management")
async def update_client_management_settings(
    request: ClientManagementSettingsRequest,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Update the client management settings for the organization.

    Args:
        mode: 'all' for all clients, 'selected' for specific clients only
        client_ids: List of client IDs when mode='selected'
    """
    # Validate mode
    if request.mode not in ['all', 'selected']:
        raise HTTPException(
            status_code=400,
            detail="Mode must be 'all' or 'selected'"
        )

    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # If mode is 'selected', validate client IDs belong to this org
    if request.mode == 'selected':
        if not request.client_ids:
            raise HTTPException(
                status_code=400,
                detail="client_ids is required when mode is 'selected'"
            )

        # Verify all client_ids belong to this organization
        valid_clients = db.query(Client.client_id).filter(
            Client.org_id == org_id,
            Client.client_id.in_(request.client_ids)
        ).all()
        valid_client_ids = [c.client_id for c in valid_clients]

        invalid_ids = set(request.client_ids) - set(valid_client_ids)
        if invalid_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid client IDs for this organization: {list(invalid_ids)}"
            )

        org.client_management_mode = 'selected'
        org.managed_client_ids = request.client_ids
    else:
        # Mode is 'all' - clear managed_client_ids
        org.client_management_mode = 'all'
        org.managed_client_ids = None

    db.commit()
    db.refresh(org)

    return {
        "message": "Client management settings updated successfully",
        "mode": org.client_management_mode,
        "managed_client_ids": org.managed_client_ids or []
    }


@router.get("/client-management/mode")
async def get_client_management_mode(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get just the client management mode (lightweight endpoint).
    """
    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {
        "mode": org.client_management_mode or 'all',
        "has_client_filter": org.client_management_mode == 'selected' and bool(org.managed_client_ids)
    }


# ==================== DEFAULT HOURLY RATES ====================

# Schemas for hourly rates
class HourlyRateEntry(BaseModel):
    """Schema for a single hourly rate entry."""
    psira_grade: str  # A, B, C, D, E
    role: str  # armed, unarmed, supervisor
    default_hourly_rate: float

    class Config:
        from_attributes = True


class HourlyRatesResponse(BaseModel):
    """Response schema for all hourly rates."""
    rates: List[HourlyRateEntry]
    has_rates: bool


class HourlyRatesUpdateRequest(BaseModel):
    """Request schema for updating hourly rates."""
    rates: List[HourlyRateEntry]


class ApplyRatesRequest(BaseModel):
    """Request schema for applying default rates to guards."""
    employee_ids: Optional[List[int]] = None  # None = all guards with missing rates
    overwrite_existing: bool = False


# PSIRA Grades and roles constants
PSIRA_GRADES = ['A', 'B', 'C', 'D', 'E']
EMPLOYEE_ROLES = ['armed', 'unarmed', 'supervisor']


@router.get("/hourly-rates", response_model=HourlyRatesResponse)
async def get_default_hourly_rates(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get all default hourly rates for the organization.
    Returns rates organized by PSIRA grade and role.
    """
    rates = db.query(DefaultHourlyRate).filter(
        DefaultHourlyRate.org_id == org_id
    ).all()

    rate_list = [
        HourlyRateEntry(
            psira_grade=r.psira_grade,
            role=r.role,
            default_hourly_rate=float(r.default_hourly_rate)
        )
        for r in rates
    ]

    return {
        "rates": rate_list,
        "has_rates": len(rate_list) > 0
    }


@router.put("/hourly-rates")
async def update_default_hourly_rates(
    request: HourlyRatesUpdateRequest,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Update default hourly rates for the organization.
    Replaces all existing rates with the provided ones.
    """
    # Validate entries
    for entry in request.rates:
        if entry.psira_grade not in PSIRA_GRADES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid PSIRA grade: {entry.psira_grade}. Must be one of {PSIRA_GRADES}"
            )
        if entry.role not in EMPLOYEE_ROLES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role: {entry.role}. Must be one of {EMPLOYEE_ROLES}"
            )
        if entry.default_hourly_rate < 0:
            raise HTTPException(
                status_code=400,
                detail="Hourly rate cannot be negative"
            )

    # Delete existing rates for this org
    db.query(DefaultHourlyRate).filter(DefaultHourlyRate.org_id == org_id).delete()

    # Insert new rates
    for entry in request.rates:
        new_rate = DefaultHourlyRate(
            org_id=org_id,
            psira_grade=entry.psira_grade,
            role=entry.role,
            default_hourly_rate=Decimal(str(entry.default_hourly_rate))
        )
        db.add(new_rate)

    db.commit()

    return {
        "message": f"Successfully updated {len(request.rates)} hourly rate entries",
        "rates_count": len(request.rates)
    }


@router.get("/hourly-rates/lookup")
async def lookup_hourly_rate(
    psira_grade: str,
    role: str,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Look up the default hourly rate for a specific PSIRA grade and role.
    Used when creating/editing employees to auto-populate the hourly rate.
    """
    rate = db.query(DefaultHourlyRate).filter(
        DefaultHourlyRate.org_id == org_id,
        DefaultHourlyRate.psira_grade == psira_grade.upper(),
        DefaultHourlyRate.role == role.lower()
    ).first()

    if rate:
        return {
            "found": True,
            "default_hourly_rate": float(rate.default_hourly_rate),
            "psira_grade": rate.psira_grade,
            "role": rate.role
        }
    else:
        return {
            "found": False,
            "default_hourly_rate": None,
            "psira_grade": psira_grade,
            "role": role
        }


@router.post("/hourly-rates/apply")
async def apply_default_rates_to_employees(
    request: ApplyRatesRequest,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Apply default hourly rates to employees based on their PSIRA grade and role.

    If employee_ids is provided, only those employees will be updated.
    If employee_ids is None/empty, all employees with missing rates (hourly_rate=0 or NULL) will be updated.

    Set overwrite_existing=True to update even employees that already have a rate.
    """
    # Get all default rates for this org
    default_rates = db.query(DefaultHourlyRate).filter(
        DefaultHourlyRate.org_id == org_id
    ).all()

    if not default_rates:
        raise HTTPException(
            status_code=400,
            detail="No default hourly rates configured. Please set up default rates first."
        )

    # Build lookup dict
    rate_lookup = {}
    for r in default_rates:
        key = (r.psira_grade.upper(), r.role.lower())
        rate_lookup[key] = float(r.default_hourly_rate)

    # Build employee query
    query = db.query(Employee).filter(Employee.org_id == org_id)

    if request.employee_ids:
        query = query.filter(Employee.employee_id.in_(request.employee_ids))

    if not request.overwrite_existing:
        # Only update employees without rates
        from sqlalchemy import or_
        query = query.filter(
            or_(Employee.hourly_rate.is_(None), Employee.hourly_rate == 0)
        )

    employees = query.all()

    updated_count = 0
    skipped_count = 0

    for emp in employees:
        # Determine lookup key
        grade = (emp.psira_grade or '').upper()
        role = (emp.role.value if emp.role else '').lower()

        if not grade or not role:
            skipped_count += 1
            continue

        key = (grade, role)
        if key in rate_lookup:
            emp.hourly_rate = rate_lookup[key]
            updated_count += 1
        else:
            skipped_count += 1

    db.commit()

    return {
        "message": f"Applied default rates to {updated_count} employees",
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "skipped_reason": "Missing PSIRA grade, role, or no matching rate configured"
    }


@router.post("/hourly-rates/seed-defaults")
async def seed_default_rates(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Seed the organization with South African industry-standard default hourly rates.
    Only seeds if no rates exist yet. Based on typical 2024 SA security industry rates.
    """
    existing = db.query(DefaultHourlyRate).filter(DefaultHourlyRate.org_id == org_id).count()
    if existing > 0:
        return {
            "message": "Default rates already exist. Use PUT /hourly-rates to update them.",
            "existing_count": existing,
            "seeded": False
        }

    # SA industry standard rates (approximate, based on 2024 market rates)
    default_rates = [
        # Grade A (highest qualified)
        ('A', 'armed', 85.00),
        ('A', 'unarmed', 70.00),
        ('A', 'supervisor', 95.00),
        # Grade B
        ('B', 'armed', 75.00),
        ('B', 'unarmed', 60.00),
        ('B', 'supervisor', 85.00),
        # Grade C
        ('C', 'armed', 65.00),
        ('C', 'unarmed', 52.00),
        ('C', 'supervisor', 75.00),
        # Grade D
        ('D', 'armed', 55.00),
        ('D', 'unarmed', 45.00),
        ('D', 'supervisor', 65.00),
        # Grade E (entry level)
        ('E', 'armed', 48.00),
        ('E', 'unarmed', 40.00),
        ('E', 'supervisor', 55.00),
    ]

    for grade, role, rate in default_rates:
        new_rate = DefaultHourlyRate(
            org_id=org_id,
            psira_grade=grade,
            role=role,
            default_hourly_rate=Decimal(str(rate))
        )
        db.add(new_rate)

    db.commit()

    return {
        "message": "Seeded 15 default hourly rates based on SA industry standards",
        "seeded": True,
        "rates_count": 15
    }
