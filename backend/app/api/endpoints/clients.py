"""Client management endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date, datetime

from app.database import get_db
from app.models.client import Client
from app.models.site import Site

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
    status: str = "active"
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    org_id: int


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
    org_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    List all clients with optional filtering.

    NOTE: This endpoint does NOT require authentication to allow
    public access for marketplace/directory features.
    If you want to restrict to authenticated users only, add:
    current_user: User = Depends(get_current_user)
    """
    query = db.query(Client)

    if org_id:
        query = query.filter(Client.org_id == org_id)

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
            "status": client.status,
            "notes": client.notes,
            "created_at": client.created_at,
            "updated_at": client.updated_at,
            "site_count": site_count
        }
        result.append(client_dict)

    return result


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(client_data: ClientCreate, db: Session = Depends(get_db)):
    """Create a new client."""
    client = Client(
        org_id=client_data.org_id,
        client_name=client_data.client_name,
        contact_person=client_data.contact_person,
        contact_email=client_data.contact_email,
        contact_phone=client_data.contact_phone,
        address=client_data.address,
        contract_start_date=client_data.contract_start_date,
        contract_end_date=client_data.contract_end_date,
        billing_rate=client_data.billing_rate,
        status=client_data.status,
        notes=client_data.notes
    )

    db.add(client)
    db.commit()
    db.refresh(client)

    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: int, db: Session = Depends(get_db)):
    """Get a specific client by ID."""
    client = db.query(Client).filter(Client.client_id == client_id).first()

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
    db: Session = Depends(get_db)
):
    """Update a client."""
    client = db.query(Client).filter(Client.client_id == client_id).first()

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
async def delete_client(client_id: int, db: Session = Depends(get_db)):
    """Delete a client."""
    client = db.query(Client).filter(Client.client_id == client_id).first()

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
async def get_client_sites(client_id: int, db: Session = Depends(get_db)):
    """Get all sites for a specific client."""
    client = db.query(Client).filter(Client.client_id == client_id).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with ID {client_id} not found"
        )

    sites = db.query(Site).filter(Site.client_id == client_id).all()

    return sites
