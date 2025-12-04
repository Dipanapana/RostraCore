"""Client Filter Service for organization and user-based client access control."""

from typing import Optional, Union
from sqlalchemy.orm import Session
from app.models.organization import Organization
from app.models.user import User


class ClientFilterService:
    """Service to filter data based on organization and user client management settings."""

    @staticmethod
    def get_accessible_clients(db: Session, org_id: int, user: Optional[User] = None) -> Optional[list[int]]:
        """
        Get list of accessible client IDs based on org and user settings.

        Access Control Logic:
        1. Start with organization's client_management_mode
        2. If user is provided and is NOT an owner, intersect with user's managed_client_ids

        Args:
            db: Database session
            org_id: Organization ID
            user: Optional User object for user-level filtering

        Returns:
            None: Full access (owner or org mode='all' with no user restrictions)
            []: No access (non-owner with no client assignments)
            [1,2,3]: Access to specific clients only
        """
        # First, get organization-level access
        org = db.query(Organization).filter(Organization.org_id == org_id).first()
        if not org:
            return []  # No org = no access

        org_accessible = None  # None means all clients
        if org.client_management_mode == 'selected':
            org_accessible = org.managed_client_ids or []

        # If no user provided, return org-level access
        if user is None:
            return org_accessible

        # User-level filtering
        if user.is_owner:
            # Owners get org-level access (no additional restrictions)
            return org_accessible

        # Non-owners: must have explicit client assignments
        user_clients = user.managed_client_ids if user.managed_client_ids else []
        if not user_clients:
            return []  # Non-owner with no assignments = no access

        # Intersect user's clients with org-level access
        if org_accessible is None:
            # Org allows all, user has specific clients
            return user_clients
        else:
            # Intersect org's clients with user's clients
            return [c for c in user_clients if c in org_accessible]

    @staticmethod
    def filter_by_client_access(query, client_id_column, org_id: int, db: Session):
        """
        Apply client filtering to a SQLAlchemy query.

        Args:
            query: SQLAlchemy query object
            client_id_column: The column to filter by (e.g., Employee.assigned_client_id)
            org_id: Organization ID
            db: Database session

        Returns:
            Filtered query
        """
        accessible = ClientFilterService.get_accessible_clients(db, org_id)
        if accessible is None:
            return query  # No filtering - return original query

        if not accessible:
            # Empty list means no clients selected - return nothing
            return query.filter(client_id_column.is_(None))  # Only unassigned

        return query.filter(client_id_column.in_(accessible))

    @staticmethod
    def filter_employees_by_client_access(query, employee_model, org_id: int, db: Session):
        """
        Apply client filtering to employees query, including unassigned employees.

        Args:
            query: SQLAlchemy query object for employees
            employee_model: Employee model class
            org_id: Organization ID
            db: Database session

        Returns:
            Filtered query - includes employees assigned to accessible clients OR unassigned employees
        """
        accessible = ClientFilterService.get_accessible_clients(db, org_id)
        if accessible is None:
            return query  # No filtering - return original query

        # Include employees assigned to accessible clients OR unassigned employees
        return query.filter(
            (employee_model.assigned_client_id.in_(accessible)) |
            (employee_model.assigned_client_id.is_(None))
        )

    @staticmethod
    def is_client_accessible(db: Session, org_id: int, client_id: int, user: Optional[User] = None) -> bool:
        """
        Check if a specific client is accessible for an organization/user.

        Args:
            db: Database session
            org_id: Organization ID
            client_id: Client ID to check
            user: Optional User object for user-level filtering

        Returns:
            True if client is accessible, False otherwise
        """
        accessible = ClientFilterService.get_accessible_clients(db, org_id, user)
        if accessible is None:
            return True  # All clients accessible
        return client_id in accessible

    @staticmethod
    def get_accessible_clients_for_user(db: Session, user: User) -> Optional[list[int]]:
        """
        Convenience method to get accessible clients for a user.

        Args:
            db: Database session
            user: User object

        Returns:
            Same as get_accessible_clients
        """
        if not user.org_id:
            return []  # User not in any org
        return ClientFilterService.get_accessible_clients(db, user.org_id, user)
