"""Client invoice API endpoints - Generate and manage client invoices."""

import io
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import date, datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.client_invoice import ClientInvoice, InvoiceLineItem
from app.models.client import Client
from app.models.site import Site
from app.models.shift import Shift
from app.models.shift_assignment import ShiftAssignment
from app.models.organization import Organization
from app.auth.security import get_current_org_id

router = APIRouter()


# Pydantic schemas
class InvoiceLineItemCreate(BaseModel):
    """Line item for invoice creation."""
    site_id: Optional[int] = None
    description: str = Field(..., max_length=500)
    hours: float = Field(..., ge=0)
    shifts: int = Field(..., ge=0)
    rate_per_hour: float = Field(..., ge=0)


class InvoiceCreate(BaseModel):
    """Invoice creation schema."""
    client_id: int
    period_start: date
    period_end: date
    due_date: Optional[date] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    purchase_order_number: Optional[str] = None


class InvoiceResponse(BaseModel):
    """Invoice response schema."""
    invoice_id: int
    client_id: int
    client_name: str = "Unknown"
    invoice_number: str
    invoice_date: date
    period_start: date
    period_end: date
    due_date: Optional[date] = None
    total_hours: Optional[float] = 0.0
    total_shifts: Optional[int] = 0
    subtotal: Optional[float] = 0.0
    tax_amount: Optional[float] = 0.0
    total_amount: Optional[float] = 0.0
    status: Optional[str] = "draft"
    paid_date: Optional[date] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    purchase_order_number: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LineItemResponse(BaseModel):
    """Line item response schema."""
    line_item_id: int
    site_id: Optional[int]
    site_name: Optional[str]
    description: str
    hours: float
    shifts: int
    rate_per_hour: float
    amount: float

    class Config:
        from_attributes = True


class InvoiceDetailResponse(InvoiceResponse):
    """Detailed invoice with line items."""
    line_items: List[LineItemResponse]


