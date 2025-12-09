"""Payslip PDF Generator Service - South African Compliance.

Generates professional PDF payslips with:
- Company branding and registration details
- Employee information (ID, PSIRA, banking)
- Earnings breakdown (basic, overtime, premiums, allowances)
- SA deductions (PAYE, UIF, PSIRA, bargaining council, provident fund)
- Net pay calculation
- YTD summary (Year-to-Date)
- Leave balances
"""

import io
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    HRFlowable, Image
)
from reportlab.graphics.shapes import Drawing, Rect


@dataclass
class CompanyDetails:
    """Company information for payslip header."""
    company_name: str
    registration_number: str = ""  # e.g., 2020/123456/07
    psira_registration: str = ""
    vat_number: str = ""
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    postal_code: str = ""
    phone: str = ""
    email: str = ""
    logo_path: Optional[str] = None


@dataclass
class EmployeePayslipDetails:
    """Employee information for payslip."""
    employee_id: int
    employee_number: str  # e.g., EMP001
    first_name: str
    last_name: str
    id_number: str
    psira_number: str = ""
    psira_grade: str = ""
    department: str = "Security Operations"
    position: str = "Security Officer"
    bank_name: str = ""
    account_number: str = ""  # Will be masked to ****1234
    branch_code: str = ""
    account_type: str = ""
    tax_number: str = ""


@dataclass
class EarningsBreakdown:
    """Earnings components for payslip."""
    # Hours
    normal_hours: float = 0.0
    overtime_hours: float = 0.0
    sunday_hours: float = 0.0
    holiday_hours: float = 0.0

    # Basic pay
    hourly_rate: float = 0.0
    basic_salary: float = 0.0

    # Overtime and premiums
    overtime_pay: float = 0.0
    night_shift_allowance: float = 0.0
    sunday_premium: float = 0.0
    holiday_premium: float = 0.0

    # Allowances
    supervisor_allowance: float = 0.0
    travel_allowance: float = 0.0
    gun_allowance: float = 0.0
    cleaning_allowance: float = 0.0
    funeral_cover: float = 0.0
    bonus: float = 0.0

    # Sick pay
    sick_pay: float = 0.0

    @property
    def gross_salary(self) -> float:
        """Calculate total gross salary."""
        return (
            self.basic_salary +
            self.overtime_pay +
            self.night_shift_allowance +
            self.sunday_premium +
            self.holiday_premium +
            self.supervisor_allowance +
            self.travel_allowance +
            self.gun_allowance +
            self.cleaning_allowance +
            self.funeral_cover +
            self.bonus +
            self.sick_pay
        )

    @property
    def total_hours(self) -> float:
        """Calculate total hours worked."""
        return self.normal_hours + self.overtime_hours + self.sunday_hours + self.holiday_hours


@dataclass
class DeductionsBreakdown:
    """Deduction components for payslip."""
    # Statutory deductions
    paye: float = 0.0  # Pay As You Earn tax
    uif: float = 0.0   # Unemployment Insurance Fund (1%)

    # Industry deductions
    psira_levy: float = 0.0  # PSIRA registration fee
    bargaining_council: float = 0.0  # Bargaining council levy

    # Retirement
    provident_fund: float = 0.0  # Provident/Pension fund

    # Medical
    hospital_cover: float = 0.0

    # Union
    nucaaw_fee: float = 0.0  # National Union of Commercial Allied and Allied Workers

    # Other
    defect_deduction: float = 0.0  # Equipment damage deduction
    other_deductions: float = 0.0

    @property
    def total_deductions(self) -> float:
        """Calculate total deductions."""
        return (
            self.paye +
            self.uif +
            self.psira_levy +
            self.bargaining_council +
            self.provident_fund +
            self.hospital_cover +
            self.nucaaw_fee +
            self.defect_deduction +
            self.other_deductions
        )


@dataclass
class YTDSummary:
    """Year-to-date totals."""
    gross_earnings: float = 0.0
    total_tax: float = 0.0
    total_uif: float = 0.0
    net_earnings: float = 0.0


@dataclass
class LeaveBalances:
    """Leave balance information."""
    annual_leave_days: float = 0.0
    sick_leave_days: float = 0.0
    family_responsibility_days: float = 0.0
    leave_taken_ytd: float = 0.0


