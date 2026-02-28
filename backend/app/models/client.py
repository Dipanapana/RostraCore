from sqlalchemy import Column, Integer, String, Text, Date, Numeric, Float, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Client(Base):
    """
    Client model representing organizations' clients (e.g., municipalities, departments).
    One organization (e.g., Do Dot) can have many clients (e.g., Magareng Municipality, Dept of Health).
    Each client can have many sites.
    """
    __tablename__ = "clients"

    client_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    client_name = Column(String(255), nullable=False, index=True)
    contact_person = Column(String(200), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    contract_start_date = Column(Date, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    billing_rate = Column(Numeric(10, 2), nullable=True)  # Hourly rate charged to this client
    target_margin_pct = Column(Float, nullable=True)  # Target wage-to-revenue margin % for this contract
    status = Column(String(50), nullable=False, default="active")  # active, inactive, suspended
    notes = Column(Text, nullable=True)

    # Invoice/billing fields
    vat_number = Column(String(20), nullable=True)  # Client's VAT registration number (for SARS full tax invoices)
    billing_address = Column(Text, nullable=True)  # Separate billing address (may differ from operational address)
    billing_email = Column(String(255), nullable=True)  # Email for invoice delivery
    billing_contact_name = Column(String(200), nullable=True)  # Who to address invoices to

    # Company registration & compliance
    registration_number = Column(String(50), nullable=True)  # CIPC/CK registration number
    company_type = Column(String(30), nullable=True)  # pty_ltd, cc, municipality, soe, npc, trust, sole_proprietor, other
    income_tax_number = Column(String(30), nullable=True)  # SARS income tax reference
    bbee_level = Column(Integer, nullable=True)  # B-BBEE contributor level (1-8)
    bbee_certificate_expiry = Column(Date, nullable=True)
    industry_sector = Column(String(30), nullable=True)  # government, retail, mining, residential, commercial, etc.

    # Payment terms
    payment_terms_days = Column(Integer, nullable=True, default=30)  # Net 30/60/90
    requires_purchase_order = Column(Boolean, nullable=True, default=False)

    # Operations contact (separate from billing/primary contact)
    operations_contact_name = Column(String(200), nullable=True)
    operations_contact_email = Column(String(255), nullable=True)
    operations_contact_phone = Column(String(20), nullable=True)

    # Emergency contact
    emergency_contact_name = Column(String(200), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)

    # Location
    province = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="clients")
    sites = relationship("Site", back_populates="client")
    invoices = relationship("ClientInvoice", back_populates="client", cascade="all, delete-orphan")
    roster_preferences = relationship("RosterPreferences", back_populates="client", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Client(client_id={self.client_id}, client_name='{self.client_name}', org_id={self.org_id})>"