@router.get("/", response_model=List[InvoiceResponse])
async def list_invoices(
    client_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    List all invoices for the organization with optional filters.
    """
    query = db.query(ClientInvoice).filter(ClientInvoice.org_id == org_id)

    if client_id:
        query = query.filter(ClientInvoice.client_id == client_id)

    if status:
        query = query.filter(ClientInvoice.status == status)

    invoices = query.order_by(ClientInvoice.invoice_date.desc()).offset(skip).limit(limit).all()

    # Build response with client names
    # Cache client lookups
    client_cache: dict[int, str] = {}
    result = []
    for inv in invoices:
        if inv.client_id not in client_cache:
            client = db.query(Client).filter(Client.client_id == inv.client_id).first()
            client_cache[inv.client_id] = client.client_name if client else "Unknown"
        result.append(InvoiceResponse(
            invoice_id=inv.invoice_id,
            client_id=inv.client_id,
            client_name=client_cache[inv.client_id],
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            period_start=inv.period_start,
            period_end=inv.period_end,
            due_date=inv.due_date,
            total_hours=inv.total_hours,
            total_shifts=inv.total_shifts,
            subtotal=inv.subtotal,
            tax_amount=inv.tax_amount,
            total_amount=inv.total_amount,
            status=inv.status,
            paid_date=inv.paid_date,
            payment_reference=inv.payment_reference,
            notes=inv.notes,
            payment_terms=inv.payment_terms,
            purchase_order_number=inv.purchase_order_number,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
        ))

    return result


@router.get("/{invoice_id}", response_model=InvoiceDetailResponse)
async def get_invoice(
    invoice_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get detailed invoice with line items.
    """
    invoice = db.query(ClientInvoice).filter(
        ClientInvoice.invoice_id == invoice_id,
        ClientInvoice.org_id == org_id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Get client name
    client = db.query(Client).filter(Client.client_id == invoice.client_id).first()

    # Get line items with site names
    line_items_response = []
    for item in invoice.line_items:
        site = db.query(Site).filter(Site.site_id == item.site_id).first() if item.site_id else None
        line_items_response.append({
            **item.__dict__,
            "site_name": site.site_name if site else None
        })

    return {
        **invoice.__dict__,
        "client_name": client.client_name if client else "Unknown",
        "line_items": line_items_response
    }


@router.get("/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Generate and return a PDF for the specified invoice.
    """
    from app.services.invoice_pdf_generator import generate_invoice_pdf_from_db

    invoice = db.query(ClientInvoice).filter(
        ClientInvoice.invoice_id == invoice_id,
        ClientInvoice.org_id == org_id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Generate PDF using database-aware convenience function
    pdf_bytes = generate_invoice_pdf_from_db(db, invoice.invoice_id, org_id)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'
        }
    )


@router.post("/generate", response_model=InvoiceDetailResponse, status_code=status.HTTP_201_CREATED)
async def generate_invoice(
    invoice_data: InvoiceCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Generate an invoice for a client based on shift assignments for the period.

    Automatically calculates billable hours and amounts from confirmed shift assignments.
    """
    # Verify client belongs to organization
    client = db.query(Client).filter(
        Client.client_id == invoice_data.client_id,
        Client.org_id == org_id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found in your organization"
        )

    # Generate invoice number (format: INV-ORGID-CLIENTID-YYYYMMDD-SEQUENCE)
    today = date.today()
    invoice_prefix = f"INV-{org_id}-{invoice_data.client_id}-{today.strftime('%Y%m%d')}"

    # Find last invoice with this prefix
    last_invoice = db.query(ClientInvoice).filter(
        ClientInvoice.invoice_number.like(f"{invoice_prefix}%")
    ).order_by(ClientInvoice.invoice_number.desc()).first()

    if last_invoice:
        # Extract sequence number and increment
        last_seq = int(last_invoice.invoice_number.split('-')[-1])
        sequence = last_seq + 1
    else:
        sequence = 1

    invoice_number = f"{invoice_prefix}-{sequence:03d}"

    # Get all sites for this client
    sites = db.query(Site).filter(Site.client_id == invoice_data.client_id).all()

    if not sites:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client has no sites configured"
        )

    # Create invoice
    invoice = ClientInvoice(
        client_id=invoice_data.client_id,
        org_id=org_id,
        invoice_number=invoice_number,
        invoice_date=today,
        period_start=invoice_data.period_start,
        period_end=invoice_data.period_end,
        due_date=invoice_data.due_date or (today + timedelta(days=30)),
        total_hours=0.0,
        total_shifts=0,
        subtotal=0.0,
        tax_amount=0.0,
        total_amount=0.0,
        status="draft",
        notes=invoice_data.notes,
        payment_terms=invoice_data.payment_terms or "Net 30",
        purchase_order_number=invoice_data.purchase_order_number
    )

    db.add(invoice)
    db.flush()  # Get invoice_id

    # Calculate billable amounts per site
    total_hours = 0.0
    total_shifts = 0
    subtotal = 0.0

    for site in sites:
        # Get all confirmed shift assignments for this site in the period
        assignments = db.query(ShiftAssignment).join(Shift).filter(
            and_(
                Shift.site_id == site.site_id,
                Shift.start_time >= datetime.combine(invoice_data.period_start, datetime.min.time()),
                Shift.end_time <= datetime.combine(invoice_data.period_end, datetime.max.time()),
                ShiftAssignment.status.in_(["confirmed", "completed"])  # Bill confirmed and completed shifts
            )
        ).all()

        if not assignments:
            continue  # Skip sites with no assignments in this period

        # Calculate totals for this site
        site_hours = sum(a.regular_hours + a.overtime_hours for a in assignments)
        site_shifts = len(set(a.shift_id for a in assignments))  # Unique shifts
        site_rate = float(site.billing_rate) if site.billing_rate else float(client.billing_rate or 120.0)
        site_amount = site_hours * site_rate

        # Create line item
        line_item = InvoiceLineItem(
            invoice_id=invoice.invoice_id,
            site_id=site.site_id,
            description=f"Security services at {site.site_name}",
            hours=site_hours,
            shifts=site_shifts,
            rate_per_hour=site_rate,
            amount=site_amount
        )

        db.add(line_item)

        # Add to totals
        total_hours += site_hours
        total_shifts += site_shifts
        subtotal += site_amount

    if subtotal == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No confirmed shift assignments found for this period. Cannot generate invoice with R0.00"
        )

    # Calculate tax (15% VAT in South Africa)
    tax_amount = subtotal * 0.15
    total_amount = subtotal + tax_amount

    # Update invoice totals
    invoice.total_hours = total_hours
    invoice.total_shifts = total_shifts
    invoice.subtotal = subtotal
    invoice.tax_amount = tax_amount
    invoice.total_amount = total_amount

    db.commit()
    db.refresh(invoice)

    # Return detailed response
    return await get_invoice(invoice.invoice_id, org_id, db)


@router.patch("/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: int,
    new_status: str = Query(..., regex="^(draft|sent|paid|overdue|cancelled)$"),
    payment_reference: Optional[str] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Update invoice status (draft → sent → paid/overdue/cancelled).
    """
    invoice = db.query(ClientInvoice).filter(
        ClientInvoice.invoice_id == invoice_id,
        ClientInvoice.org_id == org_id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    invoice.status = new_status

    if new_status == "paid":
        invoice.paid_date = date.today()
        if payment_reference:
            invoice.payment_reference = payment_reference

    db.commit()
    db.refresh(invoice)

    return {"message": f"Invoice status updated to {new_status}", "invoice_id": invoice_id}


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Delete an invoice (only if status is draft).
    """
    invoice = db.query(ClientInvoice).filter(
        ClientInvoice.invoice_id == invoice_id,
        ClientInvoice.org_id == org_id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    if invoice.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete invoice with status '{invoice.status}'. Only draft invoices can be deleted."
        )

    db.delete(invoice)
    db.commit()

    return {"message": "Invoice deleted successfully"}


@router.get("/stats/summary")
async def get_invoice_summary(
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get invoice summary statistics for the organization.
    """
    query = db.query(ClientInvoice).filter(ClientInvoice.org_id == org_id)

    if period_start:
        query = query.filter(ClientInvoice.invoice_date >= period_start)

    if period_end:
        query = query.filter(ClientInvoice.invoice_date <= period_end)

    invoices = query.all()

    # Calculate totals by status
    total_draft = sum(inv.total_amount for inv in invoices if inv.status == "draft")
    total_sent = sum(inv.total_amount for inv in invoices if inv.status == "sent")
    total_paid = sum(inv.total_amount for inv in invoices if inv.status == "paid")
    total_overdue = sum(inv.total_amount for inv in invoices if inv.status == "overdue")

    return {
        "period_start": period_start.isoformat() if period_start else None,
        "period_end": period_end.isoformat() if period_end else None,
        "total_invoices": len(invoices),
        "total_amount": sum(inv.total_amount for inv in invoices),
        "by_status": {
            "draft": {"count": len([i for i in invoices if i.status == "draft"]), "amount": total_draft},
            "sent": {"count": len([i for i in invoices if i.status == "sent"]), "amount": total_sent},
            "paid": {"count": len([i for i in invoices if i.status == "paid"]), "amount": total_paid},
            "overdue": {"count": len([i for i in invoices if i.status == "overdue"]), "amount": total_overdue}
        },
        "outstanding": total_sent + total_overdue,
        "revenue": total_paid
    }
