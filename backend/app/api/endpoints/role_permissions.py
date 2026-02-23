"""API endpoints for organisation role-permission management."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.auth.security import get_current_user, require_management_role
from app.auth.permissions import CUSTOMISABLE_ROLES, ALL_PERMISSION_KEYS
from app.models.user import User
from app.services.permission_service import PermissionService

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PermissionUpdate(BaseModel):
    permissions: dict[str, bool]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/me")
async def get_my_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's effective permission keys."""
    permissions = PermissionService.get_user_permissions(db, current_user)
    return {"permissions": permissions, "role": current_user.role.value}


@router.get("/")
async def get_all_permissions(
    current_user: User = Depends(require_management_role),
    db: Session = Depends(get_db),
):
    """Return the full permission matrix for all customisable roles."""
    if current_user.org_id is None:
        raise HTTPException(status_code=400, detail="No organisation assigned")
    matrix = PermissionService.get_all_role_permissions(db, current_user.org_id)
    return {"matrix": matrix, "customisable_roles": CUSTOMISABLE_ROLES}


@router.get("/keys")
async def get_permission_keys(
    current_user: User = Depends(require_management_role),
):
    """Return all permission keys grouped by category (for building the UI matrix)."""
    categories = PermissionService.get_permission_keys_with_labels()
    return {"categories": categories, "all_keys": ALL_PERMISSION_KEYS}


@router.get("/{role}")
async def get_role_permissions(
    role: str,
    current_user: User = Depends(require_management_role),
    db: Session = Depends(get_db),
):
    """Get permissions for a specific role."""
    if role not in CUSTOMISABLE_ROLES:
        raise HTTPException(status_code=400, detail=f"Role '{role}' is not customisable")
    if current_user.org_id is None:
        raise HTTPException(status_code=400, detail="No organisation assigned")
    perms = PermissionService.get_role_permissions(db, current_user.org_id, role)
    return {"role": role, "permissions": sorted(perms)}


@router.put("/{role}")
async def update_role_permissions(
    role: str,
    body: PermissionUpdate,
    current_user: User = Depends(require_management_role),
    db: Session = Depends(get_db),
):
    """Update permissions for a role. Only admin / company_admin."""
    if role not in CUSTOMISABLE_ROLES:
        raise HTTPException(status_code=400, detail=f"Role '{role}' is not customisable")
    if current_user.org_id is None:
        raise HTTPException(status_code=400, detail="No organisation assigned")

    PermissionService.update_role_permissions(
        db,
        org_id=current_user.org_id,
        role=role,
        permissions=body.permissions,
        updated_by=current_user.user_id,
    )
    # Return updated permissions
    perms = PermissionService.get_role_permissions(db, current_user.org_id, role)
    return {"role": role, "permissions": sorted(perms), "message": "Permissions updated"}


@router.post("/reset-defaults")
async def reset_to_defaults(
    current_user: User = Depends(require_management_role),
    db: Session = Depends(get_db),
):
    """Reset all role permissions to system defaults."""
    if current_user.org_id is None:
        raise HTTPException(status_code=400, detail="No organisation assigned")

    PermissionService.reset_to_defaults(db, current_user.org_id)
    matrix = PermissionService.get_all_role_permissions(db, current_user.org_id)
    return {"message": "Permissions reset to defaults", "matrix": matrix}
