"""Service layer for organizational hierarchy operations."""

from typing import List, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models import OrgHierarchyNode, HierarchyNodeType


class HierarchyService:
    """Service for hierarchy traversal and queries."""

    @staticmethod
    def get_descendants(db: Session, node_id: int, include_self: bool = False) -> List[OrgHierarchyNode]:
        """
        Get all descendants of a node (recursive).

        For performance, this uses iterative approach with breadth-first traversal.
        For very deep hierarchies (>1000 nodes), consider migrating to ltree.

        Args:
            db: Database session
            node_id: Starting node ID
            include_self: Whether to include the starting node

        Returns:
            List of descendant nodes
        """
        descendants = []

        if include_self:
            node = db.query(OrgHierarchyNode).filter_by(node_id=node_id, is_active=True).first()
            if node:
                descendants.append(node)

        # BFS traversal
        queue = [node_id]
        while queue:
            current_id = queue.pop(0)
            children = db.query(OrgHierarchyNode).filter(
                and_(
                    OrgHierarchyNode.parent_id == current_id,
                    OrgHierarchyNode.is_active == True
                )
            ).all()

            for child in children:
                descendants.append(child)
                queue.append(child.node_id)

        return descendants

    @staticmethod
    def get_descendant_ids(db: Session, node_id: int, include_self: bool = False) -> Set[int]:
        """
        Get IDs of all descendants (for efficient IN queries).

        Returns:
            Set of descendant node IDs
        """
        descendants = HierarchyService.get_descendants(db, node_id, include_self)
        return {d.node_id for d in descendants}

    @staticmethod
    def get_ancestors(db: Session, node_id: int, include_self: bool = False) -> List[OrgHierarchyNode]:
        """
        Get all ancestors from root to this node.

        Args:
            db: Database session
            node_id: Starting node ID
            include_self: Whether to include the starting node

        Returns:
            List of ancestor nodes (root first)
        """
        ancestors = []
        node = db.query(OrgHierarchyNode).filter_by(node_id=node_id, is_active=True).first()

        if not node:
            return ancestors

        if include_self:
            ancestors.append(node)

        current = node.parent
        while current:
            ancestors.insert(0, current)
            current = current.parent

        return ancestors

    @staticmethod
    def get_tree(db: Session, org_id: int, root_node_id: Optional[int] = None) -> List[dict]:
        """
        Get hierarchical tree structure for an organization.

        Args:
            db: Database session
            org_id: Organization ID
            root_node_id: Optional root node (None for entire org tree)

        Returns:
            Nested list of dicts with children arrays
        """
        def build_subtree(node: OrgHierarchyNode) -> dict:
            children = db.query(OrgHierarchyNode).filter(
                and_(
                    OrgHierarchyNode.parent_id == node.node_id,
                    OrgHierarchyNode.is_active == True
                )
            ).order_by(OrgHierarchyNode.display_order).all()

            return {
                "node_id": node.node_id,
                "name": node.name,
                "code": node.code,
                "node_type": node.node_type,
                "description": node.description,
                "children": [build_subtree(child) for child in children]
            }

        # Get root nodes (parent_id is NULL)
        if root_node_id:
            roots = db.query(OrgHierarchyNode).filter(
                and_(
                    OrgHierarchyNode.node_id == root_node_id,
                    OrgHierarchyNode.org_id == org_id,
                    OrgHierarchyNode.is_active == True
                )
            ).all()
        else:
            roots = db.query(OrgHierarchyNode).filter(
                and_(
                    OrgHierarchyNode.org_id == org_id,
                    OrgHierarchyNode.parent_id == None,
                    OrgHierarchyNode.is_active == True
                )
            ).order_by(OrgHierarchyNode.display_order).all()

        return [build_subtree(root) for root in roots]

    @staticmethod
    def can_user_access_node(db: Session, user_node_id: Optional[int], target_node_id: int) -> bool:
        """
        Check if user with assigned_node_id can access target node.

        Access rules:
        - If user_node_id is None: org-wide access (can access any node)
        - If user_node_id is not None: can only access assigned node and descendants

        Args:
            db: Database session
            user_node_id: User's assigned_node_id (None for org-wide)
            target_node_id: Node being accessed

        Returns:
            Boolean - True if access allowed
        """
        # Org-wide access (legacy behavior)
        if user_node_id is None:
            return True

        # Direct match
        if user_node_id == target_node_id:
            return True

        # Check if target is descendant of user's node
        descendant_ids = HierarchyService.get_descendant_ids(db, user_node_id)
        return target_node_id in descendant_ids

    @staticmethod
    def get_accessible_node_ids(db: Session, user_node_id: Optional[int], org_id: int) -> Optional[Set[int]]:
        """
        Get all node IDs a user can access.

        Returns:
            Set of accessible node IDs, or None for org-wide access
        """
        if user_node_id is None:
            return None  # Org-wide access

        return HierarchyService.get_descendant_ids(db, user_node_id, include_self=True)

    @staticmethod
    def create_node(
        db: Session,
        org_id: int,
        name: str,
        node_type: str,
        parent_id: Optional[int] = None,
        code: Optional[str] = None,
        description: Optional[str] = None
    ) -> OrgHierarchyNode:
        """
        Create a new hierarchy node.

        Args:
            db: Database session
            org_id: Organization ID
            name: Node display name
            node_type: Type from HierarchyNodeType enum
            parent_id: Parent node ID (None for root)
            code: Optional reference code
            description: Optional description

        Returns:
            Created OrgHierarchyNode
        """
        # Validate parent belongs to same org
        if parent_id:
            parent = db.query(OrgHierarchyNode).filter_by(
                node_id=parent_id,
                org_id=org_id,
                is_active=True
            ).first()
            if not parent:
                raise ValueError(f"Parent node {parent_id} not found in organization {org_id}")

        # Get display order (max + 1 among siblings)
        siblings = db.query(OrgHierarchyNode).filter(
            and_(
                OrgHierarchyNode.org_id == org_id,
                OrgHierarchyNode.parent_id == parent_id,
                OrgHierarchyNode.is_active == True
            )
        ).all()
        display_order = max([s.display_order for s in siblings], default=-1) + 1

        node = OrgHierarchyNode(
            org_id=org_id,
            parent_id=parent_id,
            node_type=node_type,
            name=name,
            code=code,
            description=description,
            display_order=display_order,
        )
        db.add(node)
        db.flush()
        return node

    @staticmethod
    def move_node(db: Session, node_id: int, new_parent_id: Optional[int]) -> OrgHierarchyNode:
        """
        Move a node to a new parent (or to root if new_parent_id is None).

        Validates that move doesn't create circular reference.
        """
        node = db.query(OrgHierarchyNode).filter_by(node_id=node_id, is_active=True).first()
        if not node:
            raise ValueError(f"Node {node_id} not found")

        # Can't move to self
        if new_parent_id == node_id:
            raise ValueError("Cannot move node to itself")

        # Can't move to own descendant (would create cycle)
        if new_parent_id:
            descendant_ids = HierarchyService.get_descendant_ids(db, node_id)
            if new_parent_id in descendant_ids:
                raise ValueError("Cannot move node to its own descendant")

            # Validate new parent is in same org
            new_parent = db.query(OrgHierarchyNode).filter_by(
                node_id=new_parent_id,
                org_id=node.org_id,
                is_active=True
            ).first()
            if not new_parent:
                raise ValueError(f"New parent {new_parent_id} not found in organization")

        node.parent_id = new_parent_id
        db.flush()
        return node
