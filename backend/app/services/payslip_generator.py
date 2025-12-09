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
    """Generate professional PDF payslips with SA compliance."""

    # Color scheme
    PRIMARY_COLOR = colors.HexColor('#1E3A8A')  # Navy blue
    SECONDARY_COLOR = colors.HexColor('#3B82F6')  # Blue
    ACCENT_COLOR = colors.HexColor('#10B981')  # Green for net pay
    TEXT_COLOR = colors.HexColor('#1F2937')  # Dark gray
    LIGHT_BG = colors.HexColor('#F3F4F6')  # Light gray background
    BORDER_COLOR = colors.HexColor('#D1D5DB')  # Border gray

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Create custom paragraph styles."""
        self.title_style = ParagraphStyle(
            'PayslipTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=self.PRIMARY_COLOR,
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        self.company_style = ParagraphStyle(
            'CompanyName',
            parent=self.styles['Heading1'],
            fontSize=14,
            textColor=self.PRIMARY_COLOR,
            spaceAfter=3,
            fontName='Helvetica-Bold'
        )

        self.section_header_style = ParagraphStyle(
            'SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=10,
            textColor=self.PRIMARY_COLOR,
            spaceBefore=10,
            spaceAfter=4,
            fontName='Helvetica-Bold'
        )

        self.label_style = ParagraphStyle(
            'Label',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#6B7280'),
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
            fontSize=14,
            textColor=self.ACCENT_COLOR,
            alignment=TA_RIGHT,
            fontName='Helvetica-Bold'
        )

        self.footer_style = ParagraphStyle(
            'Footer',
            parent=self.styles['Normal'],
            fontSize=7,
            textColor=colors.HexColor('#9CA3AF'),
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
        """Create payslip header with company info."""
        elements = []

        # Company name and payslip title row
        header_data = [
            [
                Paragraph(data.company.company_name.upper(), self.company_style),
                Paragraph("PAYSLIP", self.title_style)
            ]
        ]

        header_table = Table(header_data, colWidths=[4*inch, 3.5*inch])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(header_table)

        # Company details
        company_info = []
        if data.company.registration_number:
            company_info.append(f"Reg No: {data.company.registration_number}")
        if data.company.psira_registration:
            company_info.append(f"PSIRA: {data.company.psira_registration}")
        if data.company.vat_number:
            company_info.append(f"VAT: {data.company.vat_number}")

        if company_info:
            elements.append(Paragraph(
                " | ".join(company_info),
                ParagraphStyle('CompanyReg', fontSize=8, textColor=colors.HexColor('#6B7280'))
            ))

        # Address
        if data.company.address_line1:
            address_parts = [data.company.address_line1]
            if data.company.address_line2:
                address_parts.append(data.company.address_line2)
            if data.company.city:
                city_line = data.company.city
                if data.company.postal_code:
                    city_line += f", {data.company.postal_code}"
                address_parts.append(city_line)

            elements.append(Paragraph(
                " | ".join(address_parts),
                ParagraphStyle('Address', fontSize=8, textColor=colors.HexColor('#6B7280'))
            ))

        elements.append(Spacer(1, 0.15*inch))

        # Period information bar
        period_data = [
            [
                f"Period: {data.period_start.strftime('%d %b %Y')} - {data.period_end.strftime('%d %b %Y')}",
                f"Payment Date: {data.payment_date.strftime('%d %b %Y')}",
                f"Payslip #: {data.payslip_number}" if data.payslip_number else ""
            ]
        ]

        period_table = Table(period_data, colWidths=[2.8*inch, 2.4*inch, 2.3*inch])
        period_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(period_table)
        elements.append(Spacer(1, 0.15*inch))

        return elements

    def _create_employee_section(self, data: PayslipData) -> List:
        """Create employee details section."""
        elements = []

        elements.append(Paragraph("EMPLOYEE DETAILS", self.section_header_style))

        # Two-column layout for employee info
        emp = data.employee

        left_column = [
            ['Name:', f"{emp.first_name} {emp.last_name}"],
            ['ID Number:', self._mask_id_number(emp.id_number)],
            ['Tax Number:', emp.tax_number or 'Not Provided'],
            ['Department:', emp.department],
        ]

        right_column = [
            ['Employee #:', emp.employee_number],
            ['PSIRA #:', emp.psira_number or 'N/A'],
            ['PSIRA Grade:', emp.psira_grade or 'N/A'],
            ['Position:', emp.position],
        ]

        # Create individual tables
        left_table = Table(left_column, colWidths=[1.2*inch, 2.3*inch])
        right_table = Table(right_column, colWidths=[1.2*inch, 2.3*inch])

        cell_style = TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6B7280')),
            ('TEXTCOLOR', (1, 0), (1, -1), self.TEXT_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ])

        left_table.setStyle(cell_style)
        right_table.setStyle(cell_style)

        # Combine into main table
        main_data = [[left_table, right_table]]
        main_table = Table(main_data, colWidths=[3.75*inch, 3.75*inch])
        main_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.LIGHT_BG),
            ('BOX', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))

        elements.append(main_table)
        elements.append(Spacer(1, 0.1*inch))

        return elements

    def _create_earnings_deductions_section(self, data: PayslipData) -> List:
        """Create side-by-side earnings and deductions tables."""
        elements = []

        earn = data.earnings
        ded = data.deductions

        # Earnings data
        earnings_rows = [
            ['EARNINGS', 'Hours', 'Rate', 'Amount'],
        ]

        # Basic salary
        if earn.basic_salary > 0:
            earnings_rows.append([
                'Basic Salary',
                f"{earn.normal_hours:.1f}",
                self._format_currency(earn.hourly_rate),
                self._format_currency(earn.basic_salary)
            ])

        # Overtime
        if earn.overtime_pay > 0:
            earnings_rows.append([
                'Overtime (1.5x)',
                f"{earn.overtime_hours:.1f}",
                self._format_currency(earn.hourly_rate * 1.5),
                self._format_currency(earn.overtime_pay)
            ])

        # Night shift allowance
        if earn.night_shift_allowance > 0:
            earnings_rows.append([
                'Night Shift Allowance',
                '', '',
                self._format_currency(earn.night_shift_allowance)
            ])

        # Sunday premium
        if earn.sunday_premium > 0:
            earnings_rows.append([
                'Sunday Premium (1.5x)',
                f"{earn.sunday_hours:.1f}",
                '',
                self._format_currency(earn.sunday_premium)
            ])

        # Holiday premium
        if earn.holiday_premium > 0:
            earnings_rows.append([
                'Holiday Premium (2x)',
                f"{earn.holiday_hours:.1f}",
                '',
                self._format_currency(earn.holiday_premium)
            ])

        # Allowances
        if earn.supervisor_allowance > 0:
            earnings_rows.append(['Supervisor Allowance', '', '', self._format_currency(earn.supervisor_allowance)])
        if earn.travel_allowance > 0:
            earnings_rows.append(['Travel Allowance', '', '', self._format_currency(earn.travel_allowance)])
        if earn.gun_allowance > 0:
            earnings_rows.append(['Gun Allowance', '', '', self._format_currency(earn.gun_allowance)])
        if earn.cleaning_allowance > 0:
            earnings_rows.append(['Cleaning Allowance', '', '', self._format_currency(earn.cleaning_allowance)])
        if earn.funeral_cover > 0:
            earnings_rows.append(['Funeral Cover', '', '', self._format_currency(earn.funeral_cover)])
        if earn.bonus > 0:
            earnings_rows.append(['Bonus', '', '', self._format_currency(earn.bonus)])
        if earn.sick_pay > 0:
            earnings_rows.append(['Sick Pay', '', '', self._format_currency(earn.sick_pay)])

        # Gross total
        earnings_rows.append(['', '', '', ''])  # Spacer row
        earnings_rows.append(['GROSS SALARY', '', '', self._format_currency(earn.gross_salary)])

        # Deductions data
        deductions_rows = [
            ['DEDUCTIONS', '', 'Amount'],
        ]

        if ded.paye > 0:
            deductions_rows.append(['PAYE (Tax)', '', self._format_currency(ded.paye)])
        if ded.uif > 0:
            deductions_rows.append(['UIF (1%)', '', self._format_currency(ded.uif)])
        if ded.psira_levy > 0:
            deductions_rows.append(['PSIRA Levy', '', self._format_currency(ded.psira_levy)])
        if ded.bargaining_council > 0:
            deductions_rows.append(['Bargaining Council', '', self._format_currency(ded.bargaining_council)])
        if ded.provident_fund > 0:
            deductions_rows.append(['Provident Fund', '', self._format_currency(ded.provident_fund)])
        if ded.hospital_cover > 0:
            deductions_rows.append(['Hospital Cover', '', self._format_currency(ded.hospital_cover)])
        if ded.nucaaw_fee > 0:
            deductions_rows.append(['NUCAAW Fee', '', self._format_currency(ded.nucaaw_fee)])
        if ded.defect_deduction > 0:
            deductions_rows.append(['Defect Deduction', '', self._format_currency(ded.defect_deduction)])
        if ded.other_deductions > 0:
            deductions_rows.append(['Other Deductions', '', self._format_currency(ded.other_deductions)])

        # Total deductions
        deductions_rows.append(['', '', ''])  # Spacer row
        deductions_rows.append(['TOTAL DEDUCTIONS', '', self._format_currency(ded.total_deductions)])

        # Create earnings table
        earnings_table = Table(
            earnings_rows,
            colWidths=[1.8*inch, 0.6*inch, 0.8*inch, 1.0*inch]
        )
        earnings_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), self.SECONDARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            # Data rows
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica'),
            ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            # Gross row styling
            ('BACKGROUND', (0, -1), (-1, -1), self.LIGHT_BG),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))

        # Create deductions table
        deductions_table = Table(
            deductions_rows,
            colWidths=[1.8*inch, 0.6*inch, 1.0*inch]
        )
        deductions_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EF4444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            # Total row styling
            ('BACKGROUND', (0, -1), (-1, -1), self.LIGHT_BG),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))

        # Combine side by side
        combined_data = [[earnings_table, Spacer(0.2*inch, 0), deductions_table]]
        combined_table = Table(combined_data, colWidths=[4.2*inch, 0.2*inch, 3.4*inch])

        elements.append(combined_table)
        elements.append(Spacer(1, 0.15*inch))

        return elements

    def _create_net_pay_section(self, data: PayslipData) -> List:
        """Create prominent net pay display."""
        elements = []

        net_pay_data = [
            [
                Paragraph('NET PAY', ParagraphStyle(
                    'NetPayLabel',
                    fontSize=12,
                    fontName='Helvetica-Bold',
                    textColor=colors.white
                )),
                Paragraph(self._format_currency(data.net_salary), ParagraphStyle(
                    'NetPayValue',
                    fontSize=16,
                    fontName='Helvetica-Bold',
                    textColor=colors.white,
                    alignment=TA_RIGHT
                ))
            ]
        ]

        net_pay_table = Table(net_pay_data, colWidths=[3*inch, 4.5*inch])
        net_pay_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.ACCENT_COLOR),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        ]))

        elements.append(net_pay_table)
        elements.append(Spacer(1, 0.15*inch))

        return elements

    def _create_banking_section(self, data: PayslipData) -> List:
        """Create banking details section."""
        elements = []

        emp = data.employee

        if emp.bank_name or emp.account_number:
            elements.append(Paragraph("PAYMENT DETAILS", self.section_header_style))

            banking_data = [[
                f"Bank: {emp.bank_name or 'N/A'}",
                f"Account: {self._mask_account_number(emp.account_number) if emp.account_number else 'N/A'}",
                f"Branch: {emp.branch_code or 'N/A'}",
                f"Type: {emp.account_type or 'N/A'}"
            ]]

            banking_table = Table(banking_data, colWidths=[2*inch, 2*inch, 1.75*inch, 1.75*inch])
            banking_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), self.LIGHT_BG),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BOX', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))

            elements.append(banking_table)
            elements.append(Spacer(1, 0.1*inch))

        return elements

    def _create_ytd_section(self, data: PayslipData) -> List:
        """Create Year-to-Date summary section."""
        elements = []

        if data.ytd:
            elements.append(Paragraph("YEAR-TO-DATE SUMMARY", self.section_header_style))

            ytd_data = [[
                f"Gross Earnings: {self._format_currency(data.ytd.gross_earnings)}",
                f"Total Tax: {self._format_currency(data.ytd.total_tax)}",
                f"Total UIF: {self._format_currency(data.ytd.total_uif)}",
                f"Net Earnings: {self._format_currency(data.ytd.net_earnings)}"
            ]]

            ytd_table = Table(ytd_data, colWidths=[2*inch, 2*inch, 1.75*inch, 1.75*inch])
            ytd_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EEF2FF')),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BOX', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))

            elements.append(ytd_table)
            elements.append(Spacer(1, 0.1*inch))

        return elements

    def _create_leave_section(self, data: PayslipData) -> List:
        """Create leave balance section."""
        elements = []

        if data.leave:
            elements.append(Paragraph("LEAVE BALANCES", self.section_header_style))

            leave_data = [[
                f"Annual: {data.leave.annual_leave_days:.1f} days",
                f"Sick: {data.leave.sick_leave_days:.1f} days",
                f"Family: {data.leave.family_responsibility_days:.1f} days",
                f"Taken YTD: {data.leave.leave_taken_ytd:.1f} days"
            ]]

            leave_table = Table(leave_data, colWidths=[2*inch, 2*inch, 1.75*inch, 1.75*inch])
            leave_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF3C7')),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BOX', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))

            elements.append(leave_table)
            elements.append(Spacer(1, 0.1*inch))

        return elements

    def _create_footer(self, data: PayslipData) -> List:
        """Create payslip footer."""
        elements = []

        elements.append(HRFlowable(
            width="100%",
            thickness=0.5,
            color=self.BORDER_COLOR,
            spaceBefore=10,
            spaceAfter=10
        ))

        footer_text = (
            f"This is a computer-generated payslip and does not require a signature. | "
            f"Generated on {datetime.now().strftime('%d %B %Y at %H:%M')} | "
            f"RostraCore Payroll System | All amounts in South African Rand (ZAR)"
        )

        elements.append(Paragraph(footer_text, self.footer_style))

        # Disclaimer
        disclaimer = (
            "Please review your payslip carefully. Any queries must be raised within 7 days "
            "of receipt. For questions, contact your HR department or payroll administrator."
        )
        elements.append(Paragraph(disclaimer, ParagraphStyle(
            'Disclaimer',
            fontSize=7,
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
