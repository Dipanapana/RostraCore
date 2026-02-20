"""Document management model.

Maps to existing documents table for employee document storage.
"""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, ARRAY
from sqlalchemy.orm import relationship
from app.database import Base


class DocumentCategory(str, enum.Enum):
    CONTRACT = "contract"
    ID_DOCUMENT = "id_document"
    CERTIFICATE = "certificate"
    SOP = "sop"
    POLICY = "policy"
    REPORT = "report"
    LETTER = "letter"
    PHOTO = "photo"
    OTHER = "other"


class Document(Base):
    """Document metadata record — maps to existing documents table."""

    __tablename__ = "documents"

    document_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True, index=True)

    filename = Column(String(300), nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    mime_type = Column(String(100), nullable=False, default="application/octet-stream")
    s3_key = Column(String(500), nullable=False, default="")
    document_type = Column(String(50), nullable=False, default="other")
    tags = Column(ARRAY(String), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    version_number = Column(Integer, nullable=False, default=1)
    parent_document_id = Column(Integer, nullable=True)
    is_latest_version = Column(Boolean, nullable=False, default=True)

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)
    deleted_by_user_id = Column(Integer, nullable=True)

    # Audit
    uploaded_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=False)
    uploaded_at = Column(DateTime, nullable=False, server_default="now()")
    updated_at = Column(DateTime, nullable=False, server_default="now()")

    # Relationships
    organization = relationship("Organization")
    employee = relationship("Employee", foreign_keys=[employee_id])

    def __repr__(self):
        return f"<Document {self.document_id}: {self.filename}>"