@dataclass
class PayslipData:
    """Complete payslip data structure."""
    company: CompanyDetails
    employee: EmployeePayslipDetails
    earnings: EarningsBreakdown
    deductions: DeductionsBreakdown

    # Period information
    period_start: date
    period_end: date
    payment_date: date
    payslip_number: str = ""

    # Optional YTD and leave
    ytd: Optional[YTDSummary] = None
    leave: Optional[LeaveBalances] = None

    @property
    def net_salary(self) -> float:
        """Calculate net salary."""
        return self.earnings.gross_salary - self.deductions.total_deductions


class PayslipPDFGenerator:
    """Generate professional PDF payslips with SA compliance - Sage-inspired design."""

    # Professional color scheme (inspired by Sage/corporate payslips)
    PRIMARY_COLOR = colors.HexColor('#2D3748')  # Charcoal gray
    HEADER_BG = colors.HexColor('#1A202C')  # Dark charcoal for header
    ACCENT_COLOR = colors.HexColor('#276749')  # Professional green (Sage green)
    NET_PAY_BG = colors.HexColor('#276749')  # Green background for net pay
    TEXT_COLOR = colors.HexColor('#2D3748')  # Dark text
    MUTED_TEXT = colors.HexColor('#718096')  # Muted gray for labels
    LIGHT_BG = colors.HexColor('#F7FAFC')  # Very light gray background
    TABLE_HEADER_BG = colors.HexColor('#EDF2F7')  # Light gray for table headers
    BORDER_COLOR = colors.HexColor('#CBD5E0')  # Subtle border
    EARNINGS_COLOR = colors.HexColor('#2D3748')  # Dark for earnings header
    DEDUCTIONS_COLOR = colors.HexColor('#742A2A')  # Dark red for deductions

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Create custom paragraph styles for professional look."""
        self.title_style = ParagraphStyle(
            'PayslipTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.white,
            spaceAfter=6,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold'
        )

        self.company_style = ParagraphStyle(
            'CompanyName',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=self.PRIMARY_COLOR,
            spaceAfter=2,
            fontName='Helvetica-Bold'
        )

        self.section_header_style = ParagraphStyle(
            'SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=9,
            textColor=self.PRIMARY_COLOR,
            spaceBefore=8,
            spaceAfter=4,
            fontName='Helvetica-Bold',
            textTransform='uppercase'
        )

        self.label_style = ParagraphStyle(
            'Label',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=self.MUTED_TEXT,
            fontName='Helvetica'
        )

        self.value_style = ParagraphStyle(
            'Value',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=self.TEXT_COLOR,
            fontName='Helvetica-Bold'
        )

        self.net_pay_style = ParagraphStyle(
            'NetPay',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.white,
            alignment=TA_RIGHT,
            fontName='Helvetica-Bold'
        )

        self.footer_style = ParagraphStyle(
            'Footer',
            parent=self.styles['Normal'],
            fontSize=7,
            textColor=self.MUTED_TEXT,
            alignment=TA_CENTER
        )

    def _mask_account_number(self, account_number: str) -> str:
        """Mask account number for security: 1234567890 -> ****7890."""
        if not account_number or len(account_number) < 4:
            return account_number
        return '****' + account_number[-4:]

    def _mask_id_number(self, id_number: str) -> str:
        """Mask ID number: 9001015800080 -> 900101****080."""
        if not id_number or len(id_number) < 10:
            return id_number
        return id_number[:6] + '****' + id_number[-3:]

    def _format_currency(self, amount: float) -> str:
        """Format amount as South African Rand."""
        return f"R {amount:,.2f}"

    def _create_header(self, data: PayslipData) -> List:
        """Create professional payslip header - Sage-inspired design."""
        elements = []

        # Top header bar with PAYSLIP title
        header_bar_data = [
            [
                Paragraph("PAYSLIP", ParagraphStyle(
                    'HeaderTitle',
                    fontSize=14,
                    textColor=colors.white,
                    fontName='Helvetica-Bold'
                )),
                Paragraph(f"Reference: {data.payslip_number}" if data.payslip_number else "", ParagraphStyle(
                    'HeaderRef',
                    fontSize=9,
                    textColor=colors.white,
                    alignment=TA_RIGHT,
                    fontName='Helvetica'
                ))
            ]
        ]

        header_bar = Table(header_bar_data, colWidths=[4*inch, 3.5*inch])
        header_bar.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.HEADER_BG),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        ]))
        elements.append(header_bar)
        elements.append(Spacer(1, 0.12*inch))

        # Company and period info section
        company_name = data.company.company_name.upper()
        reg_info = []
        if data.company.registration_number:
            reg_info.append(f"Reg: {data.company.registration_number}")
        if data.company.psira_registration:
            reg_info.append(f"PSIRA: {data.company.psira_registration}")
        if data.company.vat_number:
            reg_info.append(f"VAT: {data.company.vat_number}")

        # Build address
        address_lines = []
        if data.company.address_line1:
            address_lines.append(data.company.address_line1)
        if data.company.address_line2:
            address_lines.append(data.company.address_line2)
        if data.company.city:
            city_line = data.company.city
            if data.company.postal_code:
                city_line += f" {data.company.postal_code}"
            address_lines.append(city_line)

        # Left side: Company details
        left_content = [
            [Paragraph(company_name, ParagraphStyle(
                'CompName', fontSize=11, fontName='Helvetica-Bold', textColor=self.PRIMARY_COLOR
            ))],
        ]
        if reg_info:
            left_content.append([Paragraph(
                " | ".join(reg_info),
                ParagraphStyle('RegInfo', fontSize=7, textColor=self.MUTED_TEXT)
            )])
        if address_lines:
            left_content.append([Paragraph(
                ", ".join(address_lines),
                ParagraphStyle('AddrInfo', fontSize=7, textColor=self.MUTED_TEXT)
            )])

        # Right side: Period info
        right_content = [
            ['Pay Period:', f"{data.period_start.strftime('%d %B %Y')} - {data.period_end.strftime('%d %B %Y')}"],
            ['Payment Date:', data.payment_date.strftime('%d %B %Y')],
        ]

        left_table = Table(left_content, colWidths=[3.5*inch])
        left_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))

        right_table = Table(right_content, colWidths=[1.2*inch, 2.3*inch])
        right_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (0, -1), self.MUTED_TEXT),
            ('TEXTCOLOR', (1, 0), (1, -1), self.TEXT_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))

        # Combine company and period info
        info_data = [[left_table, right_table]]
        info_table = Table(info_data, colWidths=[4*inch, 3.5*inch])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        elements.append(info_table)
        elements.append(Spacer(1, 0.1*inch))

        # Divider line
        elements.append(HRFlowable(width="100%", thickness=1, color=self.BORDER_COLOR, spaceAfter=8))

        return elements

    def _create_employee_section(self, data: PayslipData) -> List:
        """Create professional employee details section - clean grid layout."""
        elements = []

        # Section header
        elements.append(Paragraph("EMPLOYEE INFORMATION", ParagraphStyle(
            'EmpHeader',
            fontSize=9,
            fontName='Helvetica-Bold',
            textColor=self.PRIMARY_COLOR,
            spaceBefore=4,
            spaceAfter=6
        )))

        emp = data.employee

        # Create a clean 4-column grid for employee info
        emp_data = [
            # Row 1
            [
                Paragraph('Employee Name', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                Paragraph(f"{emp.first_name} {emp.last_name}", ParagraphStyle('val', fontSize=9, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
                Paragraph('Employee Number', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                Paragraph(emp.employee_number, ParagraphStyle('val', fontSize=9, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
            ],
            # Row 2
            [
                Paragraph('ID Number', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                Paragraph(self._mask_id_number(emp.id_number), ParagraphStyle('val', fontSize=9, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
                Paragraph('Tax Reference', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                Paragraph(emp.tax_number or '-', ParagraphStyle('val', fontSize=9, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
            ],
            # Row 3
            [
                Paragraph('Position', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                Paragraph(emp.position, ParagraphStyle('val', fontSize=9, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
                Paragraph('Department', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                Paragraph(emp.department, ParagraphStyle('val', fontSize=9, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
            ],
            # Row 4 - PSIRA details
            [
                Paragraph('PSIRA Number', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                Paragraph(emp.psira_number or '-', ParagraphStyle('val', fontSize=9, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
                Paragraph('PSIRA Grade', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                Paragraph(emp.psira_grade or '-', ParagraphStyle('val', fontSize=9, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
            ],
        ]

        emp_table = Table(emp_data, colWidths=[1.4*inch, 2.35*inch, 1.4*inch, 2.35*inch])
        emp_table.setStyle(TableStyle([
            # Alternating row background
            ('BACKGROUND', (0, 0), (-1, 0), self.LIGHT_BG),
            ('BACKGROUND', (0, 2), (-1, 2), self.LIGHT_BG),
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            # Vertical alignment
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        elements.append(emp_table)
        elements.append(Spacer(1, 0.12*inch))

        return elements

    def _create_earnings_deductions_section(self, data: PayslipData) -> List:
        """Create professional earnings and deductions tables - Sage-inspired."""
        elements = []

        earn = data.earnings
        ded = data.deductions

        # Earnings data - clean format
        earnings_rows = [
            ['Description', 'Hours', 'Rate', 'Amount'],
        ]

        # Basic salary
        if earn.basic_salary > 0:
            earnings_rows.append([
                'Basic Salary',
                f"{earn.normal_hours:.1f}" if earn.normal_hours > 0 else '-',
                self._format_currency(earn.hourly_rate) if earn.hourly_rate > 0 else '-',
                self._format_currency(earn.basic_salary)
            ])

        # Overtime
        if earn.overtime_pay > 0:
            earnings_rows.append([
                'Overtime @ 1.5x',
                f"{earn.overtime_hours:.1f}",
                self._format_currency(earn.hourly_rate * 1.5),
                self._format_currency(earn.overtime_pay)
            ])

        # Night shift allowance
        if earn.night_shift_allowance > 0:
            earnings_rows.append(['Night Shift Allowance', '-', '-', self._format_currency(earn.night_shift_allowance)])

        # Sunday premium
        if earn.sunday_premium > 0:
            earnings_rows.append(['Sunday Premium @ 1.5x', f"{earn.sunday_hours:.1f}", '-', self._format_currency(earn.sunday_premium)])

        # Holiday premium
        if earn.holiday_premium > 0:
            earnings_rows.append(['Public Holiday @ 2x', f"{earn.holiday_hours:.1f}", '-', self._format_currency(earn.holiday_premium)])

        # Allowances
        if earn.supervisor_allowance > 0:
            earnings_rows.append(['Supervisor Allowance', '-', '-', self._format_currency(earn.supervisor_allowance)])
        if earn.travel_allowance > 0:
            earnings_rows.append(['Travel Allowance', '-', '-', self._format_currency(earn.travel_allowance)])
        if earn.gun_allowance > 0:
            earnings_rows.append(['Firearm Allowance', '-', '-', self._format_currency(earn.gun_allowance)])
        if earn.cleaning_allowance > 0:
            earnings_rows.append(['Cleaning Allowance', '-', '-', self._format_currency(earn.cleaning_allowance)])
        if earn.funeral_cover > 0:
            earnings_rows.append(['Funeral Benefit', '-', '-', self._format_currency(earn.funeral_cover)])
        if earn.bonus > 0:
            earnings_rows.append(['Bonus', '-', '-', self._format_currency(earn.bonus)])
        if earn.sick_pay > 0:
            earnings_rows.append(['Sick Leave Pay', '-', '-', self._format_currency(earn.sick_pay)])

        # Gross total row
        earnings_rows.append(['GROSS PAY', '', '', self._format_currency(earn.gross_salary)])

        # Deductions data
        deductions_rows = [
            ['Description', 'Amount'],
        ]

        if ded.paye > 0:
            deductions_rows.append(['PAYE (Income Tax)', self._format_currency(ded.paye)])
        if ded.uif > 0:
            deductions_rows.append(['UIF Contribution', self._format_currency(ded.uif)])
        if ded.psira_levy > 0:
            deductions_rows.append(['PSIRA Levy', self._format_currency(ded.psira_levy)])
        if ded.bargaining_council > 0:
            deductions_rows.append(['Bargaining Council', self._format_currency(ded.bargaining_council)])
        if ded.provident_fund > 0:
            deductions_rows.append(['Provident Fund', self._format_currency(ded.provident_fund)])
        if ded.hospital_cover > 0:
            deductions_rows.append(['Medical Aid', self._format_currency(ded.hospital_cover)])
        if ded.nucaaw_fee > 0:
            deductions_rows.append(['Union Fee (NUCAAW)', self._format_currency(ded.nucaaw_fee)])
        if ded.defect_deduction > 0:
            deductions_rows.append(['Equipment Deduction', self._format_currency(ded.defect_deduction)])
        if ded.other_deductions > 0:
            deductions_rows.append(['Other Deductions', self._format_currency(ded.other_deductions)])

        # Total deductions row
        deductions_rows.append(['TOTAL DEDUCTIONS', self._format_currency(ded.total_deductions)])

        # Create earnings table with professional styling
        earnings_table = Table(earnings_rows, colWidths=[2.0*inch, 0.6*inch, 0.8*inch, 1.0*inch])
        earnings_table.setStyle(TableStyle([
            # Header row - subtle gray
            ('BACKGROUND', (0, 0), (-1, 0), self.TABLE_HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), self.PRIMARY_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (-1, 0), 'RIGHT'),
            # Data rows
            ('FONTNAME', (0, 1), (0, -2), 'Helvetica'),
            ('FONTNAME', (1, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 8),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('TEXTCOLOR', (0, 1), (-1, -2), self.TEXT_COLOR),
            # Gross row - bold with background
            ('BACKGROUND', (0, -1), (-1, -1), self.TABLE_HEADER_BG),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, -1), (-1, -1), self.PRIMARY_COLOR),
            # Grid - minimal
            ('LINEBELOW', (0, 0), (-1, 0), 1, self.BORDER_COLOR),
            ('LINEBELOW', (0, -2), (-1, -2), 0.5, self.BORDER_COLOR),
            ('LINEBELOW', (0, -1), (-1, -1), 1, self.PRIMARY_COLOR),
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))

        # Create deductions table with professional styling
        deductions_table = Table(deductions_rows, colWidths=[2.4*inch, 1.0*inch])
        deductions_table.setStyle(TableStyle([
            # Header row - subtle gray
            ('BACKGROUND', (0, 0), (-1, 0), self.TABLE_HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), self.DEDUCTIONS_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            # Data rows
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 8),
            ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('TEXTCOLOR', (0, 1), (-1, -2), self.TEXT_COLOR),
            # Total row - bold with background
            ('BACKGROUND', (0, -1), (-1, -1), self.TABLE_HEADER_BG),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, -1), (-1, -1), self.DEDUCTIONS_COLOR),
            # Grid - minimal
            ('LINEBELOW', (0, 0), (-1, 0), 1, self.BORDER_COLOR),
            ('LINEBELOW', (0, -2), (-1, -2), 0.5, self.BORDER_COLOR),
            ('LINEBELOW', (0, -1), (-1, -1), 1, self.DEDUCTIONS_COLOR),
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))

        # Section headers
        earnings_header = Paragraph("EARNINGS", ParagraphStyle(
            'EarnHead', fontSize=9, fontName='Helvetica-Bold', textColor=self.PRIMARY_COLOR, spaceAfter=4
        ))
        deductions_header = Paragraph("DEDUCTIONS", ParagraphStyle(
            'DedHead', fontSize=9, fontName='Helvetica-Bold', textColor=self.DEDUCTIONS_COLOR, spaceAfter=4
        ))

        # Combine in a layout table
        layout_data = [
            [earnings_header, '', deductions_header],
            [earnings_table, '', deductions_table],
        ]
        layout_table = Table(layout_data, colWidths=[4.4*inch, 0.2*inch, 3.4*inch])
        layout_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        elements.append(layout_table)
        elements.append(Spacer(1, 0.12*inch))

        return elements

    def _create_net_pay_section(self, data: PayslipData) -> List:
        """Create prominent net pay display - professional green bar."""
        elements = []

        # Net pay summary bar
        net_pay_data = [
            [
                Paragraph('NET PAY', ParagraphStyle(
                    'NetPayLabel',
                    fontSize=11,
                    fontName='Helvetica-Bold',
                    textColor=colors.white
                )),
                Paragraph(self._format_currency(data.net_salary), ParagraphStyle(
                    'NetPayValue',
                    fontSize=18,
                    fontName='Helvetica-Bold',
                    textColor=colors.white,
                    alignment=TA_RIGHT
                ))
            ]
        ]

        net_pay_table = Table(net_pay_data, colWidths=[3*inch, 4.5*inch])
        net_pay_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.NET_PAY_BG),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 14),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        ]))

        elements.append(net_pay_table)
        elements.append(Spacer(1, 0.12*inch))

        return elements

    def _create_banking_section(self, data: PayslipData) -> List:
        """Create professional banking details section."""
        elements = []

        emp = data.employee

        if emp.bank_name or emp.account_number:
            elements.append(Paragraph("PAYMENT METHOD", ParagraphStyle(
                'BankHeader', fontSize=9, fontName='Helvetica-Bold', textColor=self.PRIMARY_COLOR, spaceAfter=4
            )))

            # Create a cleaner banking details table
            banking_data = [
                [
                    Paragraph('Bank', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                    Paragraph(emp.bank_name or '-', ParagraphStyle('val', fontSize=8, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
                    Paragraph('Account Number', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                    Paragraph(self._mask_account_number(emp.account_number) if emp.account_number else '-', ParagraphStyle('val', fontSize=8, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
                ],
                [
                    Paragraph('Branch Code', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                    Paragraph(emp.branch_code or '-', ParagraphStyle('val', fontSize=8, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
                    Paragraph('Account Type', ParagraphStyle('lbl', fontSize=7, textColor=self.MUTED_TEXT)),
                    Paragraph(emp.account_type or '-', ParagraphStyle('val', fontSize=8, fontName='Helvetica-Bold', textColor=self.TEXT_COLOR)),
                ]
            ]

            banking_table = Table(banking_data, colWidths=[1.4*inch, 2.35*inch, 1.4*inch, 2.35*inch])
            banking_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), self.LIGHT_BG),
                ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))

            elements.append(banking_table)
            elements.append(Spacer(1, 0.1*inch))

        return elements

    def _create_ytd_section(self, data: PayslipData) -> List:
        """Create Year-to-Date summary section."""
        elements = []

        if data.ytd:
            elements.append(Paragraph("YEAR-TO-DATE SUMMARY", ParagraphStyle(
                'YTDHeader', fontSize=9, fontName='Helvetica-Bold', textColor=self.PRIMARY_COLOR, spaceAfter=4
            )))

            ytd_data = [
                ['Gross Earnings', 'Total Tax (PAYE)', 'Total UIF', 'Net Earnings'],
                [
                    self._format_currency(data.ytd.gross_earnings),
                    self._format_currency(data.ytd.total_tax),
                    self._format_currency(data.ytd.total_uif),
                    self._format_currency(data.ytd.net_earnings)
                ]
            ]

            ytd_table = Table(ytd_data, colWidths=[1.875*inch, 1.875*inch, 1.875*inch, 1.875*inch])
            ytd_table.setStyle(TableStyle([
                # Header row
                ('BACKGROUND', (0, 0), (-1, 0), self.TABLE_HEADER_BG),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, 0), 7),
                ('TEXTCOLOR', (0, 0), (-1, 0), self.MUTED_TEXT),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                # Data row
                ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 1), (-1, 1), 9),
                ('TEXTCOLOR', (0, 1), (-1, 1), self.TEXT_COLOR),
                ('ALIGN', (0, 1), (-1, 1), 'CENTER'),
                ('BACKGROUND', (0, 1), (-1, 1), self.LIGHT_BG),
                # Grid
                ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))

            elements.append(ytd_table)
            elements.append(Spacer(1, 0.1*inch))

        return elements

    def _create_leave_section(self, data: PayslipData) -> List:
        """Create leave balance section."""
        elements = []

        if data.leave:
            elements.append(Paragraph("LEAVE BALANCES", ParagraphStyle(
                'LeaveHeader', fontSize=9, fontName='Helvetica-Bold', textColor=self.PRIMARY_COLOR, spaceAfter=4
            )))

            leave_data = [
                ['Annual Leave', 'Sick Leave', 'Family Responsibility', 'Taken (YTD)'],
                [
                    f"{data.leave.annual_leave_days:.1f} days",
                    f"{data.leave.sick_leave_days:.1f} days",
                    f"{data.leave.family_responsibility_days:.1f} days",
                    f"{data.leave.leave_taken_ytd:.1f} days"
                ]
            ]

            leave_table = Table(leave_data, colWidths=[1.875*inch, 1.875*inch, 1.875*inch, 1.875*inch])
            leave_table.setStyle(TableStyle([
                # Header row
                ('BACKGROUND', (0, 0), (-1, 0), self.TABLE_HEADER_BG),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, 0), 7),
                ('TEXTCOLOR', (0, 0), (-1, 0), self.MUTED_TEXT),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                # Data row
                ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 1), (-1, 1), 9),
                ('TEXTCOLOR', (0, 1), (-1, 1), self.TEXT_COLOR),
                ('ALIGN', (0, 1), (-1, 1), 'CENTER'),
                ('BACKGROUND', (0, 1), (-1, 1), self.LIGHT_BG),
                # Grid
                ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))

            elements.append(leave_table)
            elements.append(Spacer(1, 0.1*inch))

        return elements

    def _create_footer(self, data: PayslipData) -> List:
        """Create professional payslip footer."""
        elements = []

        elements.append(HRFlowable(
            width="100%",
            thickness=0.5,
            color=self.BORDER_COLOR,
            spaceBefore=12,
            spaceAfter=8
        ))

        footer_text = (
            f"This is a computer-generated payslip. | "
            f"Generated: {datetime.now().strftime('%d %B %Y %H:%M')} | "
            f"All amounts in South African Rand (ZAR)"
        )

        elements.append(Paragraph(footer_text, ParagraphStyle(
            'FooterMain',
            fontSize=7,
            textColor=self.MUTED_TEXT,
            alignment=TA_CENTER
        )))

        # Disclaimer
        disclaimer = (
            "Please review your payslip carefully. Any queries should be raised within 7 days. "
            "For questions, contact your payroll administrator."
        )
        elements.append(Paragraph(disclaimer, ParagraphStyle(
            'Disclaimer',
            fontSize=6,
            textColor=colors.HexColor('#9CA3AF'),
            alignment=TA_CENTER,
            spaceBefore=5
        )))

        return elements

    def generate_pdf(self, data: PayslipData) -> io.BytesIO:
        """Generate complete payslip PDF.

        Args:
            data: PayslipData object with all payslip information

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )

        elements = []

        # Build payslip sections
        elements.extend(self._create_header(data))
        elements.extend(self._create_employee_section(data))
        elements.extend(self._create_earnings_deductions_section(data))
        elements.extend(self._create_net_pay_section(data))
        elements.extend(self._create_banking_section(data))
        elements.extend(self._create_ytd_section(data))
        elements.extend(self._create_leave_section(data))
        elements.extend(self._create_footer(data))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)

        return buffer

    def generate_bulk_payslips(
        self,
        payslips: List[PayslipData]
    ) -> io.BytesIO:
        """Generate multiple payslips in a single PDF.

        Args:
            payslips: List of PayslipData objects

        Returns:
            BytesIO buffer containing the combined PDF
        """
        from reportlab.platypus import PageBreak

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )

        all_elements = []

        for i, data in enumerate(payslips):
            # Build payslip sections
            all_elements.extend(self._create_header(data))
            all_elements.extend(self._create_employee_section(data))
            all_elements.extend(self._create_earnings_deductions_section(data))
            all_elements.extend(self._create_net_pay_section(data))
            all_elements.extend(self._create_banking_section(data))
            all_elements.extend(self._create_ytd_section(data))
            all_elements.extend(self._create_leave_section(data))
            all_elements.extend(self._create_footer(data))

            # Add page break between payslips (except for last one)
            if i < len(payslips) - 1:
                all_elements.append(PageBreak())

        # Build PDF
        doc.build(all_elements)
        buffer.seek(0)

        return buffer


