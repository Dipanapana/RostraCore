"""API endpoints for organizational hierarchy management."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List, Any

from app.database import get_db
from app.models import OrgHierarchyNode, HierarchyNodeType, User
from app.services.hierarchy_service import HierarchyService
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/hierarchy", tags=["Organization Hierarchy"])


# --- Pydantic Schemas ---

class NodeCreate(BaseModel):
    name: str
    node_type: str
    parent_id: Optional[int] = None
    code: Optional[str] = None
    description: Optional[str] = None


class NodeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None


class NodeMove(BaseModel):
    new_parent_id: Optional[int] = None  # None = move to root


class NodeResponse(BaseModel):
    node_id: int
    org_id: int
    parent_id: Optional[int]
    node_type: str
    name: str
    code: Optional[str]
    description: Optional[str]
    display_order: int
    path: str
    depth: int

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.get("/types")
async def get_node_types():
    """Get available hierarchy node types."""
    return [
        {"value": t.value, "label": t.value.replace("_", " ").title()}
        for t in HierarchyNodeType
    ]


@router.get("/tree")
async def get_hierarchy_tree(
    root_node_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get full hierarchy tree for current user's organization.

    Returns nested structure with children arrays for rendering tree UI.
    """
    tree = HierarchyService.get_tree(db, current_user.org_id, root_node_id)
    return tree


@router.get("/flat")
async def get_hierarchy_flat(
    node_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get flat list of hierarchy nodes (for dropdowns, select boxes).

    Includes path for display like "Company > Division > Department".
    """
    query = db.query(OrgHierarchyNode).filter(
        OrgHierarchyNode.org_id == current_user.org_id,
        OrgHierarchyNode.is_active == True
    )

    if node_type:
        query = query.filter(OrgHierarchyNode.node_type == node_type)

    nodes = query.order_by(OrgHierarchyNode.name).all()

    return [
        {
            "node_id": n.node_id,
            "name": n.name,
            "code": n.code,
            "node_type": n.node_type,
            "path": n.get_path(),
            "depth": n.get_depth(),
            "parent_id": n.parent_id
        }
        for n in nodes
    ]


@router.get("/{node_id}")
async def get_node(
    node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single hierarchy node with details."""
    node = db.query(OrgHierarchyNode).filter(
        OrgHierarchyNode.node_id == node_id,
        OrgHierarchyNode.org_id == current_user.org_id,
        OrgHierarchyNode.is_active == True
    ).first()

    if not node:
        raise HTTPException(404, "Node not found")

    return {
        "node_id": node.node_id,
        "name": node.name,
        "code": node.code,
        "node_type": node.node_type,
        "description": node.description,
        "parent_id": node.parent_id,
        "path": node.get_path(),
        "depth": node.get_depth(),
        "ancestors": [
            {"node_id": a.node_id, "name": a.name}
            for a in node.get_ancestors()
        ],
        "children_count": db.query(OrgHierarchyNode).filter(
            OrgHierarchyNode.parent_id == node_id,
            OrgHierarchyNode.is_active == True
        ).count()
    }


@router.post("/")
async def create_node(
    data: NodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new hierarchy node."""
    try:
        node = HierarchyService.create_node(
            db=db,
            org_id=current_user.org_id,
            name=data.name,
            node_type=data.node_type,
            parent_id=data.parent_id,
            code=data.code,
            description=data.description
        )
        db.commit()

        return {
            "node_id": node.node_id,
            "name": node.name,
            "path": node.get_path(),
            "message": "Node created successfully"
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{node_id}")
async def update_node(
    node_id: int,
    data: NodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update hierarchy node details."""
    node = db.query(OrgHierarchyNode).filter(
        OrgHierarchyNode.node_id == node_id,
        OrgHierarchyNode.org_id == current_user.org_id,
        OrgHierarchyNode.is_active == True
    ).first()

    if not node:
        raise HTTPException(404, "Node not found")

    if data.name is not None:
        node.name = data.name
    if data.code is not None:
        node.code = data.code
    if data.description is not None:
        node.description = data.description
    if data.display_order is not None:
        node.display_order = data.display_order

    db.commit()

    return {"node_id": node.node_id, "message": "Node updated successfully"}


@router.post("/{node_id}/move")
async def move_node(
    node_id: int,
    data: NodeMove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Move node to new parent (or to root if new_parent_id is null)."""
    # Verify node belongs to user's org
    node = db.query(OrgHierarchyNode).filter(
        OrgHierarchyNode.node_id == node_id,
        OrgHierarchyNode.org_id == current_user.org_id,
        OrgHierarchyNode.is_active == True
    ).first()

    if not node:
        raise HTTPException(404, "Node not found")

    try:
        HierarchyService.move_node(db, node_id, data.new_parent_id)
        db.commit()
        return {"node_id": node_id, "new_parent_id": data.new_parent_id, "message": "Node moved successfully"}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/{node_id}")
async def delete_node(
    node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Soft-delete hierarchy node.

    Note: This cascades to children - all descendants are also deactivated.
    """
    node = db.query(OrgHierarchyNode).filter(
        OrgHierarchyNode.node_id == node_id,
        OrgHierarchyNode.org_id == current_user.org_id,
        OrgHierarchyNode.is_active == True
    ).first()

    if not node:
        raise HTTPException(404, "Node not found")

    # Soft delete this node and all descendants
    descendants = HierarchyService.get_descendants(db, node_id, include_self=True)
    for d in descendants:
        d.is_active = False

    db.commit()

    return {"deleted_count": len(descendants), "message": f"Node and {len(descendants) - 1} descendants deleted"}


@router.get("/{node_id}/descendants")
async def get_descendants(
    node_id: int,
    include_self: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all descendants of a node."""
    # Verify node belongs to user's org
    node = db.query(OrgHierarchyNode).filter(
        OrgHierarchyNode.node_id == node_id,
        OrgHierarchyNode.org_id == current_user.org_id
    ).first()

    if not node:
        raise HTTPException(404, "Node not found")

    descendants = HierarchyService.get_descendants(db, node_id, include_self)

    return [
        {
            "node_id": d.node_id,
            "name": d.name,
            "node_type": d.node_type,
            "path": d.get_path(),
            "depth": d.get_depth()
        }
        for d in descendants
    ]
