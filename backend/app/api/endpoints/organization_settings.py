"""Organization settings endpoints for client management mode."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.organization import Organization
from app.models.client import Client
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
