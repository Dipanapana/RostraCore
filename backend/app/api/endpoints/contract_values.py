"""Contract value endpoints.

Track financial values, billing rates, and profitability per contract/site.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contract_value import ContractValue
from app.models.client import Client
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ContractValueCreate(BaseModel):
    client_id: int
    site_id: Optional[int] = None
    contract_number: Optional[str] = None
    monthly_value: float = 0
    billing_frequency: str = "monthly"
    hourly_bill_rate: Optional[float] = None
    wage_budget_pct: Optional[float] = None
    monthly_wage_budget: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None


class ContractValueUpdate(BaseModel):
    site_id: Optional[int] = None
    contract_number: Optional[str] = None
    monthly_value: Optional[float] = None
    billing_frequency: Optional[str] = None
    hourly_bill_rate: Optional[float] = None
    wage_budget_pct: Optional[float] = None
    monthly_wage_budget: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


def _build_response(cv: ContractValue, db: Session) -> dict:
    client = db.query(Client).get(cv.client_id) if cv.client_id else None
    site = db.query(Site).get(cv.site_id) if cv.site_id else None
    return {
        "contract_value_id": cv.contract_value_id,
        "client_id": cv.client_id,
        "client_name": client.client_name if client else None,
        "site_id": cv.site_id,
        "site_name": site.site_name if site else None,
        "contract_number": cv.contract_number,
        "monthly_value": cv.monthly_value,
        "billing_frequency": cv.billing_frequency,
        "hourly_bill_rate": cv.hourly_bill_rate,
        "wage_budget_pct": cv.wage_budget_pct,
        "monthly_wage_budget": cv.monthly_wage_budget,
        "start_date": cv.start_date,
        "end_date": cv.end_date,
        "is_active": cv.is_active,
        "notes": cv.notes,
        "created_at": cv.created_at,
        "updated_at": cv.updated_at,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_contract_values(
    client_id: Optional[int] = None,
    site_id: Optional[int] = None,
    active_only: bool = True,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List contract values."""
    q = db.query(ContractValue).filter(ContractValue.org_id == org_id)
    if client_id:
        q = q.filter(ContractValue.client_id == client_id)
    if site_id:
        q = q.filter(ContractValue.site_id == site_id)
    if active_only:
        q = q.filter(ContractValue.is_active.is_(True))

    items = q.order_by(ContractValue.monthly_value.desc()).all()
    return {"items": [_build_response(cv, db) for cv in items], "total": len(items)}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_contract_value(
    body: ContractValueCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Create a contract value record."""
    # Validate client
    client = db.query(Client).filter(Client.client_id == body.client_id, Client.org_id == org_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Auto-calculate monthly_wage_budget from pct
    monthly_wage_budget = body.monthly_wage_budget
    if not monthly_wage_budget and body.wage_budget_pct and body.monthly_value:
        monthly_wage_budget = round(body.monthly_value * body.wage_budget_pct / 100, 2)

    cv = ContractValue(
        org_id=org_id,
        client_id=body.client_id,
        site_id=body.site_id,
        contract_number=body.contract_number,
        monthly_value=body.monthly_value,
        billing_frequency=body.billing_frequency,
        hourly_bill_rate=body.hourly_bill_rate,
        wage_budget_pct=body.wage_budget_pct,
        monthly_wage_budget=monthly_wage_budget,
        start_date=body.start_date,
        end_date=body.end_date,
        notes=body.notes,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return _build_response(cv, db)


@router.put("/{contract_value_id}/")
def update_contract_value(
    contract_value_id: int,
    body: ContractValueUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update a contract value record."""
    cv = db.query(ContractValue).filter(
        ContractValue.contract_value_id == contract_value_id,
        ContractValue.org_id == org_id,
    ).first()
    if not cv:
        raise HTTPException(status_code=404, detail="Contract value not found")

    for field in ["site_id", "contract_number", "monthly_value", "billing_frequency",
                  "hourly_bill_rate", "wage_budget_pct", "monthly_wage_budget",
                  "start_date", "end_date", "is_active", "notes"]:
        val = getattr(body, field)
        if val is not None:
            setattr(cv, field, val)

    cv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cv)
    return _build_response(cv, db)


@router.delete("/{contract_value_id}/", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_contract_value(
    contract_value_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Deactivate a contract value."""
    cv = db.query(ContractValue).filter(
        ContractValue.contract_value_id == contract_value_id,
        ContractValue.org_id == org_id,
    ).first()
    if not cv:
        raise HTTPException(status_code=404, detail="Contract value not found")
    cv.is_active = False
    cv.updated_at = datetime.utcnow()
    db.commit()


# ---------------------------------------------------------------------------
# Dashboard / Summary
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def contract_dashboard(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Contract value dashboard — financial overview."""
    contracts = db.query(ContractValue).filter(
        ContractValue.org_id == org_id,
        ContractValue.is_active.is_(True),
    ).all()

    now = datetime.utcnow()
    total_count = len(contracts)
    total_monthly_revenue = sum(cv.monthly_value for cv in contracts)
    total_wage_budget = sum(cv.monthly_wage_budget or 0 for cv in contracts)
    annual_revenue = total_monthly_revenue * 12

    # Expiring contracts (within 90 days)
    expiring_soon = sum(
        1 for cv in contracts
        if cv.end_date and cv.end_date > now and (cv.end_date - now).days <= 90
    )
    expired = sum(1 for cv in contracts if cv.end_date and cv.end_date <= now)

    # Average wage-to-revenue target
    pct_contracts = [cv for cv in contracts if cv.wage_budget_pct]
    avg_wage_pct = round(sum(cv.wage_budget_pct for cv in pct_contracts) / len(pct_contracts), 1) if pct_contracts else 0

    # By client
    client_map: dict = {}
    for cv in contracts:
        if cv.client_id not in client_map:
            client = db.query(Client).get(cv.client_id)
            client_map[cv.client_id] = {
                "client_id": cv.client_id,
                "client_name": client.client_name if client else "Unknown",
                "monthly_total": 0,
                "contracts": 0,
            }
        client_map[cv.client_id]["monthly_total"] += cv.monthly_value
        client_map[cv.client_id]["contracts"] += 1

    return {
        "total_contracts": total_count,
        "total_monthly_revenue": round(total_monthly_revenue, 2),
        "annual_revenue": round(annual_revenue, 2),
        "total_wage_budget": round(total_wage_budget, 2),
        "avg_wage_budget_pct": avg_wage_pct,
        "expiring_soon": expiring_soon,
        "expired": expired,
        "by_client": sorted(client_map.values(), key=lambda x: x["monthly_total"], reverse=True),
    }
