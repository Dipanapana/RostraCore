"""Organizational hierarchy model for multi-level tenancy."""

from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class HierarchyNodeType(str, enum.Enum):
    """Type of organizational hierarchy node."""
    ORGANIZATION = "organization"  # Root level (maps to Organization)
    DIVISION = "division"          # Business division (e.g., "Armed Response", "Water Services")
    REGION = "region"              # Geographic region (e.g., "Gauteng", "Western Cape")
    LOCATION = "location"          # Physical site (e.g., "Sandton Office", "Soweto Plant")
    DEPARTMENT = "department"      # Functional department (e.g., "Finance", "Kitchen")
    TEAM = "team"                  # Sub-department team (e.g., "Night Shift", "Accounts Payable")


class OrgHierarchyNode(Base):
    """
    Organizational hierarchy node using adjacency list pattern.

    Enables multi-level structures:
    - Municipality: City -> Division -> Department -> Section
    - Restaurant Group: Company -> Region -> Location -> Department
    - Security Company: Company -> Division -> Client Site -> Post

    Example paths:
    - "Cape Town Municipality" -> "Water Division" -> "Treatment Plants" -> "Strandfontein"
    - "Spur Group" -> "Western Cape" -> "Sandton Spur" -> "Kitchen"
    """
    __tablename__ = "org_hierarchy_nodes"

    node_id = Column(Integer, primary_key=True, index=True)

    # Organization this node belongs to
    org_id = Column(
        Integer,
        ForeignKey("organizations.org_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Adjacency list: parent node (NULL for root)
    parent_id = Column(
        Integer,
        ForeignKey("org_hierarchy_nodes.node_id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # Node type for categorization
    node_type = Column(String(50), nullable=False, default=HierarchyNodeType.DEPARTMENT.value)

    # Display name (e.g., "Kitchen", "Finance Department", "Sandton Office")
    name = Column(String(200), nullable=False)

    # Optional code for reference (e.g., "DEPT-FIN", "LOC-SANDTON")
    code = Column(String(50), nullable=True, index=True)

    # Optional description
    description = Column(Text, nullable=True)

    # Display order within siblings
    display_order = Column(Integer, default=0, nullable=False)

    # Soft delete
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.now(), nullable=True)

    # Relationships
    organization = relationship("Organization")
    parent = relationship(
        "OrgHierarchyNode",
        remote_side=[node_id],
        backref="children",
        foreign_keys=[parent_id]
    )

    # Reverse relationships (populated by User and Employee models)
    # assigned_users = relationship("User", back_populates="assigned_node")
    # assigned_employees = relationship("Employee", back_populates="hierarchy_node")

    def __repr__(self):
        return f"<OrgHierarchyNode(node_id={self.node_id}, name='{self.name}', type='{self.node_type}')>"

    def get_path(self, separator: str = " > ") -> str:
        """
        Get full path from root to this node.

        Returns:
            String like "Company > Division > Location > Department"
        """
        path_parts = [self.name]
        current = self.parent
        while current:
            path_parts.insert(0, current.name)
            current = current.parent
        return separator.join(path_parts)

    def get_depth(self) -> int:
        """
        Get depth of this node (0 for root).

        Returns:
            Integer depth level
        """
        depth = 0
        current = self.parent
        while current:
            depth += 1
            current = current.parent
        return depth

    def get_ancestors(self) -> list:
        """
        Get list of ancestor nodes from root to parent (not including self).

        Returns:
            List of OrgHierarchyNode objects
        """
        ancestors = []
        current = self.parent
        while current:
            ancestors.insert(0, current)
            current = current.parent
        return ancestors
