from sqlalchemy import Column, Integer, String, Text, Date, Numeric, DateTime, ForeignKey, func
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
    status = Column(String(50), nullable=False, default="active")  # active, inactive, suspended
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="clients")
    sites = relationship("Site", back_populates="client")
    invoices = relationship("ClientInvoice", back_populates="client", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Client(client_id={self.client_id}, client_name='{self.client_name}', org_id={self.org_id})>"
