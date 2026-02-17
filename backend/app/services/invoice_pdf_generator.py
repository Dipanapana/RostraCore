"""Invoice PDF Generator Service - SARS VAT Act Section 20 Compliant.

Generates professional tax invoice PDFs with full South African compliance:
- SARS-required fields for full tax invoices (>R5,000)
- Supplier and recipient details (names, addresses, VAT numbers)
- Line-item breakdown with quantities, rates, and amounts
- VAT calculation at 15%
- Banking/payment details
- Multiple template styles (professional, modern, classic)

Follows the same patterns as payslip_generator.py:
- Dataclasses for structured input
- ReportLab for PDF generation
- A4 page size
- ZAR currency formatting
"""

import io
import logging
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Literal
from dataclasses import dataclass, field

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    HRFlowable, Image, PageBreak, KeepTogether
)

logger = logging.getLogger(__name__)

# Page dimensions
PAGE_WIDTH, PAGE_HEIGHT = A4  # 595.27, 841.89 points
CONTENT_WIDTH = PAGE_WIDTH - 1.0 * inch  # 0.5in margins each side

# VAT rate for South Africa
SA_VAT_RATE = Decimal("0.15")


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class CompanyDetails:
    """Supplier / organization details for the invoice header.

    Maps to Organization model fields.
    """
    company_name: str
    registration_number: str = ""   # CIPC e.g. 2020/123456/07
    psira_registration: str = ""    # PSIRA company registration
    vat_number: str = ""            # SARS VAT number e.g. 4XXXXXXXXXX
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    postal_code: str = ""
    phone: str = ""
    email: str = ""
    logo_url: Optional[str] = None  # URL to company logo (S3 or similar)


@dataclass
class ClientDetails:
    """Recipient / client details for the BILL TO section.

    Maps to Client model fields.
    """
    client_name: str
    contact_person: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    address: str = ""               # Full address text
    vat_number: str = ""            # Client VAT number (if VAT-registered)
    purchase_order: str = ""        # Client PO reference


@dataclass
class InvoiceLineItem:
    """A single billable line item on the invoice."""
    description: str
    hours: float = 0.0
    shifts: int = 0
    rate_per_hour: float = 0.0
    amount: float = 0.0            # Pre-calculated: hours * rate_per_hour


@dataclass
class InvoiceData:
    """Complete invoice data structure."""
    invoice_number: str
    invoice_date: date
    due_date: Optional[date] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    line_items: List[InvoiceLineItem] = field(default_factory=list)

    # Financial totals (can be provided or auto-calculated)
    subtotal: Optional[float] = None
    vat_rate: float = 0.15
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None

    # Optional metadata
    status: str = "draft"
    notes: str = ""
    payment_terms: str = "Net 30"

    def calculate_totals(self) -> None:
        """Recalculate subtotal, tax, and total from line items."""
        self.subtotal = sum(item.amount for item in self.line_items)
        self.tax_amount = round(self.subtotal * self.vat_rate, 2)
        self.total_amount = round(self.subtotal + self.tax_amount, 2)


@dataclass
class BankingDetails:
    """Payment / banking details shown on the invoice."""
    bank_name: str = ""
    account_name: str = ""
    account_number: str = ""
    branch_code: str = ""
    account_type: str = "Current"
    swift_code: str = ""
    reference: str = ""             # Suggested payment reference


# ---------------------------------------------------------------------------
# Template colour palettes
# ---------------------------------------------------------------------------

class _ProfessionalPalette:
    """Clean blue accents, modern corporate look."""
    PRIMARY = colors.HexColor('#1E3A5F')       # Deep navy blue
    ACCENT = colors.HexColor('#2B6CB0')        # Medium blue
    HEADER_BG = colors.HexColor('#1E3A5F')     # Navy for header bar
    TABLE_HEADER_BG = colors.HexColor('#EBF4FF')  # Very light blue
    TABLE_ALT_ROW = colors.HexColor('#F7FAFC')    # Almost white blue
    TOTAL_BG = colors.HexColor('#1E3A5F')      # Navy for total row
    TOTAL_TEXT = colors.white
    TEXT = colors.HexColor('#2D3748')           # Charcoal
    MUTED = colors.HexColor('#718096')          # Gray
    BORDER = colors.HexColor('#CBD5E0')         # Light gray border
    LIGHT_BG = colors.HexColor('#F7FAFC')      # Background tint
    PAYMENT_BG = colors.HexColor('#EBF4FF')    # Light blue
    DIVIDER = colors.HexColor('#2B6CB0')       # Blue divider


