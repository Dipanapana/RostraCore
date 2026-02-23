"""Service for managing organisation-level role permissions."""

from sqlalchemy.orm import Session
from app.models.role_permission import OrganizationRolePermission
from app.models.user import User, UserRole
from app.auth.permissions import (
    DEFAULT_PERMISSIONS,
    ALL_PERMISSION_KEYS,
    CUSTOMISABLE_ROLES,
    PERMISSION_CATEGORIES,
)


class PermissionService:
    """Manage and check role-based permissions per organisation."""

    # Roles that always get every permission — never stored in DB
    FULL_ACCESS_ROLES = {"admin", "company_admin", "superadmin"}

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    @staticmethod
    def get_role_permissions(db: Session, org_id: int, role: str) -> set[str]:
        """
        Effective permissions for a role in an org.

        Falls back to DEFAULT_PERMISSIONS when the org has no custom rows.
        """
        if role in PermissionService.FULL_ACCESS_ROLES:
            return set(ALL_PERMISSION_KEYS)

        rows = (
            db.query(OrganizationRolePermission)
            .filter(
                OrganizationRolePermission.org_id == org_id,
                OrganizationRolePermission.role == role,
            )
            .all()
        )

        if rows:
            return {r.permission_key for r in rows if r.granted}

        # No custom rows — use defaults
        defaults = DEFAULT_PERMISSIONS.get(role, [])
        if "*" in defaults:
            return set(ALL_PERMISSION_KEYS)
        return set(defaults)

    @staticmethod
    def get_all_role_permissions(db: Session, org_id: int) -> dict[str, list[str]]:
        """
        Full permission matrix for all customisable roles.

        Returns: { "scheduler": ["dashboard.view", ...], "guard": [...], ... }
        """
        result: dict[str, list[str]] = {}
        for role in CUSTOMISABLE_ROLES:
            perms = PermissionService.get_role_permissions(db, org_id, role)
            result[role] = sorted(perms)
        return result

    @staticmethod
    def get_user_permissions(db: Session, user: User) -> list[str]:
        """Get the effective permission keys for a specific user."""
        role_str = user.role.value if isinstance(user.role, UserRole) else str(user.role)

        if role_str in PermissionService.FULL_ACCESS_ROLES:
            return sorted(ALL_PERMISSION_KEYS)

        if user.org_id is None:
            # No org — use defaults
            defaults = DEFAULT_PERMISSIONS.get(role_str, [])
            if "*" in defaults:
                return sorted(ALL_PERMISSION_KEYS)
            return sorted(defaults)

        return sorted(PermissionService.get_role_permissions(db, user.org_id, role_str))

    @staticmethod
    def has_permission(db: Session, user: User, permission_key: str) -> bool:
        """Check whether a user has a specific permission."""
        role_str = user.role.value if isinstance(user.role, UserRole) else str(user.role)

        if role_str in PermissionService.FULL_ACCESS_ROLES:
            return True

        if user.org_id is None:
            defaults = DEFAULT_PERMISSIONS.get(role_str, [])
            return "*" in defaults or permission_key in defaults

        perms = PermissionService.get_role_permissions(db, user.org_id, role_str)
        return permission_key in perms

    # ------------------------------------------------------------------
    # Write helpers
    # ------------------------------------------------------------------

    @staticmethod
    def update_role_permissions(
        db: Session,
        org_id: int,
        role: str,
        permissions: dict[str, bool],
        updated_by: int,
    ) -> None:
        """
        Bulk-update permissions for a role in an org.

        `permissions` is a dict of { "permission_key": True/False }.
        """
        if role not in CUSTOMISABLE_ROLES:
            raise ValueError(f"Role '{role}' is not customisable")

        for key, granted in permissions.items():
            if key not in ALL_PERMISSION_KEYS:
                continue  # skip unknown keys

            existing = (
                db.query(OrganizationRolePermission)
                .filter(
                    OrganizationRolePermission.org_id == org_id,
                    OrganizationRolePermission.role == role,
                    OrganizationRolePermission.permission_key == key,
                )
                .first()
            )

            if existing:
                existing.granted = granted
                existing.updated_by = updated_by
            else:
                db.add(
                    OrganizationRolePermission(
                        org_id=org_id,
                        role=role,
                        permission_key=key,
                        granted=granted,
                        updated_by=updated_by,
                    )
                )

        db.commit()

    @staticmethod
    def reset_to_defaults(db: Session, org_id: int) -> None:
        """Delete all custom permission rows for an org, reverting to defaults."""
        db.query(OrganizationRolePermission).filter(
            OrganizationRolePermission.org_id == org_id,
        ).delete()
        db.commit()

    @staticmethod
    def seed_defaults_for_org(db: Session, org_id: int, updated_by: int | None = None) -> None:
        """
        Write explicit permission rows for an org based on DEFAULT_PERMISSIONS.

        Only seeds for CUSTOMISABLE_ROLES. Useful when creating a new org.
        """
        for role in CUSTOMISABLE_ROLES:
            defaults = DEFAULT_PERMISSIONS.get(role, [])
            granted_keys = set(ALL_PERMISSION_KEYS) if "*" in defaults else set(defaults)

            for key in ALL_PERMISSION_KEYS:
                db.add(
                    OrganizationRolePermission(
                        org_id=org_id,
                        role=role,
                        permission_key=key,
                        granted=(key in granted_keys),
                        updated_by=updated_by,
                    )
                )
        db.commit()

    # ------------------------------------------------------------------
    # Metadata
    # ------------------------------------------------------------------

    @staticmethod
    def get_permission_keys_with_labels() -> dict:
        """Return the full PERMISSION_CATEGORIES dict for the frontend matrix."""
        return PERMISSION_CATEGORIES
