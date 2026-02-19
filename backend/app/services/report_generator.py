"""Report PDF Generator Service - Professional Report PDFs for RostraCore.

Generates professional PDF reports with:
- Company branding header with logo, registration, and contact details
- Report title and period
- Summary metrics section with key indicators
- Data tables with proper formatting and alternating rows
- ZAR currency formatting (R XX,XXX.XX)
- Page numbers
- Colour-coded profit/loss indicators

Follows patterns established in payslip_generator.py and invoice_pdf_generator.py.

Supported report types:
- profit_loss: Profit & Loss statement by period or client
- revenue_by_client: Revenue breakdown per client
- coverage: Shift coverage/fill rate analysis
- outstanding_invoices: Unpaid invoice tracking
- employee_payroll: Employee payroll cost summary
"""

import io
import logging
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    HRFlowable, Image
)

logger = logging.getLogger(__name__)

# Page dimensions
PAGE_WIDTH, PAGE_HEIGHT = A4
CONTENT_WIDTH = PAGE_WIDTH - 1.0 * inch  # 0.5in margins each side


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class CompanyDetails:
    """Company information for report header.

    Maps to Organization model fields. Reuses the same pattern
    as the invoice_pdf_generator.CompanyDetails.
    """
    company_name: str
    registration_number: str = ""
    psira_registration: str = ""
    vat_number: str = ""
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    postal_code: str = ""
    phone: str = ""
    email: str = ""
    logo_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Colour palette (consistent with existing reports/invoices)
# ---------------------------------------------------------------------------

class _ReportPalette:
    """Professional colour palette for reports."""
    PRIMARY = colors.HexColor('#1E3A5F')        # Deep navy blue
    ACCENT = colors.HexColor('#2B6CB0')         # Medium blue
    HEADER_BG = colors.HexColor('#1E3A5F')      # Navy for header bar
    TABLE_HEADER_BG = colors.HexColor('#EBF4FF')  # Very light blue
    TABLE_ALT_ROW = colors.HexColor('#F7FAFC')  # Almost white blue
    TEXT = colors.HexColor('#2D3748')            # Charcoal
    MUTED = colors.HexColor('#718096')           # Gray
    BORDER = colors.HexColor('#CBD5E0')          # Light gray border
    LIGHT_BG = colors.HexColor('#F7FAFC')       # Background tint
    DIVIDER = colors.HexColor('#2B6CB0')        # Blue divider
    PROFIT_GREEN = colors.HexColor('#276749')   # Green for profit
    LOSS_RED = colors.HexColor('#C53030')        # Red for loss
    METRIC_BG = colors.HexColor('#EBF4FF')      # Light blue for metrics
    SUMMARY_BG = colors.HexColor('#1E3A5F')     # Navy for summary bars


# ---------------------------------------------------------------------------
# PDF Generator
# ---------------------------------------------------------------------------