class _ModernPalette:
    """Minimal, lots of whitespace, sans-serif, gray tones."""
    PRIMARY = colors.HexColor('#374151')       # Dark gray
    ACCENT = colors.HexColor('#6B7280')        # Medium gray
    HEADER_BG = colors.HexColor('#F9FAFB')     # Almost white
    TABLE_HEADER_BG = colors.HexColor('#F3F4F6')  # Light gray
    TABLE_ALT_ROW = colors.HexColor('#FAFAFA')
    TOTAL_BG = colors.HexColor('#374151')      # Dark gray
    TOTAL_TEXT = colors.white
    TEXT = colors.HexColor('#1F2937')           # Near black
    MUTED = colors.HexColor('#9CA3AF')         # Light gray text
    BORDER = colors.HexColor('#E5E7EB')        # Very light border
    LIGHT_BG = colors.HexColor('#F9FAFB')
    PAYMENT_BG = colors.HexColor('#F3F4F6')
    DIVIDER = colors.HexColor('#D1D5DB')


class _ClassicPalette:
    """Traditional bordered tables, formal, black/dark blue."""
    PRIMARY = colors.HexColor('#1B1B3A')       # Very dark blue/black
    ACCENT = colors.HexColor('#1B1B3A')        # Same dark
    HEADER_BG = colors.HexColor('#1B1B3A')     # Dark header
    TABLE_HEADER_BG = colors.HexColor('#D4D8E8')  # Muted blue/gray
    TABLE_ALT_ROW = colors.HexColor('#EEEEF5')
    TOTAL_BG = colors.HexColor('#1B1B3A')      # Dark
    TOTAL_TEXT = colors.white
    TEXT = colors.HexColor('#1B1B3A')           # Near black
    MUTED = colors.HexColor('#555577')         # Muted blue-gray
    BORDER = colors.HexColor('#8888AA')        # Visible border
    LIGHT_BG = colors.HexColor('#F0F0F8')
    PAYMENT_BG = colors.HexColor('#EEEEF5')
    DIVIDER = colors.HexColor('#1B1B3A')


_PALETTES = {
    'professional': _ProfessionalPalette,
    'modern': _ModernPalette,
    'classic': _ClassicPalette,
}


# ---------------------------------------------------------------------------
# PDF Generator
# ---------------------------------------------------------------------------

