"""Post order model — site instructions and standing orders for guards."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PostOrderStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class PostOrder(Base):
    """Site instructions / standing orders for guards."""

    __tablename__ = "post_orders"

    post_order_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=False, index=True)

    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)  # Markdown/rich text
    version = Column(Integer, nullable=False, default=1)

    effective_from = Column(DateTime(timezone=True), nullable=True)
    effective_until = Column(DateTime(timezone=True), nullable=True)
    status = Column(SQLEnum(PostOrderStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=PostOrderStatus.DRAFT, index=True)
    requires_acknowledgment = Column(Boolean, nullable=False, default=True)

    created_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    site = relationship("Site")
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    acknowledgments = relationship("PostOrderAcknowledgment", back_populates="post_order", cascade="all, delete-orphan")


class PostOrderAcknowledgment(Base):
    """Guard acknowledgment of a post order."""

    __tablename__ = "post_order_acknowledgments"

    ack_id = Column(Integer, primary_key=True, index=True)
    post_order_id = Column(Integer, ForeignKey("post_orders.post_order_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    acknowledged_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    post_order = relationship("PostOrder", back_populates="acknowledgments")
    employee = relationship("Employee")
