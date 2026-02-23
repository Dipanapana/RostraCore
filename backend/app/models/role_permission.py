"""Organization-level customizable role permissions."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class OrganizationRolePermission(Base):
    """
    Per-org, per-role permission assignment.

    Each row represents: "In org X, role Y has permission Z."
    When no rows exist for an org, the system falls back to DEFAULT_PERMISSIONS.
    """
    __tablename__ = "organization_role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(30), nullable=False)
    permission_key = Column(String(100), nullable=False)
    granted = Column(Boolean, nullable=False, default=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("org_id", "role", "permission_key", name="uq_org_role_permission"),
    )

    def __repr__(self):
        return f"<OrgRolePerm org={self.org_id} role={self.role} key={self.permission_key} granted={self.granted}>"