class InvoicePDFGenerator:
    """Generate SARS-compliant tax invoice PDFs with configurable templates.

    Supports three visual templates:
    - professional: Clean blue accents, modern corporate look (default)
    - modern: Minimal, whitespace-heavy, gray tones
    - classic: Traditional bordered tables, formal appearance

    All templates produce identical SARS-compliant content; only visual
    styling differs.
    """

    def __init__(self, template: str = 'professional'):
        if template not in _PALETTES:
            raise ValueError(
                f"Unknown template '{template}'. "
                f"Choose from: {', '.join(_PALETTES.keys())}"
            )
        self.template = template
        self.P = _PALETTES[template]
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    # ------------------------------------------------------------------
    # Style setup
    # ------------------------------------------------------------------

    def _setup_custom_styles(self):
        """Create paragraph styles tuned to the selected palette."""
        P = self.P

        self.style_title = ParagraphStyle(
            'InvTitle', parent=self.styles['Heading1'],
            fontSize=22, fontName='Helvetica-Bold',
            textColor=P.PRIMARY, spaceAfter=0, alignment=TA_RIGHT,
        )
        self.style_company = ParagraphStyle(
            'InvCompany', parent=self.styles['Normal'],
            fontSize=13, fontName='Helvetica-Bold',
            textColor=P.PRIMARY, spaceAfter=1,
        )
        self.style_company_detail = ParagraphStyle(
            'InvCompanyDetail', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica',
            textColor=P.MUTED, leading=11,
        )
        self.style_section_label = ParagraphStyle(
            'InvSectionLabel', parent=self.styles['Normal'],
            fontSize=9, fontName='Helvetica-Bold',
            textColor=P.ACCENT, spaceBefore=0, spaceAfter=4,
        )
        self.style_label = ParagraphStyle(
            'InvLabel', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica',
            textColor=P.MUTED,
        )
        self.style_value = ParagraphStyle(
            'InvValue', parent=self.styles['Normal'],
            fontSize=9, fontName='Helvetica-Bold',
            textColor=P.TEXT,
        )
        self.style_value_right = ParagraphStyle(
            'InvValueRight', parent=self.styles['Normal'],
            fontSize=9, fontName='Helvetica-Bold',
            textColor=P.TEXT, alignment=TA_RIGHT,
        )
        self.style_table_header = ParagraphStyle(
            'InvTableHeader', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica-Bold',
            textColor=P.PRIMARY,
        )
        self.style_table_cell = ParagraphStyle(
            'InvTableCell', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica',
            textColor=P.TEXT,
        )
        self.style_table_cell_right = ParagraphStyle(
            'InvTableCellR', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica',
            textColor=P.TEXT, alignment=TA_RIGHT,
        )
        self.style_table_cell_center = ParagraphStyle(
            'InvTableCellC', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica',
            textColor=P.TEXT, alignment=TA_CENTER,
        )
        self.style_total_label = ParagraphStyle(
            'InvTotalLabel', parent=self.styles['Normal'],
            fontSize=10, fontName='Helvetica-Bold',
            textColor=P.TOTAL_TEXT, alignment=TA_RIGHT,
        )
        self.style_total_value = ParagraphStyle(
            'InvTotalValue', parent=self.styles['Normal'],
            fontSize=12, fontName='Helvetica-Bold',
            textColor=P.TOTAL_TEXT, alignment=TA_RIGHT,
        )
        self.style_footer = ParagraphStyle(
            'InvFooter', parent=self.styles['Normal'],
            fontSize=7, fontName='Helvetica',
            textColor=P.MUTED, alignment=TA_CENTER,
        )
        self.style_notes = ParagraphStyle(
            'InvNotes', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica',
            textColor=P.TEXT, leading=11,
        )

    # ------------------------------------------------------------------
    # Formatting helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _fmt_currency(amount: float) -> str:
        """Format as South African Rand: R55,440.00"""
        return f"R{amount:,.2f}"

    @staticmethod
    def _fmt_date(d: Optional[date]) -> str:
        """Format date as '17 Feb 2026'."""
        if d is None:
            return ""
        return d.strftime("%d %b %Y")

    @staticmethod
    def _fmt_period(start: Optional[date], end: Optional[date]) -> str:
        """Format period range like '01-28 Feb 2026'."""
        if not start or not end:
            return ""
        if start.month == end.month and start.year == end.year:
            return f"{start.strftime('%d')}-{end.strftime('%d %b %Y')}"
        return f"{start.strftime('%d %b')} - {end.strftime('%d %b %Y')}"

    def _fetch_logo(self, url: Optional[str]) -> Optional[Image]:
        """Attempt to download a logo from URL and return a ReportLab Image.

        Returns None on any failure so the invoice still generates without
        a logo.
        """
        if not url:
            return None
        try:
            import urllib.request
            import tempfile
            import os

            # Download to temp file
            req = urllib.request.Request(url, headers={'User-Agent': 'RostraCore/1.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()

            # Determine extension from content type
            content_type = resp.headers.get('Content-Type', '')
            ext = '.png'
            if 'jpeg' in content_type or 'jpg' in content_type:
                ext = '.jpg'
            elif 'gif' in content_type:
                ext = '.gif'

            # Write to temp file
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
            tmp.write(data)
            tmp.close()

            # Create Image flowable, constrain to reasonable header size
            img = Image(tmp.name, width=1.2 * inch, height=0.6 * inch)
            img.hAlign = 'LEFT'

            # Clean up temp file after reading
            # Note: ReportLab reads the file during build, so we keep it
            # and rely on OS temp cleanup. For production, a proper cleanup
            # mechanism would be used.
            return img

        except Exception as e:
            logger.warning(f"Could not fetch logo from {url}: {e}")
            return None

    # ------------------------------------------------------------------
    # Section builders
    # ------------------------------------------------------------------

    def _build_header(
        self, company: CompanyDetails, invoice: InvoiceData
    ) -> List:
        """Build the top header: company info + TAX INVOICE title."""
        elements = []
        P = self.P

        # --- Logo or company name on the left ---
        logo_img = self._fetch_logo(company.logo_url)

        left_parts = []
        if logo_img:
            left_parts.append([logo_img])
        left_parts.append([Paragraph(company.company_name.upper(), self.style_company)])

        # Registration line
        reg_parts = []
        if company.registration_number:
            reg_parts.append(f"Registration: {company.registration_number}")
        if company.psira_registration:
            reg_parts.append(f"PSIRA: {company.psira_registration}")
        if company.vat_number:
            reg_parts.append(f"VAT: {company.vat_number}")
        if reg_parts:
            left_parts.append([Paragraph(
                "    ".join(reg_parts), self.style_company_detail
            )])

        # Address and contact
        addr_parts = []
        if company.address_line1:
            addr_parts.append(company.address_line1)
        if company.address_line2:
            addr_parts.append(company.address_line2)
        city_postal = ""
        if company.city:
            city_postal = company.city
            if company.postal_code:
                city_postal += f", {company.postal_code}"
        if city_postal:
            addr_parts.append(city_postal)
        contact_parts = []
        if company.phone:
            contact_parts.append(f"Tel: {company.phone}")
        if company.email:
            contact_parts.append(company.email)
        if addr_parts or contact_parts:
            detail_text = " | ".join(filter(None, [
                ", ".join(addr_parts) if addr_parts else None,
                " | ".join(contact_parts) if contact_parts else None,
            ]))
            left_parts.append([Paragraph(detail_text, self.style_company_detail)])

        left_table = Table(left_parts, colWidths=[4.2 * inch])
        left_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))

        # --- TAX INVOICE title on the right ---
        right_content = Paragraph("TAX INVOICE", self.style_title)

        header_data = [[left_table, right_content]]
        header_table = Table(header_data, colWidths=[4.2 * inch, 3.3 * inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ]))

        elements.append(header_table)
        elements.append(Spacer(1, 0.15 * inch))

        # Divider
        elements.append(HRFlowable(
            width="100%", thickness=2, color=P.DIVIDER, spaceAfter=10
        ))

        return elements

    def _build_bill_to_and_details(
        self, client: ClientDetails, invoice: InvoiceData
    ) -> List:
        """Build the BILL TO (left) and INVOICE DETAILS (right) section."""
        elements = []
        P = self.P

        # --- BILL TO (left) ---
        bill_rows = [
            [Paragraph("BILL TO:", self.style_section_label)],
        ]
        bill_rows.append([Paragraph(client.client_name, ParagraphStyle(
            'ClientName', fontSize=10, fontName='Helvetica-Bold',
            textColor=P.TEXT,
        ))])
        if client.contact_person:
            bill_rows.append([Paragraph(
                f"Attn: {client.contact_person}", self.style_table_cell
            )])
        if client.address:
            # Split multi-line addresses
            for line in client.address.split('\n'):
                line = line.strip()
                if line:
                    bill_rows.append([Paragraph(line, self.style_table_cell)])
        if client.vat_number:
            bill_rows.append([Paragraph(
                f"VAT: {client.vat_number}", self.style_table_cell
            )])
        if client.contact_email:
            bill_rows.append([Paragraph(client.contact_email, ParagraphStyle(
                'ClientEmail', fontSize=8, fontName='Helvetica',
                textColor=P.MUTED,
            ))])

        bill_table = Table(bill_rows, colWidths=[3.5 * inch])
        bill_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))

        # --- INVOICE DETAILS (right) ---
        detail_rows = [
            [Paragraph("INVOICE DETAILS:", self.style_section_label), ''],
        ]
        detail_rows.append([
            Paragraph('Invoice #:', self.style_label),
            Paragraph(invoice.invoice_number, self.style_value_right),
        ])
        detail_rows.append([
            Paragraph('Date:', self.style_label),
            Paragraph(self._fmt_date(invoice.invoice_date), self.style_value_right),
        ])
        if invoice.due_date:
            detail_rows.append([
                Paragraph('Due Date:', self.style_label),
                Paragraph(self._fmt_date(invoice.due_date), self.style_value_right),
            ])
        if client.purchase_order:
            detail_rows.append([
                Paragraph('PO #:', self.style_label),
                Paragraph(client.purchase_order, self.style_value_right),
            ])
        if invoice.period_start and invoice.period_end:
            detail_rows.append([
                Paragraph('Period:', self.style_label),
                Paragraph(
                    self._fmt_period(invoice.period_start, invoice.period_end),
                    self.style_value_right,
                ),
            ])
        detail_rows.append([
            Paragraph('Status:', self.style_label),
            Paragraph(invoice.status.upper(), self.style_value_right),
        ])

        detail_table = Table(detail_rows, colWidths=[1.3 * inch, 2.2 * inch])
        detail_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            # Subtle bottom borders on detail rows
            ('LINEBELOW', (0, 1), (-1, -1), 0.5, P.BORDER),
        ]))

        # Combine left and right
        layout = [[bill_table, detail_table]]
        layout_table = Table(layout, colWidths=[4.0 * inch, 3.5 * inch])
        layout_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        elements.append(layout_table)
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _build_line_items_table(self, invoice: InvoiceData) -> List:
        """Build the line items table with column headers."""
        elements = []
        P = self.P

        # Ensure totals are calculated
        if invoice.subtotal is None:
            invoice.calculate_totals()

        # Column widths: #, Description, Hours, Shifts, Rate, Amount
        col_widths = [0.4 * inch, 3.0 * inch, 0.8 * inch, 0.7 * inch, 1.0 * inch, 1.6 * inch]

        # Header row
        header_cells = [
            Paragraph('#', ParagraphStyle(
                'THC', fontSize=8, fontName='Helvetica-Bold',
                textColor=P.PRIMARY, alignment=TA_CENTER,
            )),
            Paragraph('Description', ParagraphStyle(
                'THL', fontSize=8, fontName='Helvetica-Bold',
                textColor=P.PRIMARY,
            )),
            Paragraph('Hours', ParagraphStyle(
                'THR1', fontSize=8, fontName='Helvetica-Bold',
                textColor=P.PRIMARY, alignment=TA_RIGHT,
            )),
            Paragraph('Shifts', ParagraphStyle(
                'THR2', fontSize=8, fontName='Helvetica-Bold',
                textColor=P.PRIMARY, alignment=TA_CENTER,
            )),
            Paragraph('Rate', ParagraphStyle(
                'THR3', fontSize=8, fontName='Helvetica-Bold',
                textColor=P.PRIMARY, alignment=TA_RIGHT,
            )),
            Paragraph('Amount', ParagraphStyle(
                'THR4', fontSize=8, fontName='Helvetica-Bold',
                textColor=P.PRIMARY, alignment=TA_RIGHT,
            )),
        ]

        table_data = [header_cells]

        # Data rows
        for idx, item in enumerate(invoice.line_items, start=1):
            row = [
                Paragraph(str(idx), self.style_table_cell_center),
                Paragraph(item.description, self.style_table_cell),
                Paragraph(
                    f"{item.hours:,.1f}" if item.hours > 0 else "-",
                    self.style_table_cell_right,
                ),
                Paragraph(
                    str(item.shifts) if item.shifts > 0 else "-",
                    self.style_table_cell_center,
                ),
                Paragraph(
                    self._fmt_currency(item.rate_per_hour) if item.rate_per_hour > 0 else "-",
                    self.style_table_cell_right,
                ),
                Paragraph(self._fmt_currency(item.amount), self.style_table_cell_right),
            ]
            table_data.append(row)

        # Build the main items table
        items_table = Table(table_data, colWidths=col_widths, repeatRows=1)

        # Base style rules
        style_commands = [
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), P.TABLE_HEADER_BG),
            ('LINEBELOW', (0, 0), (-1, 0), 1, P.BORDER),
            # Alignment
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]

        # Alternating row backgrounds
        for i in range(1, len(table_data)):
            if i % 2 == 0:
                style_commands.append(
                    ('BACKGROUND', (0, i), (-1, i), P.TABLE_ALT_ROW)
                )
            # Bottom border on each data row
            style_commands.append(
                ('LINEBELOW', (0, i), (-1, i), 0.5, P.BORDER)
            )

        # Classic template gets full grid borders
        if self.template == 'classic':
            style_commands.append(('GRID', (0, 0), (-1, -1), 0.5, P.BORDER))

        items_table.setStyle(TableStyle(style_commands))
        elements.append(items_table)

        # --- Totals section (right-aligned) ---
        elements.append(Spacer(1, 0.05 * inch))

        subtotal = invoice.subtotal or 0.0
        tax_amount = invoice.tax_amount or 0.0
        total_amount = invoice.total_amount or 0.0
        vat_pct = int(invoice.vat_rate * 100)

        totals_data = [
            [
                Paragraph('Subtotal (excl. VAT):', ParagraphStyle(
                    'TotLbl', fontSize=9, fontName='Helvetica',
                    textColor=P.TEXT, alignment=TA_RIGHT,
                )),
                Paragraph(self._fmt_currency(subtotal), ParagraphStyle(
                    'TotVal', fontSize=9, fontName='Helvetica-Bold',
                    textColor=P.TEXT, alignment=TA_RIGHT,
                )),
            ],
            [
                Paragraph(f'VAT ({vat_pct}%):', ParagraphStyle(
                    'VatLbl', fontSize=9, fontName='Helvetica',
                    textColor=P.TEXT, alignment=TA_RIGHT,
                )),
                Paragraph(self._fmt_currency(tax_amount), ParagraphStyle(
                    'VatVal', fontSize=9, fontName='Helvetica-Bold',
                    textColor=P.TEXT, alignment=TA_RIGHT,
                )),
            ],
            [
                Paragraph('TOTAL (incl. VAT):', self.style_total_label),
                Paragraph(self._fmt_currency(total_amount), self.style_total_value),
            ],
        ]

        # Widths for totals: spacer + label + value
        totals_table = Table(
            totals_data,
            colWidths=[1.8 * inch, 1.6 * inch],
            hAlign='RIGHT',
        )

        totals_style = [
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            # Line above subtotal
            ('LINEABOVE', (0, 0), (-1, 0), 0.5, P.BORDER),
            # Line above total
            ('LINEABOVE', (0, 2), (-1, 2), 1, P.PRIMARY),
            # Total row background
            ('BACKGROUND', (0, 2), (-1, 2), P.TOTAL_BG),
        ]

        totals_table.setStyle(TableStyle(totals_style))
        elements.append(totals_table)
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _build_payment_details(
        self, banking: BankingDetails, invoice: InvoiceData
    ) -> List:
        """Build the banking / payment details section."""
        elements = []
        P = self.P

        if not banking.bank_name and not banking.account_number:
            return elements

        elements.append(Paragraph("PAYMENT DETAILS", self.style_section_label))
        elements.append(Spacer(1, 0.05 * inch))

        # Build payment info rows
        pay_rows = []
        if banking.bank_name:
            pay_rows.append([
                Paragraph('Bank:', self.style_label),
                Paragraph(banking.bank_name, self.style_value),
            ])
        if banking.account_name:
            pay_rows.append([
                Paragraph('Account Name:', self.style_label),
                Paragraph(banking.account_name, self.style_value),
            ])
        if banking.account_number:
            pay_rows.append([
                Paragraph('Account Number:', self.style_label),
                Paragraph(banking.account_number, self.style_value),
            ])
        if banking.branch_code:
            pay_rows.append([
                Paragraph('Branch Code:', self.style_label),
                Paragraph(banking.branch_code, self.style_value),
            ])
        if banking.account_type:
            pay_rows.append([
                Paragraph('Account Type:', self.style_label),
                Paragraph(banking.account_type, self.style_value),
            ])
        if banking.swift_code:
            pay_rows.append([
                Paragraph('SWIFT Code:', self.style_label),
                Paragraph(banking.swift_code, self.style_value),
            ])

        # Payment reference (use invoice number as default)
        ref = banking.reference or invoice.invoice_number
        pay_rows.append([
            Paragraph('Reference:', self.style_label),
            Paragraph(ref, ParagraphStyle(
                'PayRef', fontSize=9, fontName='Helvetica-Bold',
                textColor=P.ACCENT,
            )),
        ])

        pay_table = Table(pay_rows, colWidths=[1.4 * inch, 3.0 * inch])
        pay_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), P.PAYMENT_BG),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, P.BORDER),
        ]))

        elements.append(pay_table)
        elements.append(Spacer(1, 0.15 * inch))

        return elements

    def _build_notes_and_terms(self, invoice: InvoiceData) -> List:
        """Build optional notes and payment terms."""
        elements = []
        P = self.P

        terms_parts = []
        if invoice.payment_terms:
            terms_parts.append(f"Payment Terms: {invoice.payment_terms}")
        if invoice.notes:
            terms_parts.append(invoice.notes)

        if terms_parts:
            elements.append(HRFlowable(
                width="100%", thickness=0.5, color=P.BORDER,
                spaceBefore=4, spaceAfter=8,
            ))
            for part in terms_parts:
                elements.append(Paragraph(part, self.style_notes))
                elements.append(Spacer(1, 0.04 * inch))

        # Thank you message
        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph(
            "Thank you for your business.",
            ParagraphStyle(
                'ThankYou', fontSize=9, fontName='Helvetica-Oblique',
                textColor=P.MUTED, alignment=TA_CENTER,
            )
        ))

        return elements

    def _build_footer(self, invoice: InvoiceData) -> List:
        """Build the footer with generation timestamp."""
        elements = []
        P = self.P

        elements.append(Spacer(1, 0.15 * inch))
        elements.append(HRFlowable(
            width="100%", thickness=0.5, color=P.BORDER,
            spaceBefore=8, spaceAfter=6,
        ))

        footer_text = (
            f"This is a computer-generated tax invoice. | "
            f"Generated: {datetime.now().strftime('%d %B %Y %H:%M')} | "
            f"All amounts in South African Rand (ZAR)"
        )
        elements.append(Paragraph(footer_text, self.style_footer))

        return elements

    # ------------------------------------------------------------------
    # Page number callback
    # ------------------------------------------------------------------

    def _add_page_number(self, canvas, doc):
        """Add page number at the bottom of each page."""
        page_num = canvas.getPageNumber()
        text = f"Page {page_num}"
        canvas.saveState()
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(self.P.MUTED)
        canvas.drawRightString(PAGE_WIDTH - 0.5 * inch, 0.35 * inch, text)
        canvas.restoreState()

    # ------------------------------------------------------------------
    # Main generation method
    # ------------------------------------------------------------------

    def generate(
        self,
        company: CompanyDetails,
        client: ClientDetails,
        invoice: InvoiceData,
        banking: BankingDetails,
    ) -> bytes:
        """Generate a complete SARS-compliant tax invoice PDF.

        Args:
            company: Supplier/organization details.
            client: Recipient/client details.
            invoice: Invoice data with line items and totals.
            banking: Payment/banking details.

        Returns:
            PDF content as bytes.
        """
        # Ensure totals are calculated
        if invoice.subtotal is None or invoice.total_amount is None:
            invoice.calculate_totals()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.6 * inch,
            title=f"Tax Invoice {invoice.invoice_number}",
            author=company.company_name,
        )

        elements = []
        elements.extend(self._build_header(company, invoice))
        elements.extend(self._build_bill_to_and_details(client, invoice))
        elements.extend(self._build_line_items_table(invoice))
        elements.extend(self._build_payment_details(banking, invoice))
        elements.extend(self._build_notes_and_terms(invoice))
        elements.extend(self._build_footer(invoice))

        doc.build(elements, onFirstPage=self._add_page_number,
                  onLaterPages=self._add_page_number)

        return buffer.getvalue()


