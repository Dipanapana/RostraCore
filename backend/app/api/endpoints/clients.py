"""Client management endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date, datetime

from app.database import get_db
from app.models.client import Client
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# Pydantic schemas
class ClientBase(BaseModel):
    client_name: str
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    billing_rate: Optional[float] = None
    target_margin_pct: Optional[float] = None
    status: str = "active"
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    pass


class ClientResponse(ClientBase):
    client_id: int
    org_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientWithSites(ClientResponse):
    site_count: int


# Endpoints
@router.get("/", response_model=List[ClientWithSites])
async def list_clients(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    List all clients with optional filtering.

    Filtering:
    - Organization: Only clients in user's organization
    - Client Access: If user has managed_client_ids, only those clients are visible
                    Owners/admins with NULL managed_client_ids see all org clients
    """
    query = db.query(Client).filter(Client.org_id == org_id)

    # Apply client-level access control
    accessible_clients = current_user.get_accessible_client_ids()
    if accessible_clients is not None:  # None means full access (owner)
        if not accessible_clients:  # Empty list = no access
            return []
        query = query.filter(Client.client_id.in_(accessible_clients))

    if status:
        query = query.filter(Client.status == status)

    clients = query.offset(offset).limit(limit).all()

    # Add site count for each client
    result = []
    for client in clients:
        site_count = db.query(Site).filter(Site.client_id == client.client_id).count()
        client_dict = {
            "client_id": client.client_id,
            "org_id": client.org_id,
            "client_name": client.client_name,
            "contact_person": client.contact_person,
            "contact_email": client.contact_email,
            "contact_phone": client.contact_phone,
            "address": client.address,
            "contract_start_date": client.contract_start_date,
            "contract_end_date": client.contract_end_date,
            "billing_rate": client.billing_rate,
            "target_margin_pct": client.target_margin_pct,
            "status": client.status,
            "notes": client.notes,
            "created_at": client.created_at,
            "updated_at": client.updated_at,
            "site_count": site_count
        }
        result.append(client_dict)

    return result


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Create a new client (automatically assigned to user's organization)."""
    client = Client(
        org_id=org_id,
        client_name=client_data.client_name,
        contact_person=client_data.contact_person,
        contact_email=client_data.contact_email,
        contact_phone=client_data.contact_phone,
        address=client_data.address,
        contract_start_date=client_data.contract_start_date,
        contract_end_date=client_data.contract_end_date,
        billing_rate=client_data.billing_rate,
        target_margin_pct=client_data.target_margin_pct,
        status=client_data.status,
        notes=client_data.notes
    )

    db.add(client)
    db.commit()
    db.refresh(client)

    return client


@router.get("/contract-alerts")
async def get_contract_alerts(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Return contract expiry alerts for all active clients.

    Severity levels:
    - expired:  contract_end_date is in the past
    - critical: expires within 30 days
    - warning:  expires within 90 days
    - ok:       more than 90 days remaining, or no end date set
    """
    from datetime import date as date_cls

    today = date_cls.today()
    clients = db.query(Client).filter(
        Client.org_id == org_id,
        Client.status == "active",
    ).all()

    alerts = []
    summary = {"expired": 0, "critical": 0, "warning": 0, "ok": 0, "no_end_date": 0, "total": len(clients)}

    for c in clients:
        if not c.contract_end_date:
            summary["no_end_date"] += 1
            continue

        days_remaining = (c.contract_end_date - today).days

        if days_remaining < 0:
            severity = "expired"
            summary["expired"] += 1
        elif days_remaining <= 30:
            severity = "critical"
            summary["critical"] += 1
        elif days_remaining <= 90:
            severity = "warning"
            summary["warning"] += 1
        else:
            severity = "ok"
            summary["ok"] += 1

        site_count = db.query(Site).filter(Site.client_id == c.client_id).count()

        alerts.append({
            "client_id": c.client_id,
            "client_name": c.client_name,
            "contract_start_date": c.contract_start_date.isoformat() if c.contract_start_date else None,
            "contract_end_date": c.contract_end_date.isoformat(),
            "days_remaining": days_remaining,
            "severity": severity,
            "site_count": site_count,
            "billing_rate": float(c.billing_rate) if c.billing_rate else None,
        })

    # Sort: expired first, then critical, warning, ok — within each by days_remaining ascending
    severity_order = {"expired": 0, "critical": 1, "warning": 2, "ok": 3}
    alerts.sort(key=lambda a: (severity_order.get(a["severity"], 9), a["days_remaining"]))

    return {
        "as_of": today.isoformat(),
        "summary": summary,
        "alerts": alerts,
    }


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get a specific client by ID (filtered by organization and client access)."""
    # Check client-level access
    accessible_clients = current_user.get_accessible_client_ids()
    if accessible_clients is not None and client_id not in accessible_clients:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this client"
        )

    client = db.query(Client).filter(
        Client.client_id == client_id,
        Client.org_id == org_id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with ID {client_id} not found"
        )

    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Update a client (filtered by organization and client access)."""
    # Check client-level access
    accessible_clients = current_user.get_accessible_client_ids()
    if accessible_clients is not None and client_id not in accessible_clients:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this client"
        )

    client = db.query(Client).filter(
        Client.client_id == client_id,
        Client.org_id == org_id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with ID {client_id} not found"
        )

    # Update fields
    for field, value in client_data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    client.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(client)

    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Delete a client (filtered by organization and client access)."""
    # Check client-level access
    accessible_clients = current_user.get_accessible_client_ids()
    if accessible_clients is not None and client_id not in accessible_clients:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this client"
        )

    client = db.query(Client).filter(
        Client.client_id == client_id,
        Client.org_id == org_id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with ID {client_id} not found"
        )

    # Check if client has sites
    site_count = db.query(Site).filter(Site.client_id == client_id).count()
    if site_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete client with {site_count} associated sites. Delete or reassign sites first."
        )

    db.delete(client)
    db.commit()

    return None


@router.get("/{client_id}/sites")
async def get_client_sites(
    client_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get all sites for a specific client (filtered by organization and client access)."""
    # Check client-level access
    accessible_clients = current_user.get_accessible_client_ids()
    if accessible_clients is not None and client_id not in accessible_clients:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this client"
        )

    client = db.query(Client).filter(
        Client.client_id == client_id,
        Client.org_id == org_id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with ID {client_id} not found"
        )

    sites = db.query(Site).filter(Site.client_id == client_id).all()

    return sites