class ReportPDFGenerator:
    """Generate professional PDF reports for financial and operational data.

    Produces consistent, branded reports with company headers, summary
    metrics, and detailed data tables.
    """

    P = _ReportPalette

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    # ------------------------------------------------------------------
    # Style setup
    # ------------------------------------------------------------------

    def _setup_custom_styles(self):
        """Create custom paragraph styles for reports."""
        P = self.P

        self.style_report_title = ParagraphStyle(
            'ReportTitle', parent=self.styles['Heading1'],
            fontSize=18, fontName='Helvetica-Bold',
            textColor=colors.white, spaceAfter=2, alignment=TA_LEFT,
        )

        self.style_report_subtitle = ParagraphStyle(
            'ReportSubtitle', parent=self.styles['Normal'],
            fontSize=10, fontName='Helvetica',
            textColor=colors.HexColor('#CBD5E0'), spaceAfter=0, alignment=TA_LEFT,
        )

        self.style_company = ParagraphStyle(
            'RptCompany', parent=self.styles['Normal'],
            fontSize=13, fontName='Helvetica-Bold',
            textColor=P.PRIMARY, spaceAfter=1,
        )

        self.style_company_detail = ParagraphStyle(
            'RptCompanyDetail', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica',
            textColor=P.MUTED, leading=11,
        )

        self.style_section_label = ParagraphStyle(
            'RptSectionLabel', parent=self.styles['Normal'],
            fontSize=11, fontName='Helvetica-Bold',
            textColor=P.PRIMARY, spaceBefore=12, spaceAfter=6,
        )

        self.style_metric_label = ParagraphStyle(
            'RptMetricLabel', parent=self.styles['Normal'],
            fontSize=7, fontName='Helvetica',
            textColor=P.MUTED, alignment=TA_CENTER,
        )

        self.style_metric_value = ParagraphStyle(
            'RptMetricValue', parent=self.styles['Normal'],
            fontSize=14, fontName='Helvetica-Bold',
            textColor=P.PRIMARY, alignment=TA_CENTER,
        )

        self.style_table_header = ParagraphStyle(
            'RptTableHeader', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica-Bold',
            textColor=P.PRIMARY,
        )

        self.style_table_cell = ParagraphStyle(
            'RptTableCell', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica',
            textColor=P.TEXT,
        )

        self.style_table_cell_right = ParagraphStyle(
            'RptTableCellR', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica',
            textColor=P.TEXT, alignment=TA_RIGHT,
        )

        self.style_table_cell_center = ParagraphStyle(
            'RptTableCellC', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica',
            textColor=P.TEXT, alignment=TA_CENTER,
        )

        self.style_footer = ParagraphStyle(
            'RptFooter', parent=self.styles['Normal'],
            fontSize=7, fontName='Helvetica',
            textColor=P.MUTED, alignment=TA_CENTER,
        )

    # ------------------------------------------------------------------
    # Formatting helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _fmt_currency(amount: float) -> str:
        """Format as South African Rand: R 55,440.00"""
        if amount < 0:
            return f"-R {abs(amount):,.2f}"
        return f"R {amount:,.2f}"

    @staticmethod
    def _fmt_date(d: Optional[date]) -> str:
        """Format date as '17 Feb 2026'."""
        if d is None:
            return ""
        return d.strftime("%d %b %Y")

    @staticmethod
    def _fmt_pct(value: float) -> str:
        """Format as percentage."""
        return f"{value:.1f}%"

    def _fetch_logo(self, url: Optional[str]) -> Optional[Image]:
        """Attempt to download a logo from URL and return a ReportLab Image.

        Returns None on any failure so the report still generates.
        """
        if not url:
            return None
        try:
            import urllib.request
            import tempfile

            req = urllib.request.Request(url, headers={'User-Agent': 'RostraCore/1.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()

            content_type = resp.headers.get('Content-Type', '')
            ext = '.png'
            if 'jpeg' in content_type or 'jpg' in content_type:
                ext = '.jpg'
            elif 'gif' in content_type:
                ext = '.gif'

            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
            tmp.write(data)
            tmp.close()

            img = Image(tmp.name, width=1.2 * inch, height=0.6 * inch)
            img.hAlign = 'LEFT'
            return img

        except Exception as e:
            logger.warning(f"Could not fetch logo from {url}: {e}")
            return None

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
    # Common section builders
    # ------------------------------------------------------------------

    def _build_report_header(
        self, company: CompanyDetails, report_title: str,
        period_start: Optional[date], period_end: Optional[date]
    ) -> List:
        """Build the report header with company branding and report title."""
        elements = []
        P = self.P

        # Company info section
        logo_img = self._fetch_logo(company.logo_url)

        company_parts = []
        if logo_img:
            company_parts.append([logo_img])
        company_parts.append([Paragraph(company.company_name.upper(), self.style_company)])

        # Registration line
        reg_parts = []
        if company.registration_number:
            reg_parts.append(f"Registration: {company.registration_number}")
        if company.psira_registration:
            reg_parts.append(f"PSIRA: {company.psira_registration}")
        if company.vat_number:
            reg_parts.append(f"VAT: {company.vat_number}")
        if reg_parts:
            company_parts.append([Paragraph(
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
            company_parts.append([Paragraph(detail_text, self.style_company_detail)])

        company_table = Table(company_parts, colWidths=[CONTENT_WIDTH])
        company_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))

        elements.append(company_table)
        elements.append(Spacer(1, 0.12 * inch))

        # Report title bar
        period_text = ""
        if period_start and period_end:
            period_text = f"{period_start.strftime('%d %B %Y')} - {period_end.strftime('%d %B %Y')}"
        elif period_start:
            period_text = f"From {period_start.strftime('%d %B %Y')}"

        title_bar_data = [[
            Paragraph(report_title.upper(), self.style_report_title),
            Paragraph(period_text, ParagraphStyle(
                'PeriodText', fontSize=10, fontName='Helvetica',
                textColor=colors.HexColor('#CBD5E0'), alignment=TA_RIGHT,
            ))
        ]]

        title_bar = Table(title_bar_data, colWidths=[4.5 * inch, 3.0 * inch])
        title_bar.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), P.HEADER_BG),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        ]))

        elements.append(title_bar)
        elements.append(Spacer(1, 0.15 * inch))

        return elements

    def _build_summary_metrics(self, metrics: List[Dict[str, str]]) -> List:
        """Build a summary metrics section with key indicators.

        Args:
            metrics: List of dicts with 'label' and 'value' keys.
                     Optionally 'color' for custom value color.
        """
        elements = []
        P = self.P

        if not metrics:
            return elements

        # Build metrics as evenly-spaced boxes
        num_metrics = len(metrics)
        col_width = CONTENT_WIDTH / num_metrics

        label_row = []
        value_row = []

        for m in metrics:
            label_row.append(Paragraph(m['label'], self.style_metric_label))

            value_color = P.PRIMARY
            if 'color' in m:
                value_color = m['color']

            value_row.append(Paragraph(m['value'], ParagraphStyle(
                f'MetricVal_{m["label"][:8]}',
                fontSize=14, fontName='Helvetica-Bold',
                textColor=value_color, alignment=TA_CENTER,
            )))

        col_widths = [col_width] * num_metrics

        metrics_data = [label_row, value_row]
        metrics_table = Table(metrics_data, colWidths=col_widths)
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), P.METRIC_BG),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
            ('TOPPADDING', (0, 1), (-1, 1), 2),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, P.BORDER),
        ]))

        elements.append(metrics_table)
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _build_data_table(
        self, headers: List[str], rows: List[List[str]],
        col_widths: List[float],
        right_align_cols: Optional[List[int]] = None,
        center_align_cols: Optional[List[int]] = None,
        color_col: Optional[int] = None,
    ) -> List:
        """Build a formatted data table with headers and rows.

        Args:
            headers: Column header labels.
            rows: List of row data (list of strings).
            col_widths: Column widths in points.
            right_align_cols: Column indices to right-align (0-based).
            center_align_cols: Column indices to center-align (0-based).
            color_col: Column index whose values should be coloured
                       green (positive/profit) or red (negative/loss).
        """
        elements = []
        P = self.P

        if not rows:
            elements.append(Paragraph("No data available for this period.", ParagraphStyle(
                'NoData', fontSize=10, fontName='Helvetica',
                textColor=P.MUTED, alignment=TA_CENTER, spaceBefore=20,
            )))
            return elements

        right_align_cols = right_align_cols or []
        center_align_cols = center_align_cols or []

        # Build header row
        header_cells = []
        for i, h in enumerate(headers):
            align = TA_LEFT
            if i in right_align_cols:
                align = TA_RIGHT
            elif i in center_align_cols:
                align = TA_CENTER
            header_cells.append(Paragraph(h, ParagraphStyle(
                f'TH_{i}', fontSize=8, fontName='Helvetica-Bold',
                textColor=P.PRIMARY, alignment=align,
            )))

        table_data = [header_cells]

        # Build data rows
        for row in rows:
            cells = []
            for i, val in enumerate(row):
                align = TA_LEFT
                text_color = P.TEXT
                if i in right_align_cols:
                    align = TA_RIGHT
                elif i in center_align_cols:
                    align = TA_CENTER

                # Apply profit/loss colouring
                if color_col is not None and i == color_col:
                    # Check if the string represents a negative value
                    stripped = val.replace('R', '').replace(' ', '').replace(',', '').strip()
                    try:
                        num_val = float(stripped)
                        if num_val > 0:
                            text_color = P.PROFIT_GREEN
                        elif num_val < 0:
                            text_color = P.LOSS_RED
                    except (ValueError, TypeError):
                        # Check for negative indicator
                        if stripped.startswith('-'):
                            text_color = P.LOSS_RED

                cells.append(Paragraph(val, ParagraphStyle(
                    f'TD_{i}_{len(table_data)}', fontSize=8, fontName='Helvetica',
                    textColor=text_color, alignment=align,
                )))
            table_data.append(cells)

        table = Table(table_data, colWidths=col_widths, repeatRows=1)

        style_commands = [
            ('BACKGROUND', (0, 0), (-1, 0), P.TABLE_HEADER_BG),
            ('LINEBELOW', (0, 0), (-1, 0), 1, P.BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
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
            style_commands.append(
                ('LINEBELOW', (0, i), (-1, i), 0.5, P.BORDER)
            )

        table.setStyle(TableStyle(style_commands))
        elements.append(table)

        return elements

    def _build_footer(self, generation_date: Optional[datetime] = None) -> List:
        """Build report footer."""
        elements = []
        P = self.P

        gen_date = generation_date or datetime.now()

        elements.append(Spacer(1, 0.3 * inch))
        elements.append(HRFlowable(
            width="100%", thickness=0.5, color=P.BORDER,
            spaceBefore=8, spaceAfter=6,
        ))

        footer_text = (
            f"This is a computer-generated report. | "
            f"Generated: {gen_date.strftime('%d %B %Y %H:%M')} | "
            f"All amounts in South African Rand (ZAR)"
        )
        elements.append(Paragraph(footer_text, self.style_footer))

        return elements

    # ------------------------------------------------------------------
    # Report-specific builders
    # ------------------------------------------------------------------

    def _build_profit_loss_report(self, data: dict) -> List:
        """Build Profit & Loss report content."""
        elements = []
        P = self.P

        # Summary metrics
        total_revenue = data.get('total_revenue', 0)
        total_costs = data.get('total_costs', 0)
        gross_profit = data.get('gross_profit', total_revenue - total_costs)
        profit_margin = data.get('profit_margin', 0)

        profit_color = P.PROFIT_GREEN if gross_profit >= 0 else P.LOSS_RED

        metrics = [
            {'label': 'Total Revenue', 'value': self._fmt_currency(total_revenue)},
            {'label': 'Total Costs', 'value': self._fmt_currency(total_costs)},
            {'label': 'Gross Profit', 'value': self._fmt_currency(gross_profit), 'color': profit_color},
            {'label': 'Profit Margin', 'value': self._fmt_pct(profit_margin), 'color': profit_color},
        ]
        elements.extend(self._build_summary_metrics(metrics))

        # Breakdown table
        breakdown = data.get('breakdown', [])
        if breakdown:
            elements.append(Paragraph("Breakdown", self.style_section_label))
            elements.append(Spacer(1, 0.05 * inch))

            headers = ['Period / Client', 'Revenue', 'Costs', 'Profit', 'Margin']
            rows = []
            for item in breakdown:
                revenue = item.get('revenue', 0)
                cost = item.get('cost', 0)
                profit = item.get('profit', revenue - cost)
                margin = item.get('margin', 0)

                rows.append([
                    str(item.get('group', item.get('period', ''))),
                    self._fmt_currency(revenue),
                    self._fmt_currency(cost),
                    self._fmt_currency(profit),
                    self._fmt_pct(margin),
                ])

            col_widths = [2.0 * inch, 1.4 * inch, 1.4 * inch, 1.4 * inch, 1.0 * inch]
            elements.extend(self._build_data_table(
                headers, rows, col_widths,
                right_align_cols=[1, 2, 3, 4],
                color_col=3,
            ))

        return elements

    def _build_revenue_by_client_report(self, data: dict) -> List:
        """Build Revenue by Client report content."""
        elements = []
        P = self.P

        total_revenue = data.get('total_revenue', 0)
        client_count = data.get('client_count', 0)

        metrics = [
            {'label': 'Total Revenue', 'value': self._fmt_currency(total_revenue)},
            {'label': 'Number of Clients', 'value': str(client_count)},
        ]
        elements.extend(self._build_summary_metrics(metrics))

        # Client table
        clients = data.get('clients', [])
        if clients:
            elements.append(Paragraph("Revenue by Client", self.style_section_label))
            elements.append(Spacer(1, 0.05 * inch))

            headers = ['Client', 'Hours', 'Shifts', 'Revenue', '% of Total']
            rows = []
            for client in clients:
                rows.append([
                    str(client.get('client_name', '')),
                    f"{client.get('hours', 0):,.1f}",
                    str(client.get('shifts', 0)),
                    self._fmt_currency(client.get('revenue', 0)),
                    self._fmt_pct(client.get('pct_of_total', 0)),
                ])

            col_widths = [2.4 * inch, 1.0 * inch, 0.8 * inch, 1.6 * inch, 1.4 * inch]
            elements.extend(self._build_data_table(
                headers, rows, col_widths,
                right_align_cols=[1, 2, 3, 4],
            ))

        return elements

    def _build_coverage_report(self, data: dict) -> List:
        """Build Coverage report content."""
        elements = []
        P = self.P

        total_shifts = data.get('total_shifts', 0)
        filled_shifts = data.get('filled_shifts', 0)
        fill_rate = data.get('fill_rate', 0)

        fill_color = P.PROFIT_GREEN if fill_rate >= 80 else P.LOSS_RED

        metrics = [
            {'label': 'Total Shifts', 'value': str(total_shifts)},
            {'label': 'Filled Shifts', 'value': str(filled_shifts)},
            {'label': 'Unfilled Shifts', 'value': str(total_shifts - filled_shifts)},
            {'label': 'Fill Rate', 'value': self._fmt_pct(fill_rate), 'color': fill_color},
        ]
        elements.extend(self._build_summary_metrics(metrics))

        # Site breakdown
        sites = data.get('sites', [])
        if sites:
            elements.append(Paragraph("Coverage by Site", self.style_section_label))
            elements.append(Spacer(1, 0.05 * inch))

            headers = ['Site', 'Required', 'Filled', 'Unfilled', 'Fill Rate', 'Hours']
            rows = []
            for site in sites:
                required = site.get('required', 0)
                filled = site.get('filled', 0)
                unfilled = required - filled
                site_fill = site.get('fill_rate', 0)

                rows.append([
                    str(site.get('site_name', '')),
                    str(required),
                    str(filled),
                    str(unfilled),
                    self._fmt_pct(site_fill),
                    f"{site.get('hours', 0):,.1f}",
                ])

            col_widths = [2.2 * inch, 1.0 * inch, 0.9 * inch, 0.9 * inch, 1.0 * inch, 1.2 * inch]
            elements.extend(self._build_data_table(
                headers, rows, col_widths,
                right_align_cols=[1, 2, 3, 5],
                center_align_cols=[4],
            ))

        return elements

    def _build_outstanding_invoices_report(self, data: dict) -> List:
        """Build Outstanding Invoices report content."""
        elements = []
        P = self.P

        total_outstanding = data.get('total_outstanding', 0)
        num_overdue = data.get('num_overdue', 0)
        avg_days_overdue = data.get('avg_days_overdue', 0)

        overdue_color = P.LOSS_RED if num_overdue > 0 else P.TEXT

        metrics = [
            {'label': 'Total Outstanding', 'value': self._fmt_currency(total_outstanding), 'color': P.LOSS_RED},
            {'label': 'Invoices Overdue', 'value': str(num_overdue), 'color': overdue_color},
            {'label': 'Avg Days Overdue', 'value': f"{avg_days_overdue:.0f}" if avg_days_overdue else "0"},
        ]
        elements.extend(self._build_summary_metrics(metrics))

        # Invoice table
        invoices = data.get('invoices', [])
        if invoices:
            elements.append(Paragraph("Outstanding Invoices", self.style_section_label))
            elements.append(Spacer(1, 0.05 * inch))

            headers = ['Invoice #', 'Client', 'Amount', 'Due Date', 'Days Overdue', 'Status']
            rows = []
            for inv in invoices:
                due_date = inv.get('due_date', '')
                if isinstance(due_date, date):
                    due_date = due_date.strftime('%d %b %Y')

                rows.append([
                    str(inv.get('invoice_number', '')),
                    str(inv.get('client_name', '')),
                    self._fmt_currency(inv.get('amount', 0)),
                    str(due_date),
                    str(inv.get('days_overdue', 0)),
                    str(inv.get('status', '')).upper(),
                ])

            col_widths = [1.4 * inch, 1.6 * inch, 1.2 * inch, 1.2 * inch, 1.0 * inch, 0.8 * inch]
            elements.extend(self._build_data_table(
                headers, rows, col_widths,
                right_align_cols=[2, 4],
                center_align_cols=[5],
            ))

        return elements

    def _build_employee_payroll_report(self, data: dict) -> List:
        """Build Employee Payroll Summary report content."""
        elements = []
        P = self.P

        total_payroll = data.get('total_payroll', 0)
        total_hours = data.get('total_hours', 0)
        avg_hourly = data.get('avg_hourly_rate', 0)

        metrics = [
            {'label': 'Total Payroll Cost', 'value': self._fmt_currency(total_payroll)},
            {'label': 'Total Hours', 'value': f"{total_hours:,.1f}"},
            {'label': 'Avg Hourly Rate', 'value': self._fmt_currency(avg_hourly)},
        ]
        elements.extend(self._build_summary_metrics(metrics))

        # Employee table
        employees = data.get('employees', [])
        if employees:
            elements.append(Paragraph("Employee Payroll Summary", self.style_section_label))
            elements.append(Spacer(1, 0.05 * inch))

            headers = ['Employee', 'Hours', 'Regular Pay', 'Overtime Pay', 'Gross Pay']
            rows = []
            for emp in employees:
                rows.append([
                    str(emp.get('employee_name', '')),
                    f"{emp.get('total_hours', 0):,.1f}",
                    self._fmt_currency(emp.get('regular_pay', 0)),
                    self._fmt_currency(emp.get('overtime_pay', 0)),
                    self._fmt_currency(emp.get('gross_pay', 0)),
                ])

            col_widths = [2.2 * inch, 1.0 * inch, 1.4 * inch, 1.4 * inch, 1.2 * inch]
            elements.extend(self._build_data_table(
                headers, rows, col_widths,
                right_align_cols=[1, 2, 3, 4],
            ))

        return elements

    def _build_psira_compliance_report(self, data: dict) -> List:
        """Build PSIRA compliance report content.

        Data shape:
            {
                'as_of_date': str,
                'total_guards': int,
                'valid_count': int,
                'expiring_count': int,   # within 30 days
                'expired_count': int,
                'no_psira_count': int,
                'grade_counts': {'A': int, 'B': int, ...},
                'guards': [
                    {
                        'name': str, 'psira_number': str, 'grade': str,
                        'expiry_date': str, 'days_until_expiry': int,
                        'status': str,  # 'Valid' | 'Expiring Soon' | 'Expired' | 'No PSIRA'
                        'site': str,
                    }, ...
                ]
            }
        """
        elements = []
        P = self.P

        total = data.get('total_guards', 0)
        valid = data.get('valid_count', 0)
        expiring = data.get('expiring_count', 0)
        expired = data.get('expired_count', 0)
        no_psira = data.get('no_psira_count', 0)

        compliance_pct = (valid / total * 100) if total else 0
        compliance_color = P.PROFIT_GREEN if compliance_pct >= 95 else (
            P.TEXT if compliance_pct >= 80 else P.LOSS_RED
        )

        metrics = [
            {'label': 'Total Guards', 'value': str(total)},
            {'label': 'Valid PSIRA', 'value': str(valid), 'color': P.PROFIT_GREEN},
            {'label': 'Expiring ≤30 days', 'value': str(expiring), 'color': P.TEXT if expiring == 0 else colors.HexColor('#D69E2E')},
            {'label': 'Expired', 'value': str(expired), 'color': P.LOSS_RED if expired > 0 else P.TEXT},
            {'label': 'Compliance Rate', 'value': self._fmt_pct(compliance_pct), 'color': compliance_color},
        ]
        elements.extend(self._build_summary_metrics(metrics))

        # Grade breakdown
        grade_counts = data.get('grade_counts', {})
        if grade_counts:
            elements.append(Paragraph("Guards by PSIRA Grade", self.style_section_label))
            elements.append(Spacer(1, 0.05 * inch))
            grade_headers = ['Grade', 'Guards', 'Description']
            grade_descriptions = {
                'E': 'General Security (entry level)',
                'D': 'Access Control / Reaction Officer',
                'C': 'Security Supervisor',
                'B': 'Security Manager',
                'A': 'Senior Security Manager (highest)',
            }
            grade_rows = []
            for grade in ['E', 'D', 'C', 'B', 'A']:
                count = grade_counts.get(grade, 0)
                if count > 0:
                    grade_rows.append([
                        f"Grade {grade}",
                        str(count),
                        grade_descriptions.get(grade, ''),
                    ])
            if no_psira > 0:
                grade_rows.append(['No PSIRA', str(no_psira), 'No certification on record'])

            col_widths = [1.2 * inch, 1.0 * inch, 5.0 * inch]
            elements.extend(self._build_data_table(grade_headers, grade_rows, col_widths))

        # Guard detail table
        guards = data.get('guards', [])
        if guards:
            elements.append(Paragraph("Guard Certification Detail", self.style_section_label))
            elements.append(Spacer(1, 0.05 * inch))

            headers = ['Name', 'PSIRA No.', 'Grade', 'Expiry Date', 'Days Left', 'Status', 'Site']
            rows = []
            for g in guards:
                status = g.get('status', '')
                days = g.get('days_until_expiry')
                days_str = str(days) if days is not None else '–'
                rows.append([
                    str(g.get('name', '')),
                    str(g.get('psira_number', '–')),
                    str(g.get('grade', '–')),
                    str(g.get('expiry_date', '–')),
                    days_str,
                    status,
                    str(g.get('site', '–')),
                ])

            col_widths = [1.6 * inch, 1.2 * inch, 0.7 * inch, 1.1 * inch, 0.8 * inch, 1.1 * inch, 0.7 * inch]
            elements.extend(self._build_data_table(
                headers, rows, col_widths,
                right_align_cols=[4],
                center_align_cols=[2, 5],
            ))

        return elements

    # ------------------------------------------------------------------
    # Report type router
    # ------------------------------------------------------------------

    _REPORT_BUILDERS = {
        'profit_loss': '_build_profit_loss_report',
        'revenue_by_client': '_build_revenue_by_client_report',
        'coverage': '_build_coverage_report',
        'outstanding_invoices': '_build_outstanding_invoices_report',
        'employee_payroll': '_build_employee_payroll_report',
        'psira_compliance': '_build_psira_compliance_report',
    }

    _REPORT_TITLES = {
        'profit_loss': 'Profit & Loss Report',
        'revenue_by_client': 'Revenue by Client Report',
        'coverage': 'Coverage Report',
        'outstanding_invoices': 'Outstanding Invoices Report',
        'employee_payroll': 'Employee Payroll Summary',
        'psira_compliance': 'PSIRA Compliance Report',
    }

    # ------------------------------------------------------------------
    # Main generation method
    # ------------------------------------------------------------------

    def generate(
        self,
        report_type: str,
        data: dict,
        company: CompanyDetails,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
    ) -> bytes:
        """Generate a complete report PDF.

        Args:
            report_type: One of 'profit_loss', 'revenue_by_client',
                         'coverage', 'outstanding_invoices', 'employee_payroll'.
            data: Report-specific data dictionary.
            company: Company details for header branding.
            period_start: Start of report period.
            period_end: End of report period.

        Returns:
            PDF content as bytes.

        Raises:
            ValueError: If report_type is not recognized.
        """
        if report_type not in self._REPORT_BUILDERS:
            raise ValueError(
                f"Unknown report type '{report_type}'. "
                f"Choose from: {', '.join(self._REPORT_BUILDERS.keys())}"
            )

        report_title = self._REPORT_TITLES[report_type]
        builder_method = getattr(self, self._REPORT_BUILDERS[report_type])

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.6 * inch,
            title=report_title,
            author=company.company_name,
        )

        elements = []
        elements.extend(self._build_report_header(
            company, report_title, period_start, period_end
        ))
        elements.extend(builder_method(data))
        elements.extend(self._build_footer())

        doc.build(
            elements,
            onFirstPage=self._add_page_number,
            onLaterPages=self._add_page_number,
        )

        return buffer.getvalue()


# ---------------------------------------------------------------------------
# Public convenience function
# ---------------------------------------------------------------------------

def generate_report_pdf(
    report_type: str,
    data: dict,
    company: CompanyDetails,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
) -> bytes:
    """Generate a professional PDF report.

    This is the primary entry point for report PDF generation.

    Args:
        report_type: One of 'profit_loss', 'revenue_by_client',
                     'coverage', 'outstanding_invoices', 'employee_payroll'.
        data: Report-specific data dictionary. Structure varies by type:

            profit_loss:
                {
                    'total_revenue': float,
                    'total_costs': float,
                    'gross_profit': float,
                    'profit_margin': float,
                    'breakdown': [
                        {'group': str, 'revenue': float, 'cost': float,
                         'profit': float, 'margin': float}, ...
                    ]
                }

            revenue_by_client:
                {
                    'total_revenue': float,
                    'client_count': int,
                    'clients': [
                        {'client_name': str, 'hours': float, 'shifts': int,
                         'revenue': float, 'pct_of_total': float}, ...
                    ]
                }

            coverage:
                {
                    'total_shifts': int,
                    'filled_shifts': int,
                    'fill_rate': float,
                    'sites': [
                        {'site_name': str, 'required': int, 'filled': int,
                         'fill_rate': float, 'hours': float}, ...
                    ]
                }

            outstanding_invoices:
                {
                    'total_outstanding': float,
                    'num_overdue': int,
                    'avg_days_overdue': float,
                    'invoices': [
                        {'invoice_number': str, 'client_name': str,
                         'amount': float, 'due_date': str/date,
                         'days_overdue': int, 'status': str}, ...
                    ]
                }

            employee_payroll:
                {
                    'total_payroll': float,
                    'total_hours': float,
                    'avg_hourly_rate': float,
                    'employees': [
                        {'employee_name': str, 'total_hours': float,
                         'regular_pay': float, 'overtime_pay': float,
                         'gross_pay': float}, ...
                    ]
                }

        company: Company details for header branding.
        period_start: Start of report period.
        period_end: End of report period.

    Returns:
        PDF file content as bytes.

    Example::

        pdf_bytes = generate_report_pdf(
            report_type='profit_loss',
            data={
                'total_revenue': 250000.00,
                'total_costs': 180000.00,
                'gross_profit': 70000.00,
                'profit_margin': 28.0,
                'breakdown': [
                    {'group': '2026-01', 'revenue': 125000, 'cost': 90000,
                     'profit': 35000, 'margin': 28.0},
                    {'group': '2026-02', 'revenue': 125000, 'cost': 90000,
                     'profit': 35000, 'margin': 28.0},
                ],
            },
            company=CompanyDetails(
                company_name="Do Dot Security (Pty) Ltd",
                vat_number="4012345678",
            ),
            period_start=date(2026, 1, 1),
            period_end=date(2026, 2, 28),
        )
    """
    generator = ReportPDFGenerator()
    return generator.generate(report_type, data, company, period_start, period_end)


# ---------------------------------------------------------------------------
# Database-aware helper to build CompanyDetails from Organization
# ---------------------------------------------------------------------------

def build_company_details_from_org(org) -> CompanyDetails:
    """Build CompanyDetails from an Organization model instance.

    Args:
        org: Organization SQLAlchemy model instance.

    Returns:
        CompanyDetails dataclass populated from the organization.
    """
    return CompanyDetails(
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