# ---------------------------------------------------------------------------
# Public convenience function
# ---------------------------------------------------------------------------

def generate_invoice_pdf(
    company: CompanyDetails,
    client: ClientDetails,
    invoice: InvoiceData,
    banking: BankingDetails,
    template: str = 'professional',
) -> bytes:
    """Generate a SARS-compliant tax invoice PDF.

    This is the primary entry point for invoice PDF generation.

    Args:
        company: Supplier details (name, VAT, address).
        client: Recipient details (name, VAT, address).
        invoice: Invoice data with line items.
        banking: Payment details shown on the invoice.
        template: Visual template - 'professional', 'modern', or 'classic'.

    Returns:
        PDF file content as bytes.

    Example::

        pdf_bytes = generate_invoice_pdf(
            company=CompanyDetails(
                company_name="Do Dot Security (Pty) Ltd",
                vat_number="4012345678",
                address_line1="12 Main Road",
                city="Kimberley",
                postal_code="8301",
                phone="+27 53 831 1234",
            ),
            client=ClientDetails(
                client_name="Magareng Municipality",
                address="1 Civic Centre\\nWarrenton\\n8530",
                vat_number="4098765432",
            ),
            invoice=InvoiceData(
                invoice_number="INV-001-2026-001",
                invoice_date=date(2026, 2, 17),
                due_date=date(2026, 3, 19),
                period_start=date(2026, 2, 1),
                period_end=date(2026, 2, 28),
                line_items=[
                    InvoiceLineItem(
                        description="Security services - Main Gate",
                        hours=176, shifts=22,
                        rate_per_hour=85.00, amount=14960.00,
                    ),
                ],
                payment_terms="Net 30",
            ),
            banking=BankingDetails(
                bank_name="First National Bank",
                account_name="Do Dot Security (Pty) Ltd",
                account_number="62XXXXXXXX",
                branch_code="250655",
            ),
            template='professional',
        )
        with open("invoice.pdf", "wb") as f:
            f.write(pdf_bytes)
    """
    generator = InvoicePDFGenerator(template=template)
    return generator.generate(company, client, invoice, banking)


