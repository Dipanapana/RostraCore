"""Guard restrictions (blacklisting) endpoints.

Allows an organisation to record that a specific guard must not be
assigned to a particular client or site.  The roster generator
consults these restrictions when building assignments.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.guard_restriction import GuardRestriction
from app.models.employee import Employee
from app.models.client import Client
from app.models.site import Site
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RestrictionCreate(BaseModel):
    employee_id: int
    client_id: Optional[int] = None
    site_id: Optional[int] = None
    reason: Optional[str] = None


class RestrictionResponse(BaseModel):
    restriction_id: int
    org_id: int
    employee_id: int
    employee_name: str
    client_id: Optional[int]
    client_name: Optional[str]
    site_id: Optional[int]
    site_name: Optional[str]
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_org_id(current_user: User) -> int:
    if not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no organisation assigned.",
        )
    return current_user.org_id


def _enrich(r: GuardRestriction) -> dict:
    """Convert a restriction row into the response dict with denormalised names."""
    employee_name = "Unknown"
    if r.employee:
        employee_name = f"{r.employee.first_name} {r.employee.last_name}"

    client_name = None
    if r.client:
        client_name = r.client.client_name

    site_name = None
    if r.site:
        site_name = r.site.site_name

    return {
        "restriction_id": r.restriction_id,
        "org_id": r.org_id,
        "employee_id": r.employee_id,
        "employee_name": employee_name,
        "client_id": r.client_id,
        "client_name": client_name,
        "site_id": r.site_id,
        "site_name": site_name,
        "reason": r.reason,
        "created_at": r.created_at,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[RestrictionResponse])
def list_restrictions(
    employee_id: Optional[int] = None,
    client_id: Optional[int] = None,
    site_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all guard restrictions for the organisation.

    Filter by employee_id, client_id, or site_id to narrow results.
    """
    org_id = _get_org_id(current_user)

    q = (
        db.query(GuardRestriction)
        .filter(GuardRestriction.org_id == org_id)
        .order_by(GuardRestriction.created_at.desc())
    )

    if employee_id is not None:
        q = q.filter(GuardRestriction.employee_id == employee_id)
    if client_id is not None:
        q = q.filter(GuardRestriction.client_id == client_id)
    if site_id is not None:
        q = q.filter(GuardRestriction.site_id == site_id)

    rows = q.all()
    return [_enrich(r) for r in rows]


@router.post("/", response_model=RestrictionResponse, status_code=status.HTTP_201_CREATED)
def create_restriction(
    data: RestrictionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a guard restriction (blacklist a guard from a client or site)."""
    org_id = _get_org_id(current_user)

    if data.client_id is None and data.site_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one of client_id or site_id must be provided.",
        )

    # Validate employee belongs to this org
    employee = (
        db.query(Employee)
        .filter(Employee.employee_id == data.employee_id, Employee.org_id == org_id)
        .first()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    # Validate client if provided
    if data.client_id is not None:
        client = (
            db.query(Client)
            .filter(Client.client_id == data.client_id, Client.org_id == org_id)
            .first()
        )
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")

    # Validate site if provided
    if data.site_id is not None:
        site = (
            db.query(Site)
            .filter(Site.site_id == data.site_id, Site.org_id == org_id)
            .first()
        )
        if not site:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found.")

    # Prevent duplicate restrictions
    existing = (
        db.query(GuardRestriction)
        .filter(
            GuardRestriction.org_id == org_id,
            GuardRestriction.employee_id == data.employee_id,
            GuardRestriction.client_id == data.client_id,
            GuardRestriction.site_id == data.site_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This restriction already exists.",
        )

    restriction = GuardRestriction(
        org_id=org_id,
        employee_id=data.employee_id,
        client_id=data.client_id,
        site_id=data.site_id,
        reason=data.reason,
        created_by_user_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(restriction)
    db.commit()
    db.refresh(restriction)

    return _enrich(restriction)


@router.delete("/{restriction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_restriction(
    restriction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a guard restriction."""
    org_id = _get_org_id(current_user)

    restriction = (
        db.query(GuardRestriction)
        .filter(
            GuardRestriction.restriction_id == restriction_id,
            GuardRestriction.org_id == org_id,
        )
        .first()
    )
    if not restriction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restriction not found.")

    db.delete(restriction)
    db.commit()
