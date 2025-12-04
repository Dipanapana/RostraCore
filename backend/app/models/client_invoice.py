"""Client invoice model for tracking billable hours and revenue."""

from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class ClientInvoice(Base):
    """Client invoice model - tracks billable hours and amounts to charge clients."""

    __tablename__ = "client_invoices"

    invoice_id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.client_id"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=False, index=True)

    # Invoice details
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    invoice_date = Column(Date, nullable=False, index=True)
    period_start = Column(Date, nullable=False, index=True)
    period_end = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)

    # Billable totals
    total_hours = Column(Float, nullable=False, default=0.0)
    total_shifts = Column(Integer, nullable=False, default=0)

    # Financial breakdown
    subtotal = Column(Float, nullable=False, default=0.0)  # Before tax
    tax_amount = Column(Float, nullable=False, default=0.0)  # VAT (15% in SA)
    total_amount = Column(Float, nullable=False, default=0.0)  # After tax

    # Payment tracking
    status = Column(String(20), nullable=False, default="draft")  # draft, sent, paid, overdue, cancelled
    paid_date = Column(Date, nullable=True)
    payment_reference = Column(String(100), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="invoices")
    organization = relationship("Organization")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ClientInvoice {self.invoice_number}: {self.client_id} - R{self.total_amount}>"


class InvoiceLineItem(Base):
    """Individual line items for invoices - typically one per site per period."""

    __tablename__ = "invoice_line_items"

    line_item_id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("client_invoices.invoice_id"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=True, index=True)

    # Description
    description = Column(String(500), nullable=False)  # e.g., "Security services at Zoo Lake Entrance Gate"

    # Quantities
    hours = Column(Float, nullable=False, default=0.0)
    shifts = Column(Integer, nullable=False, default=0)
    rate_per_hour = Column(Float, nullable=False)  # Client billing rate

    # Amounts
    amount = Column(Float, nullable=False, default=0.0)  # hours × rate_per_hour

    # Relationships
    invoice = relationship("ClientInvoice", back_populates="line_items")
    site = relationship("Site")

    def __repr__(self):
        return f"<InvoiceLineItem {self.line_item_id}: {self.description} - R{self.amount}>"