# ---------------------------------------------------------------------------
# Database-aware convenience function
# ---------------------------------------------------------------------------

def generate_invoice_pdf_from_db(
    db,  # sqlalchemy.orm.Session
    invoice_id: int,
    org_id: int,
    template: str = 'professional',
) -> bytes:
    """Load invoice data from the database and generate a PDF.

    This function queries the Organization, Client, ClientInvoice, and
    InvoiceLineItem models and assembles the dataclass inputs for PDF
    generation.

    Args:
        db: SQLAlchemy database session.
        invoice_id: Primary key of the ClientInvoice.
        org_id: Organization ID (for multi-tenant security).
        template: Visual template - 'professional', 'modern', or 'classic'.

    Returns:
        PDF file content as bytes.

    Raises:
        ValueError: If the invoice or organization is not found.
    """
    from app.models.client_invoice import ClientInvoice as ClientInvoiceModel
    from app.models.client_invoice import InvoiceLineItem as InvoiceLineItemModel
    from app.models.client import Client as ClientModel
    from app.models.organization import Organization

    # Fetch the invoice
    invoice_record = db.query(ClientInvoiceModel).filter(
        ClientInvoiceModel.invoice_id == invoice_id,
        ClientInvoiceModel.org_id == org_id,
    ).first()

    if not invoice_record:
        raise ValueError(
            f"Invoice {invoice_id} not found for organization {org_id}"
        )

    # Fetch organization
    org = db.query(Organization).filter(
        Organization.org_id == org_id,
    ).first()

    if not org:
        raise ValueError(f"Organization {org_id} not found")

    # Fetch client
    client_record = db.query(ClientModel).filter(
        ClientModel.client_id == invoice_record.client_id,
    ).first()

    if not client_record:
        raise ValueError(
            f"Client {invoice_record.client_id} not found"
        )

    # Build CompanyDetails from Organization
    company = CompanyDetails(
        company_name=org.company_name,
        registration_number=org.registration_number or "",
        psira_registration=org.psira_company_registration or "",
        vat_number=org.vat_number or "",
        address_line1=org.address_line1 or "",
        address_line2=org.address_line2 or "",
        city=org.city or "",
        postal_code=org.postal_code or "",
        phone=org.phone or "",
        email=org.billing_email or "",
        logo_url=org.logo_url or None,
    )

    # Build ClientDetails from Client
    client = ClientDetails(
        client_name=client_record.client_name,
        contact_person=client_record.contact_person or "",
        contact_email=client_record.contact_email or "",
        contact_phone=client_record.contact_phone or "",
        address=client_record.address or "",
        # Note: Client model does not have vat_number or purchase_order
        # columns currently. These can be added via migration when needed,
        # or passed as empty strings.
        vat_number="",
        purchase_order="",
    )

    # Build InvoiceData
    line_items = []
    for item in invoice_record.line_items:
        line_items.append(InvoiceLineItem(
            description=item.description,
            hours=item.hours or 0.0,
            shifts=item.shifts or 0,
            rate_per_hour=item.rate_per_hour or 0.0,
            amount=item.amount or 0.0,
        ))

    invoice_data = InvoiceData(
        invoice_number=invoice_record.invoice_number,
        invoice_date=invoice_record.invoice_date,
        due_date=invoice_record.due_date,
        period_start=invoice_record.period_start,
        period_end=invoice_record.period_end,
        line_items=line_items,
        subtotal=invoice_record.subtotal,
        vat_rate=0.15,
        tax_amount=invoice_record.tax_amount,
        total_amount=invoice_record.total_amount,
        status=invoice_record.status or "draft",
        notes=invoice_record.notes or "",
        payment_terms="Net 30",
    )

    # Build BankingDetails - Organization model does not currently store
    # banking details. For now we use the invoice number as reference and
    # leave banking fields empty. These can be populated from system
    # settings or a future organization_banking table.
    banking = BankingDetails(
        reference=invoice_record.invoice_number,
    )

    return generate_invoice_pdf(
        company=company,
        client=client,
        invoice=invoice_data,
        banking=banking,
        template=template,
    )
