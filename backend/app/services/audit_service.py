"""Audit service for recording and querying entity change history."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


class AuditService:
    """Static methods for audit log operations."""

    @staticmethod
    def log_change(
        db: Session,
        org_id: int,
        entity_type: str,
        entity_id: int,
        action: str,
        changes: Optional[Dict[str, Any]] = None,
        reason: Optional[str] = None,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
    ) -> AuditLog:
        """Create an audit log entry for an entity change.

        Args:
            db: Database session.
            org_id: Organization ID.
            entity_type: Type of entity (e.g., 'employee', 'roster', 'site').
            entity_id: Primary key of the changed entity.
            action: Action performed (e.g., 'create', 'update', 'delete').
            changes: Dict of changed fields with old/new values.
            reason: Optional human-readable reason for the change.
            user_id: ID of the user who made the change.
            user_email: Email of the user who made the change.

        Returns:
            The created AuditLog entry.
        """
        entry = AuditLog(
            org_id=org_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            changes=changes,
            reason=reason,
            user_id=user_id,
            user_email=user_email,
        )
        db.add(entry)
        db.flush()
        return entry

    @staticmethod
    def get_entity_history(
        db: Session,
        org_id: int,
        entity_type: str,
        entity_id: int,
        limit: int = 50,
    ) -> List[AuditLog]:
        """Return audit entries for a specific entity, newest first.

        Args:
            db: Database session.
            org_id: Organization ID.
            entity_type: Type of entity.
            entity_id: Primary key of the entity.
            limit: Maximum number of entries to return.

        Returns:
            List of AuditLog entries ordered by created_at descending.
        """
        return (
            db.query(AuditLog)
            .filter(
                AuditLog.org_id == org_id,
                AuditLog.entity_type == entity_type,
                AuditLog.entity_id == entity_id,
            )
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_recent_changes(
        db: Session,
        org_id: int,
        entity_types: Optional[List[str]] = None,
        limit: int = 100,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[AuditLog]:
        """Return recent audit entries for an organization, optionally filtered.

        Args:
            db: Database session.
            org_id: Organization ID.
            entity_types: Optional list of entity types to filter by.
            limit: Maximum number of entries to return.
            start_date: Optional start of date range filter.
            end_date: Optional end of date range filter.

        Returns:
            List of AuditLog entries ordered by created_at descending.
        """
        query = db.query(AuditLog).filter(AuditLog.org_id == org_id)

        if entity_types:
            query = query.filter(AuditLog.entity_type.in_(entity_types))
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)

        return query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    @staticmethod
    def diff_json(
        old_dict: Optional[Dict[str, Any]],
        new_dict: Optional[Dict[str, Any]],
    ) -> Dict[str, Dict[str, Any]]:
        """Compute a field-level diff between two dictionaries.

        Args:
            old_dict: Previous state (or None for creation).
            new_dict: New state (or None for deletion).

        Returns:
            Dict of changed fields: {field: {old: X, new: Y}}.
            Only fields whose values differ are included.
        """
        old_dict = old_dict or {}
        new_dict = new_dict or {}

        all_keys = set(old_dict.keys()) | set(new_dict.keys())
        diff: Dict[str, Dict[str, Any]] = {}

        for key in all_keys:
            old_val = old_dict.get(key)
            new_val = new_dict.get(key)
            if old_val != new_val:
                diff[key] = {"old": old_val, "new": new_val}

        return diff