# Convenience function for creating payslip from payroll data
def create_payslip_from_payroll_record(
    employee_record: Dict[str, Any],
    company_info: Dict[str, Any],
    period_start: date,
    period_end: date,
    payment_date: date,
    payslip_number: str = ""
) -> PayslipData:
    """Create PayslipData from payroll generator output.

    Args:
        employee_record: Dictionary with employee payroll data
        company_info: Dictionary with company details
        period_start: Start of pay period
        period_end: End of pay period
        payment_date: Date of payment
        payslip_number: Optional payslip reference number

    Returns:
        PayslipData object ready for PDF generation
    """
    # Create company details
    company = CompanyDetails(
        company_name=company_info.get('company_name', 'Company Name'),
        registration_number=company_info.get('registration_number', ''),
        psira_registration=company_info.get('psira_registration', ''),
        vat_number=company_info.get('vat_number', ''),
        address_line1=company_info.get('address_line1', ''),
        address_line2=company_info.get('address_line2', ''),
        city=company_info.get('city', ''),
        postal_code=company_info.get('postal_code', ''),
        phone=company_info.get('phone', ''),
        email=company_info.get('email', '')
    )

    # Create employee details
    # Support both naming conventions: names/surname (from payroll service) and first_name/last_name
    first_name = employee_record.get('first_name') or employee_record.get('names', '')
    last_name = employee_record.get('last_name') or employee_record.get('surname', '')

    # Get employee number (support both formats)
    employee_number = (
        employee_record.get('employee_number') or
        employee_record.get('employee_no') or
        f"EMP{employee_record.get('employee_id', 0):04d}"
    )

    # Get account number (support both account_number and account_number_full)
    account_number = (
        employee_record.get('account_number_full') or
        employee_record.get('account_number', '')
    )

    employee = EmployeePayslipDetails(
        employee_id=employee_record.get('employee_id', 0),
        employee_number=employee_number,
        first_name=first_name,
        last_name=last_name,
        id_number=employee_record.get('id_number', ''),
        psira_number=employee_record.get('psira_number', ''),
        psira_grade=employee_record.get('psira_grade', ''),
        department=employee_record.get('department', 'Security Operations'),
        position=employee_record.get('position', 'Security Officer'),
        bank_name=employee_record.get('bank_name', ''),
        account_number=account_number,
        branch_code=employee_record.get('branch_code', ''),
        account_type=employee_record.get('account_type', ''),
        tax_number=employee_record.get('tax_number', '')
    )

    # Create earnings breakdown
    # Map fields supporting both naming conventions from different sources
    earnings = EarningsBreakdown(
        normal_hours=employee_record.get('normal_hours', 0.0),
        overtime_hours=employee_record.get('overtime_hours', employee_record.get('extra_hours', 0.0)),
        sunday_hours=employee_record.get('sunday_hours', 0.0),
        holiday_hours=employee_record.get('holiday_hours', 0.0),
        hourly_rate=employee_record.get('hourly_rate', employee_record.get('rate_per_hour', 0.0)),
        basic_salary=employee_record.get('basic_salary', employee_record.get('total_hours_wage', employee_record.get('regular_pay', 0.0))),
        overtime_pay=employee_record.get('overtime_pay', 0.0),
        night_shift_allowance=employee_record.get('night_allowance', employee_record.get('night_shift_allowance', employee_record.get('night_premium', 0.0))),
        sunday_premium=employee_record.get('sunday_premium', 0.0),
        holiday_premium=employee_record.get('holiday_premium', 0.0),
        supervisor_allowance=employee_record.get('supervisor_allowance', 0.0),
        travel_allowance=employee_record.get('travel_allowance', 0.0),
        gun_allowance=employee_record.get('gun_allowance', 0.0),
        cleaning_allowance=employee_record.get('cleaning_allowance', 0.0),
        funeral_cover=employee_record.get('funeral_cover', employee_record.get('funeral_allowance', 0.0)),
        bonus=employee_record.get('bonus', 0.0),
        sick_pay=employee_record.get('sick_pay', 0.0)
    )

    # Create deductions breakdown
    # Map fields supporting both naming conventions from different sources
    deductions = DeductionsBreakdown(
        paye=employee_record.get('paye', employee_record.get('tax', 0.0)),
        uif=employee_record.get('uif', 0.0),
        psira_levy=employee_record.get('psira_levy', employee_record.get('psira_deduction', 0.0)),
        bargaining_council=employee_record.get('bargaining_council', 0.0),
        provident_fund=employee_record.get('provident_fund', 0.0),
        hospital_cover=employee_record.get('hospital_cover', 0.0),
        nucaaw_fee=employee_record.get('nucaaw_fee', employee_record.get('nucaaw', 0.0)),
        defect_deduction=employee_record.get('defect_deduction', employee_record.get('defect', 0.0)),
        other_deductions=employee_record.get('other_deductions', 0.0)
    )

    # Create YTD summary if available
    ytd = None
    if 'ytd_gross' in employee_record or 'ytd_earnings' in employee_record:
        ytd = YTDSummary(
            gross_earnings=employee_record.get('ytd_gross', employee_record.get('ytd_earnings', 0.0)),
            total_tax=employee_record.get('ytd_tax', 0.0),
            total_uif=employee_record.get('ytd_uif', 0.0),
            net_earnings=employee_record.get('ytd_net', 0.0)
        )

    # Create leave balances if available
    leave = None
    if 'annual_leave' in employee_record or 'leave_balance' in employee_record:
        leave = LeaveBalances(
            annual_leave_days=employee_record.get('annual_leave', employee_record.get('leave_balance', 0.0)),
            sick_leave_days=employee_record.get('sick_leave', 0.0),
            family_responsibility_days=employee_record.get('family_leave', 0.0),
            leave_taken_ytd=employee_record.get('leave_taken_ytd', 0.0)
        )

    return PayslipData(
        company=company,
        employee=employee,
        earnings=earnings,
        deductions=deductions,
        period_start=period_start,
        period_end=period_end,
        payment_date=payment_date,
        payslip_number=payslip_number,
        ytd=ytd,
        leave=leave
    )
