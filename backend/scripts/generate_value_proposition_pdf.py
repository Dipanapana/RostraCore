"""
RostraCore — Comprehensive Value Proposition Document
Professional PDF generation using ReportLab

Covers: pain points (mathematical, administrative, management, financial),
platform capabilities, SA compliance, predictive intelligence, future vision,
pricing & ROI.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from datetime import datetime
import os

# ── Brand colours ────────────────────────────────────────────
PRIMARY = '#2563eb'
PRIMARY_DARK = '#1e40af'
ACCENT = '#0ea5e9'
DARK = '#1a1a1a'
MUTED = '#4a4a4a'
LIGHT_MUTED = '#6b7280'
HIGHLIGHT_BG = '#dbeafe'
ROW_ALT = '#f9fafb'
SUCCESS = '#059669'
WARNING = '#d97706'

PAGE_W, PAGE_H = A4
CONTENT_W = PAGE_W - 144  # 72pt margins each side


class ValuePropositionGenerator:
    def __init__(self, filename="RostraCore_Value_Proposition.pdf"):
        self.filename = filename
        self.doc = SimpleDocTemplate(
            filename,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
        )
        self.styles = getSampleStyleSheet()
        self.story = []
        self._setup_styles()

    # ── Custom styles ────────────────────────────────────────
    def _setup_styles(self):
        self.styles.add(ParagraphStyle(
            name='CoverTitle', parent=self.styles['Title'],
            fontSize=32, textColor=colors.HexColor(PRIMARY_DARK),
            spaceAfter=10, alignment=TA_CENTER, fontName='Helvetica-Bold',
        ))
        self.styles.add(ParagraphStyle(
            name='CoverSubtitle', parent=self.styles['Normal'],
            fontSize=16, textColor=colors.HexColor(MUTED),
            spaceAfter=6, alignment=TA_CENTER, fontName='Helvetica',
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader', parent=self.styles['Heading1'],
            fontSize=22, textColor=colors.HexColor(PRIMARY),
            spaceAfter=14, spaceBefore=4, fontName='Helvetica-Bold',
        ))
        self.styles.add(ParagraphStyle(
            name='SubHeader', parent=self.styles['Heading2'],
            fontSize=15, textColor=colors.HexColor(PRIMARY_DARK),
            spaceAfter=8, spaceBefore=14, fontName='Helvetica-Bold',
        ))
        self.styles.add(ParagraphStyle(
            name='SubHeader2', parent=self.styles['Heading3'],
            fontSize=12, textColor=colors.HexColor(PRIMARY_DARK),
            spaceAfter=6, spaceBefore=10, fontName='Helvetica-Bold',
        ))
        self.styles.add(ParagraphStyle(
            name='Body', parent=self.styles['Normal'],
            fontSize=10.5, textColor=colors.HexColor(DARK),
            spaceAfter=10, alignment=TA_JUSTIFY, leading=15,
        ))
        self.styles.add(ParagraphStyle(
            name='BodySmall', parent=self.styles['Normal'],
            fontSize=9.5, textColor=colors.HexColor(DARK),
            spaceAfter=8, alignment=TA_JUSTIFY, leading=13.5,
        ))
        self.styles.add(ParagraphStyle(
            name='Highlight', parent=self.styles['Normal'],
            fontSize=10.5, textColor=colors.HexColor(DARK),
            backColor=colors.HexColor(HIGHLIGHT_BG),
            borderPadding=10, spaceAfter=14,
        ))
        self.styles.add(ParagraphStyle(
            name='StatNumber', parent=self.styles['Normal'],
            fontSize=28, textColor=colors.HexColor(PRIMARY),
            alignment=TA_CENTER, fontName='Helvetica-Bold',
            spaceAfter=2,
        ))
        self.styles.add(ParagraphStyle(
            name='StatLabel', parent=self.styles['Normal'],
            fontSize=9, textColor=colors.HexColor(MUTED),
            alignment=TA_CENTER, spaceAfter=4,
        ))
        self.styles.add(ParagraphStyle(
            name='FooterStyle', parent=self.styles['Normal'],
            fontSize=8, textColor=colors.HexColor(LIGHT_MUTED),
            alignment=TA_CENTER, fontName='Helvetica-Oblique',
        ))

    # ── Helper: standard table style ────────────────────────
    def _table_style(self, header_color=PRIMARY_DARK):
        return TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(header_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTSIZE', (0, 1), (-1, -1), 8.5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1),
             [colors.white, colors.HexColor(ROW_ALT)]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ])

    def _hr(self):
        self.story.append(HRFlowable(
            width="100%", thickness=1,
            color=colors.HexColor('#e5e7eb'),
            spaceAfter=10, spaceBefore=10,
        ))

    # ══════════════════════════════════════════════════════════
    # SECTION 1 — COVER PAGE
    # ══════════════════════════════════════════════════════════
    def _sec_cover(self):
        self.story.append(Spacer(1, 1.2 * inch))
        self.story.append(Paragraph("<b>RostraCore</b>", self.styles['CoverTitle']))
        self.story.append(Paragraph(
            "Security Workforce Management — Reimagined",
            self.styles['CoverSubtitle'],
        ))
        self.story.append(Spacer(1, 0.15 * inch))
        self.story.append(HRFlowable(
            width="40%", thickness=2, color=colors.HexColor(PRIMARY),
            spaceAfter=12, spaceBefore=4, hAlign='CENTER',
        ))
        self.story.append(Paragraph(
            "<i>Comprehensive Value Proposition</i>",
            ParagraphStyle(name='_cv1', fontSize=14,
                           textColor=colors.HexColor(MUTED),
                           alignment=TA_CENTER, fontName='Helvetica-Oblique'),
        ))
        self.story.append(Spacer(1, 1 * inch))

        info = [
            ['Prepared by:', 'Blaq Cooperation (Pty) Ltd'],
            ['Document:', 'Value Proposition — Executive Edition'],
            ['Date:', datetime.now().strftime('%B %Y')],
            ['Version:', '2.0'],
            ['Classification:', 'Confidential'],
        ]
        t = Table(info, colWidths=[1.8 * inch, 4 * inch])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor(MUTED)),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor(DARK)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        self.story.append(t)
        self.story.append(Spacer(1, 1.2 * inch))
        self.story.append(Paragraph(
            "<i>\"The question is not whether you can afford RostraCore — "
            "it's whether you can afford to operate without it.\"</i>",
            ParagraphStyle(name='_cv2', fontSize=10,
                           textColor=colors.HexColor(LIGHT_MUTED),
                           alignment=TA_CENTER,
                           fontName='Helvetica-Oblique'),
        ))
        self.story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # SECTION 2 — EXECUTIVE SUMMARY
    # ══════════════════════════════════════════════════════════
    def _sec_executive_summary(self):
        self.story.append(Paragraph("1. Executive Summary", self.styles['SectionHeader']))

        self.story.append(Paragraph(
            "<b>The South African private security industry is a R90+ billion market</b> — "
            "the largest private security sector per capita on the planet. Yet an estimated "
            "90% of security companies still manage their workforce with Excel spreadsheets, "
            "WhatsApp groups, and manual calculations. This operational reality bleeds "
            "R500,000 to R750,000 annually from the average security company's bottom line "
            "through preventable scheduling errors, compliance violations, budget overruns, "
            "and administrative overhead.",
            self.styles['Body'],
        ))
        self.story.append(Paragraph(
            "RostraCore is a purpose-built, cloud-native workforce management platform "
            "designed exclusively for the security industry. We replace chaos with "
            "mathematical certainty — generating compliant, cost-optimised rosters in "
            "seconds, automating payroll with full SA tax compliance, and providing "
            "real-time operational visibility across every site, guard, and shift.",
            self.styles['Body'],
        ))

        # Key numbers strip
        nums = [
            ('90+', 'Feature Modules'),
            ('91', 'API Endpoints'),
            ('69', 'Data Models'),
            ('R29', 'Per Guard / Month'),
            ('14', 'Day Free Trial'),
        ]
        row_vals = [Paragraph(f"<b>{n}</b>", self.styles['StatNumber']) for n, _ in nums]
        row_labels = [Paragraph(l, self.styles['StatLabel']) for _, l in nums]
        cw = CONTENT_W / 5
        stat_t = Table([row_vals, row_labels], colWidths=[cw] * 5)
        stat_t.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(HIGHLIGHT_BG)),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(PRIMARY)),
            ('TOPPADDING', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 10),
        ]))
        self.story.append(Spacer(1, 0.15 * inch))
        self.story.append(stat_t)
        self.story.append(Spacer(1, 0.15 * inch))

        self.story.append(Paragraph(
            "This document details the full value proposition: the pain points we solve "
            "today, the mathematical and financial basis of our solution, the compliance "
            "expertise we embed, and our vision for the future — from IoT hardware "
            "integration to machine-learning-driven predictive workforce management.",
            self.styles['Body'],
        ))
        self.story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # SECTION 3 — THE PROBLEM LANDSCAPE
    # ══════════════════════════════════════════════════════════
    def _sec_problem_landscape(self):
        self.story.append(Paragraph("2. The Problem Landscape", self.styles['SectionHeader']))
        self.story.append(Paragraph(
            "Security companies face a unique convergence of operational challenges that "
            "no generic HR or scheduling tool was designed to address. We categorise these "
            "into four interconnected domains:",
            self.styles['Body'],
        ))

        # ── 2a. Mathematical ────────────────────────────────
        self.story.append(Paragraph("2.1 Mathematical Pain Points", self.styles['SubHeader']))
        self.story.append(Paragraph(
            "Roster creation is, at its core, a <b>combinatorial optimisation problem</b>. "
            "For a company with 70 guards across 10 sites, each with 3 shift patterns, "
            "the solution space exceeds <b>10<super>45</super> possible combinations</b>. "
            "A human planner armed with Excel cannot explore even 0.001% of this space — "
            "meaning the roster they produce is virtually guaranteed to be sub-optimal.",
            self.styles['Body'],
        ))

        math_points = [
            ['Challenge', 'Mathematical Reality', 'Human Performance'],
            ['Roster generation',
             'NP-hard constraint satisfaction;\nneed solver-class algorithms',
             '8-12 hours / week;\nfinds ~1 feasible solution, never optimal'],
            ['Shift coverage\ncalculation',
             'guard_availability x site_requirements\nx compliance_constraints\n= millions of combos',
             'Mental approximation;\ngaps discovered after the fact'],
            ['Overtime cascading',
             'One miscalculation compounds\nacross entire pay period\n(exponential error propagation)',
             'Errors found only at month-end;\ncostly corrections'],
            ['Budget forecasting',
             'labour_cost = \u03a3(hours x rate x premiums)\nacross all staff, sites, shift types',
             'Rough estimates; 15-20%\nvariance from actual'],
            ['Optimal assignment',
             'Hungarian algorithm minimises\ntotal cost across all assignments',
             'Gut-feel assignment;\nfavouritism, inefficiency'],
        ]
        t = Table(math_points, colWidths=[1.4 * inch, 2.4 * inch, 2.4 * inch])
        t.setStyle(self._table_style())
        self.story.append(t)
        self.story.append(Spacer(1, 0.1 * inch))

        self.story.append(Paragraph(
            "<b>Bottom line:</b> Manual rostering is not just slow — it is "
            "mathematically incapable of producing optimal results. Every week "
            "you schedule manually, you leave money on the table.",
            self.styles['Highlight'],
        ))

        # ── 2b. Administrative ──────────────────────────────
        self.story.append(Paragraph("2.2 Administrative Pain Points", self.styles['SubHeader']))
        admin_points = [
            ['Pain Point', 'Annual Impact'],
            ['Manual rostering (500+ hrs/year)', 'R175,000 in ops manager salary cost'],
            ['Certification tracking across 100+ guards', 'Risk of expired PSIRA on duty; contract loss'],
            ['Payroll with 7+ deduction types\n(PAYE, UIF, SDL, PSIRA, provident, bargaining\ncouncil, hospital plan)',
             'R30,000+ in calculation errors per year'],
            ['Leave management in separate spreadsheets', 'Double-bookings; uncovered shifts'],
            ['Disciplinary records, training logs\nin filing cabinets',
             'Lost evidence; failed CCMA cases'],
            ['Attendance verification via paper sign-in', 'Ghost employees; billing disputes'],
            ['Client reporting compiled manually', '40+ hours/month; delayed billing'],
        ]
        t = Table(admin_points, colWidths=[3.4 * inch, 2.8 * inch])
        t.setStyle(self._table_style())
        self.story.append(t)

        # ── 2c. Management ──────────────────────────────────
        self.story.append(Paragraph("2.3 Management Pain Points", self.styles['SubHeader']))
        self.story.append(Paragraph(
            "Security company directors consistently report the same frustrations:",
            self.styles['Body'],
        ))
        mgmt_points = [
            "<b>Zero real-time visibility</b> — Cannot answer \"how many guards are on site right now?\" without phoning supervisors.",
            "<b>Reactive decision-making</b> — Problems discovered after they cause damage (uncovered shift, budget overrun, expired certification).",
            "<b>No audit trail</b> — When disputes arise, there's no record of who made which scheduling decision and why.",
            "<b>Client satisfaction unknown</b> — You learn about client dissatisfaction only when the contract isn't renewed.",
            "<b>Employee turnover unpredictable</b> — Guards leave without warning; no data to identify at-risk employees.",
            "<b>Site profitability invisible</b> — Cannot determine which contracts make money and which lose money.",
        ]
        for pt in mgmt_points:
            self.story.append(Paragraph(
                f"\u2022  {pt}", self.styles['BodySmall'],
            ))
        self.story.append(Spacer(1, 0.05 * inch))

        # ── 2d. Financial ───────────────────────────────────
        self.story.append(Paragraph("2.4 Financial Pain Points", self.styles['SubHeader']))
        fin_data = [
            ['Financial Risk', 'Typical Annual Cost', 'Frequency'],
            ['Budget overruns from manual scheduling', 'R180,000 - R360,000', 'Every month'],
            ['BCEA compliance fines', 'R15,000 - R30,000 per violation', '3-5 incidents / year'],
            ['Lost contracts from coverage gaps', 'R500,000 - R2,000,000', '1-2 per year'],
            ['Payroll correction costs', 'R30,000 - R60,000', 'Quarterly'],
            ['Overtime over-payment (untracked)', 'R50,000 - R120,000', 'Ongoing'],
            ['No site-level profitability analysis', 'Unknown margin erosion', 'Continuous'],
        ]
        t = Table(fin_data, colWidths=[2.6 * inch, 2.0 * inch, 1.6 * inch])
        t.setStyle(self._table_style())
        self.story.append(t)
        self.story.append(Spacer(1, 0.1 * inch))

        self.story.append(Paragraph(
            "<b>Combined annual cost of manual operations for a 70-guard company: "
            "R500,000 — R750,000.</b> That is 50-75% of a typical security "
            "company's net profit — gone to preventable waste.",
            self.styles['Highlight'],
        ))
        self.story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # SECTION 4 — THE ROSTRACORE PLATFORM
    # ══════════════════════════════════════════════════════════
    def _sec_platform(self):
        self.story.append(Paragraph("3. The RostraCore Platform", self.styles['SectionHeader']))
        self.story.append(Paragraph(
            "RostraCore is built on six core pillars, each addressing a fundamental "
            "requirement of security workforce management. Together they form a complete "
            "ecosystem — no third-party tools, no manual hand-offs, no data silos.",
            self.styles['Body'],
        ))

        pillars = [
            ("Pillar 1: AI-Powered Roster Optimisation",
             "Constraint-satisfaction solver generates compliant, cost-minimised "
             "rosters in under 60 seconds. Supports weekly, bi-weekly, and monthly "
             "generation with drag-and-drop visual editing. Maintains full audit trail "
             "with roster snapshots and version history."),
            ("Pillar 2: Automated Compliance Engine",
             "Embeds PSIRA grade hierarchy, BCEA working-hour limits, rest-period "
             "rules, and POPIA data-protection requirements directly into every "
             "scheduling decision. Violations are mathematically impossible — "
             "the system blocks non-compliant assignments before they happen."),
            ("Pillar 3: Complete Workforce Management",
             "168+ employee data points per guard — skills matrix, certifications, "
             "restrictions, availability patterns, disciplinary history, training "
             "records, emergency contacts, and performance metrics. Full employee "
             "lifecycle from onboarding to exit."),
            ("Pillar 4: Financial Intelligence",
             "Automated payroll with SA tax calculations (PAYE brackets, UIF caps, "
             "SDL thresholds, age-based rebates). Professional invoice generation. "
             "Site profitability analysis. Budget tracking with variance alerts. "
             "Contract value monitoring. Revenue forecasting."),
            ("Pillar 5: Real-Time Operations",
             "Live GPS breadcrumb trails, biometric attendance verification, "
             "geofencing for site boundaries, command-centre dispatch dashboard, "
             "incident reporting with photo evidence, patrol route tracking, "
             "and lone-worker safety monitoring."),
            ("Pillar 6: Client Excellence",
             "Client portal with real-time dashboards. SLA compliance tracking. "
             "Satisfaction surveys. Automated client reporting. Contract renewal "
             "management. Site risk assessments. Transparent billing."),
        ]
        for title, desc in pillars:
            self.story.append(Paragraph(f"<b>{title}</b>", self.styles['SubHeader2']))
            self.story.append(Paragraph(desc, self.styles['BodySmall']))

        self.story.append(Spacer(1, 0.1 * inch))

        # Feature inventory table
        self.story.append(Paragraph(
            "<b>Platform Feature Inventory (90+ modules)</b>", self.styles['SubHeader'],
        ))
        cats = [
            ['Category', 'Modules', 'Count'],
            ['Workforce & HR',
             'Employee profiles, grades, skills matrix, certifications,\n'
             'restrictions, availability, turnover analytics, HR analytics,\n'
             'performance reviews, disciplinary, training, emergency contacts',
             '12'],
            ['Roster & Scheduling',
             'Auto-generation, DnD visual editor, shift patterns,\n'
             'spare pool, swaps, exceptions, unfilled shifts, alerts,\n'
             'compliance checks, forecasting, roster snapshots/audit',
             '11'],
            ['Attendance & Time',
             'Biometric check-in/out, GPS verification, geofencing,\n'
             'attendance analytics, live breadcrumb trails, photo evidence',
             '6'],
            ['Patrols & Operations',
             'Route planning, checkpoint scanning, patrol analytics,\n'
             'lone-worker monitoring, command centre, deployments map,\n'
             'incident management, incident analytics',
             '8'],
            ['Finance & Billing',
             'Payroll (SA compliant), payslip generation, overtime calc,\n'
             'invoicing, contract values, budgets, revenue tracking,\n'
             'site profitability, shift costs, payroll reports/exports',
             '10'],
            ['Compliance',
             'PSIRA wage rates, BCEA hours, POPIA consent management,\n'
             'data subject requests, compliance calendar, cert-alerts,\n'
             'firearms register, contract compliance',
             '8'],
            ['Client Management',
             'Client profiles, satisfaction surveys, SLA compliance,\n'
             'renewals, client reports, visitor management',
             '6'],
            ['Comms & Docs',
             'Announcements, push notifications, comm-log, documents,\n'
             'occurrence book, daily activity reports, shift handovers',
             '7'],
            ['Admin & System',
             'Multi-org, user management, company profile, hourly rates,\n'
             'shift patterns config, report schedules, custom digital\n'
             'forms, fleet management, asset tracking, maintenance',
             '10'],
            ['Analytics & Reporting',
             'Dashboard, ops summary, workforce forecast, availability\n'
             'heatmap, exportable reports, scheduled report delivery',
             '6'],
        ]
        # Calculate widths
        t = Table(cats, colWidths=[1.4 * inch, 3.6 * inch, 0.7 * inch])
        ts = self._table_style()
        ts.add('ALIGN', (2, 0), (2, -1), 'CENTER')
        t.setStyle(ts)
        self.story.append(t)

        self.story.append(Spacer(1, 0.1 * inch))
        self.story.append(Paragraph(
            "<b>Total: 90+ integrated modules</b> — every one accessible from a single "
            "web dashboard and companion mobile app. No add-on purchases, no per-module "
            "licensing. Every customer gets every feature.",
            self.styles['Highlight'],
        ))
        self.story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # SECTION 5 — HOW WE SOLVE EACH PAIN POINT
    # ══════════════════════════════════════════════════════════
    def _sec_before_after(self):
        self.story.append(Paragraph(
            "4. How We Solve Each Pain Point", self.styles['SectionHeader'],
        ))
        self.story.append(Paragraph(
            "For every category of pain identified in Section 2, RostraCore delivers "
            "a measurable, quantifiable improvement. Below is a before-and-after view "
            "with the financial impact for a typical 70-guard, 10-site operation.",
            self.styles['Body'],
        ))

        # ── Mathematical ────────────────────────────────────
        self.story.append(Paragraph(
            "4.1 Mathematical Problems — Solved", self.styles['SubHeader'],
        ))
        math_ba = [
            ['Problem', 'Before RostraCore', 'After RostraCore', 'Saving'],
            ['Roster creation',
             '8-12 hours / week\n(manual trial & error)',
             '30-60 seconds\n(constraint solver)',
             '500+ hrs / year\n= R175,000'],
            ['Optimal assignment',
             'Gut feel; same guards\nget same shifts',
             'Hungarian algorithm;\ncost-minimised globally',
             '15-20% labour\ncost reduction'],
            ['Overtime cascading',
             'Discovered at payroll;\ncostly corrections',
             'Real-time hour tracking;\nalerts before breach',
             'R50K-R120K / year'],
            ['Budget variance',
             '15-20% overrun\n(discovered month-end)',
             'Live budget tracking;\nvariance < 3%',
             'R180K-R360K / year'],
        ]
        t = Table(math_ba, colWidths=[1.3 * inch, 1.6 * inch, 1.6 * inch, 1.3 * inch])
        t.setStyle(self._table_style(PRIMARY))
        self.story.append(t)
        self.story.append(Spacer(1, 0.1 * inch))

        # ── Administrative ──────────────────────────────────
        self.story.append(Paragraph(
            "4.2 Administrative Problems — Eliminated", self.styles['SubHeader'],
        ))
        admin_ba = [
            ['Problem', 'Before RostraCore', 'After RostraCore', 'Saving'],
            ['Certification tracking',
             'Spreadsheet; expired certs\ndiscovered on audit day',
             '30/60/90-day automated\nalerts; dashboard view',
             'Prevents contract\ntermination'],
            ['Payroll calculation',
             '2-3 days manual work;\n7+ deduction formulas',
             'One-click generation;\nSA tax engine built-in',
             '30+ hrs / month\n= R60,000 / year'],
            ['Leave management',
             'Separate spreadsheet;\nconflicts found too late',
             'Integrated calendar;\nauto-checks coverage',
             'Zero coverage\ngaps from leave'],
            ['Client reporting',
             '40+ hrs / month\ncompiling Excel reports',
             'Automated scheduled\nreport delivery',
             '480 hrs / year\n= R120,000'],
            ['Attendance proof',
             'Paper sign-in sheets;\ndisputes unresolvable',
             'GPS + biometric + photo\nwith timestamp',
             'Eliminates billing\ndisputes'],
        ]
        t = Table(admin_ba, colWidths=[1.3 * inch, 1.6 * inch, 1.6 * inch, 1.3 * inch])
        t.setStyle(self._table_style(PRIMARY))
        self.story.append(t)
        self.story.append(Spacer(1, 0.1 * inch))

        # ── Management ──────────────────────────────────────
        self.story.append(Paragraph(
            "4.3 Management Problems — Transformed", self.styles['SubHeader'],
        ))
        mgmt_ba = [
            ['Problem', 'Before RostraCore', 'After RostraCore'],
            ['Real-time visibility',
             'Phone calls to supervisors;\nhours-old information',
             'Live dashboard; GPS tracking;\nreal-time headcount per site'],
            ['Decision-making',
             'Reactive; problems surface\nafter damage is done',
             'Predictive alerts; act on\ndata before problems occur'],
            ['Audit trail',
             'No record of who made\nwhich scheduling decision',
             'Full version history; roster\nsnapshots; change log'],
            ['Client satisfaction',
             'Discovered at renewal\n(or non-renewal)',
             'SLA tracking; satisfaction\nsurveys; proactive engagement'],
            ['Employee retention',
             'Guards leave without\nwarning; no early signals',
             'Performance data; fair\nrotation; burnout prevention'],
            ['Site profitability',
             'Unknown; all contracts\ntreated equally',
             'Per-site P&L; margin\nanalysis; informed bidding'],
        ]
        t = Table(mgmt_ba, colWidths=[1.4 * inch, 2.2 * inch, 2.6 * inch])
        t.setStyle(self._table_style(PRIMARY))
        self.story.append(t)

        self.story.append(Spacer(1, 0.15 * inch))
        self.story.append(Paragraph(
            "<b>Conservative total annual savings for a 70-guard company: "
            "R500,000 — R750,000.</b> Against a RostraCore subscription of "
            "R24,360/year (70 guards x R29/month), this represents a "
            "<b>20-30x return on investment</b>.",
            self.styles['Highlight'],
        ))
        self.story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # SECTION 6 — SA COMPLIANCE DEEP DIVE
    # ══════════════════════════════════════════════════════════
    def _sec_compliance(self):
        self.story.append(Paragraph(
            "5. South African Compliance Deep Dive", self.styles['SectionHeader'],
        ))
        self.story.append(Paragraph(
            "RostraCore is not a generic platform localised for South Africa — it was "
            "<b>built from the ground up</b> around SA regulatory requirements. Our "
            "compliance engine embeds the following frameworks:",
            self.styles['Body'],
        ))

        # ── PSIRA ───────────────────────────────────────────
        self.story.append(Paragraph("5.1 PSIRA (Private Security Industry Regulatory Authority)", self.styles['SubHeader']))
        self.story.append(Paragraph(
            "Every security officer in South Africa must be registered with PSIRA and "
            "hold the appropriate grade. RostraCore tracks:",
            self.styles['Body'],
        ))
        psira_data = [
            ['Capability', 'Detail'],
            ['Grade hierarchy', 'Grades A-E with automatic skill-level validation'],
            ['Minimum wage rates', 'Gazetted PSIRA minimums by grade and area;\nalerts if rate below minimum'],
            ['Registration tracking', 'PSIRA number, expiry dates, renewal alerts\n(30/60/90 day warnings)'],
            ['Grade restrictions', 'Prevents assigning guards to tasks above\ntheir grade certification'],
            ['PSIRA levy deduction', 'Automatic R22/month deduction in payroll'],
        ]
        t = Table(psira_data, colWidths=[1.6 * inch, 4.2 * inch])
        t.setStyle(self._table_style())
        self.story.append(t)
        self.story.append(Spacer(1, 0.08 * inch))

        # ── BCEA ────────────────────────────────────────────
        self.story.append(Paragraph("5.2 BCEA (Basic Conditions of Employment Act)", self.styles['SubHeader']))
        bcea_data = [
            ['Rule', 'BCEA Requirement', 'RostraCore Enforcement'],
            ['Maximum ordinary hours', '45 hours / week', 'Hard cap; blocks assignment\nthat would exceed'],
            ['Daily maximum', '9 hrs (5-day week)\n8 hrs (6-day week)', 'Validated per shift\nassignment'],
            ['Overtime cap', '10 hrs / week;\n3 hrs / day', 'Real-time tracking;\nalerts at 80% threshold'],
            ['Rest periods', '12 consecutive hours\nbetween shifts;\n1 hour meal after 5 hrs', 'Enforced in roster\ngeneration algorithm'],
            ['Sunday premium', '2x ordinary rate', 'Automatic calculation\nin payroll engine'],
            ['Public holiday premium', '2x ordinary rate', 'SA holiday calendar\nbuilt in (includes\nprovincial holidays)'],
            ['Night shift premium', '10% uplift (18:00-06:00)', 'Automatic detection\nand calculation'],
        ]
        t = Table(bcea_data, colWidths=[1.4 * inch, 1.8 * inch, 2.2 * inch])
        t.setStyle(self._table_style())
        self.story.append(t)
        self.story.append(Spacer(1, 0.08 * inch))

        # ── POPIA ───────────────────────────────────────────
        self.story.append(Paragraph("5.3 POPIA (Protection of Personal Information Act)", self.styles['SubHeader']))
        self.story.append(Paragraph(
            "As a processor of employee personal information, security companies must "
            "comply with POPIA. RostraCore provides:",
            self.styles['Body'],
        ))
        popia_points = [
            "<b>Consent management</b> — digital consent capture and tracking per employee",
            "<b>Data subject requests</b> — built-in DSR workflow (access, correction, deletion)",
            "<b>Audit trail</b> — full log of who accessed which personal data and when",
            "<b>Data minimisation</b> — role-based access ensures users see only what they need",
            "<b>Breach notification</b> — incident tracking for data breach response",
        ]
        for pt in popia_points:
            self.story.append(Paragraph(f"\u2022  {pt}", self.styles['BodySmall']))

        # ── SARS ────────────────────────────────────────────
        self.story.append(Paragraph("5.4 SARS Tax Compliance", self.styles['SubHeader']))
        self.story.append(Paragraph(
            "RostraCore's payroll engine implements the full South African tax framework:",
            self.styles['Body'],
        ))
        sars_data = [
            ['Deduction', 'Formula / Rate', 'Notes'],
            ['PAYE (Income Tax)',
             '2025/26 tax brackets:\n18% up to R237,100\n26% R237,101-R370,500\n31% R370,501-R512,800\n36% R512,801-R673,000\n39% R673,001-R857,900\n41% R857,901-R1,817,000\n45% above R1,817,000',
             'Annualised monthly calc;\nprimary rebate R17,235;\nsecondary (65+) R9,444;\ntertiary (75+) R3,145'],
            ['UIF',
             '1% of remuneration;\ncapped at R177.12/month',
             'Employer matches 1%;\nRostraCore calculates both'],
            ['SDL (Skills Development)',
             '1% of total payroll\n(employer levy)',
             'Exempt if payroll\n< R500,000/year'],
            ['PSIRA Levy', 'R22.00 / month', 'Fixed deduction for\nall registered officers'],
            ['Provident / Pension',
             'As per company scheme\n(typically 5-7.5%)',
             'Configurable per\norganisation'],
            ['Bargaining Council',
             'As per sectoral\ndetermination',
             'Configurable; area-\nspecific rates supported'],
        ]
        t = Table(sars_data, colWidths=[1.3 * inch, 2.2 * inch, 2.3 * inch])
        t.setStyle(self._table_style())
        self.story.append(t)

        self.story.append(Spacer(1, 0.12 * inch))
        self.story.append(Paragraph(
            "<b>Every payslip RostraCore generates is audit-ready.</b> No more manual "
            "tax calculations, no more SARS penalties for incorrect PAYE, no more UIF "
            "discrepancies. The formulas are embedded, tested, and updated annually.",
            self.styles['Highlight'],
        ))
        self.story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # SECTION 7 — PREDICTIVE INTELLIGENCE
    # ══════════════════════════════════════════════════════════
    def _sec_predictive(self):
        self.story.append(Paragraph(
            "6. Predictive Intelligence: From Reactive to Proactive",
            self.styles['SectionHeader'],
        ))
        self.story.append(Paragraph(
            "The fundamental shift RostraCore enables is moving from <b>reactive</b> "
            "operations (\"find out Monday morning that Sunday's shift was uncovered\") "
            "to <b>proactive</b> management (\"prevent the problem before it exists\").",
            self.styles['Body'],
        ))

        self.story.append(Paragraph("6.1 Current Reality — Reactive Mode", self.styles['SubHeader']))
        reactive = [
            "A guard's PSIRA certificate expires — you find out during a client audit.",
            "A shift goes uncovered — the client calls to complain.",
            "The monthly budget is exceeded — you discover it when running payroll.",
            "An employee is burning out from overtime — they resign without notice.",
            "A contract is unprofitable — you realise it after 12 months.",
        ]
        for r in reactive:
            self.story.append(Paragraph(
                f"\u2718  {r}",
                ParagraphStyle(name='_rp', parent=self.styles['BodySmall'],
                               textColor=colors.HexColor('#dc2626')),
            ))
        self.story.append(Spacer(1, 0.08 * inch))

        self.story.append(Paragraph("6.2 RostraCore Reality — Proactive Mode", self.styles['SubHeader']))
        proactive = [
            ['Proactive Feature', 'How It Works', 'Business Impact'],
            ['Certification expiry alerts\n(30/60/90 days)',
             'Automated scanning of all\ncertification dates; email +\npush notifications',
             'Zero expired certs on duty;\nzero compliance violations'],
            ['Coverage gap detection',
             'Algorithm identifies unfilled\nshifts 7-14 days ahead;\nauto-suggests replacements',
             'Zero uncovered shifts;\nclient SLAs maintained'],
            ['Budget overrun warnings',
             'Real-time spend tracking\nagainst monthly budget;\nalerts at 80% threshold',
             'Variance < 3% vs 15-20%;\nprotects profit margins'],
            ['Overtime threshold alerts',
             'Tracks weekly hours per\nguard; alerts at 80% of\nBCEA maximum',
             'Prevents BCEA violations;\ncontrols overtime cost'],
            ['Employee burnout\nprevention',
             'Monitors consecutive days\nworked, rest periods, shift\ndistribution fairness',
             'Reduces turnover;\nimproves morale and\nperformance'],
            ['Contract renewal tracking',
             'Automated reminders 90/60/30\ndays before expiry;\nSLA performance summary',
             'Proactive renewals;\nno surprise losses'],
            ['Workforce demand\nforecasting',
             'Historical pattern analysis;\nseasonality detection;\ngrowth trajectory',
             'Hire ahead of demand;\nnever understaffed'],
        ]
        t = Table(proactive, colWidths=[1.6 * inch, 2.2 * inch, 2 * inch])
        t.setStyle(self._table_style(SUCCESS))
        self.story.append(t)

        self.story.append(Spacer(1, 0.12 * inch))
        self.story.append(Paragraph(
            "<b>The shift from reactive to proactive is not incremental — it is "
            "transformational.</b> Security companies using RostraCore report spending "
            "80% less time on firefighting and 80% more time on growth.",
            self.styles['Highlight'],
        ))
        self.story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # SECTION 8 — FUTURE VISION / ROADMAP
    # ══════════════════════════════════════════════════════════
    def _sec_future_vision(self):
        self.story.append(Paragraph(
            "7. Our Future Vision — The Roadmap", self.styles['SectionHeader'],
        ))
        self.story.append(Paragraph(
            "RostraCore is not a finished product — it is a <b>living platform</b> committed "
            "to continuous innovation. As we grow alongside our customers, we discover new "
            "pain points and develop new solutions. Our roadmap spans four phases, each "
            "building on the foundation of the previous one.",
            self.styles['Body'],
        ))

        # Phase 1
        self.story.append(Paragraph(
            "Phase 1: Current Platform (Delivered)", self.styles['SubHeader'],
        ))
        self.story.append(Paragraph(
            "90+ feature modules | Web dashboard + Mobile app | Full SA compliance | "
            "Real-time operations | Automated payroll & invoicing | Client portal",
            self.styles['Body'],
        ))
        self.story.append(Paragraph(
            "<b>Status:</b> Live and deployed. All features operational.",
            ParagraphStyle(name='_s1', parent=self.styles['BodySmall'],
                           textColor=colors.HexColor(SUCCESS)),
        ))

        # Phase 2
        self.story.append(Paragraph(
            "Phase 2: Hardware & IoT Integration (Next)", self.styles['SubHeader'],
        ))
        hw_items = [
            ['Hardware / IoT', 'Purpose', 'Impact'],
            ['Biometric terminals\n(fingerprint + facial)',
             'Site-based attendance capture;\neliminates buddy-punching',
             'Irrefutable proof of\npresence; billing accuracy'],
            ['IoT sensor integration',
             'Motion, door, temperature\nsensors at sites',
             'Automated incident\ndetection; proactive alerts'],
            ['RFID / NFC checkpoints',
             'Patrol verification tags\nat physical locations',
             'Verifiable patrol routes;\nSLA proof for clients'],
            ['Body camera integration',
             'Video evidence capture\nlinked to incidents',
             'Reduced liability;\nimproved incident resolution'],
            ['Vehicle GPS trackers',
             'Fleet tracking for\nresponse vehicles',
             'Optimal dispatch;\nreduced response times'],
        ]
        t = Table(hw_items, colWidths=[1.6 * inch, 2.2 * inch, 2 * inch])
        t.setStyle(self._table_style(ACCENT))
        self.story.append(t)
        self.story.append(Spacer(1, 0.1 * inch))

        # Phase 3
        self.story.append(Paragraph(
            "Phase 3: Advanced ML / AI (Future)", self.styles['SubHeader'],
        ))
        ml_items = [
            ['AI / ML Capability', 'Technical Approach', 'Business Value'],
            ['Predictive staffing',
             'Time-series models trained\non historical demand patterns',
             'Hire / scale before demand;\nnever understaffed'],
            ['Anomaly detection',
             'Statistical analysis of\nattendance patterns; outlier\ndetection',
             'Identify ghost employees,\ntime theft, unusual absences'],
            ['NLP incident reporting',
             'Natural language processing\nfor free-text incident\ndescriptions',
             'Faster reporting; automated\ncategorisation and routing'],
            ['Computer vision (CCTV)',
             'Object detection +\nactivity recognition on\nvideo feeds',
             'Automated threat detection;\nreduced false alarms'],
            ['Employee churn prediction',
             'Classification models on\nattendance, overtime,\nperformance data',
             'Intervene before guards\nresign; reduce hiring costs'],
            ['Intelligent shift\nrecommendations',
             'Collaborative filtering;\npreference learning',
             'Higher guard satisfaction;\nlower no-show rates'],
        ]
        t = Table(ml_items, colWidths=[1.6 * inch, 2.2 * inch, 2 * inch])
        t.setStyle(self._table_style(PRIMARY_DARK))
        self.story.append(t)
        self.story.append(Spacer(1, 0.1 * inch))

        # Phase 4
        self.story.append(Paragraph(
            "Phase 4: Industry Ecosystem (Vision)", self.styles['SubHeader'],
        ))
        eco_items = [
            "<b>PSIRA database integration</b> — real-time validation of registration status, eliminating manual checks.",
            "<b>Insurance provider data sharing</b> — automated risk profiles for premium reduction; incident data for claims.",
            "<b>Client self-service portal</b> — clients manage their own reporting, approvals, and satisfaction feedback.",
            "<b>Inter-company guard sharing marketplace</b> — when one company is short, another fills the gap; automated settlement.",
            "<b>Smart-contract SLA enforcement</b> — blockchain-based SLA tracking with automated penalty/bonus triggers.",
            "<b>Government tender integration</b> — automated compliance documentation for government security contracts.",
        ]
        for item in eco_items:
            self.story.append(Paragraph(f"\u2022  {item}", self.styles['BodySmall']))

        self.story.append(Spacer(1, 0.12 * inch))
        self.story.append(Paragraph(
            "<b>Our commitment:</b> Every feature we build solves a real pain point "
            "discovered through direct engagement with security companies. We do not build "
            "technology for technology's sake — we build solutions that make security "
            "operations measurably better.",
            self.styles['Highlight'],
        ))
        self.story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # SECTION 9 — PRICING & ROI
    # ══════════════════════════════════════════════════════════
    def _sec_pricing(self):
        self.story.append(Paragraph("8. Pricing & ROI", self.styles['SectionHeader']))

        self.story.append(Paragraph(
            "RostraCore uses simple, transparent per-guard pricing. No hidden fees. "
            "No per-module charges. No feature tiers. Every customer gets the full "
            "platform.",
            self.styles['Body'],
        ))

        pricing_data = [
            ['Component', 'Price', 'Notes'],
            ['Per-guard monthly fee', 'R29 / guard / month', 'Unlimited sites, all features'],
            ['Free trial', '14 days', 'No credit card required;\nfull platform access'],
            ['Implementation', 'Free (self-service)\nor R15,000 (assisted)', 'Guided setup, data migration,\ntraining included in assisted'],
            ['Support', 'Included', '24-hour response time;\nemail + in-app support'],
            ['Updates & new features', 'Included', 'Continuous deployment;\nno version upgrades needed'],
        ]
        t = Table(pricing_data, colWidths=[1.8 * inch, 1.6 * inch, 2.4 * inch])
        t.setStyle(self._table_style(PRIMARY))
        self.story.append(t)
        self.story.append(Spacer(1, 0.15 * inch))

        # ROI calculation
        self.story.append(Paragraph("8.1 ROI Calculator — 70 Guards", self.styles['SubHeader']))
        roi_data = [
            ['', 'Annual Amount'],
            ['RostraCore cost (70 x R29 x 12)', 'R24,360'],
            ['', ''],
            ['Savings: Roster time (500 hrs x R350/hr)', 'R175,000'],
            ['Savings: Budget overrun reduction', 'R180,000'],
            ['Savings: Payroll automation', 'R60,000'],
            ['Savings: Compliance violation avoidance', 'R45,000'],
            ['Savings: Client reporting automation', 'R120,000'],
            ['Savings: Overtime control', 'R70,000'],
            ['', ''],
            ['Total annual savings', 'R650,000'],
            ['Net benefit (savings - cost)', 'R625,640'],
            ['ROI', '2,568%'],
            ['Break-even', 'Month 1'],
        ]
        t = Table(roi_data, colWidths=[3.6 * inch, 2.2 * inch])
        ts = self._table_style(PRIMARY_DARK)
        ts.add('ALIGN', (1, 0), (1, -1), 'RIGHT')
        ts.add('BACKGROUND', (0, 10), (-1, -1), colors.HexColor(HIGHLIGHT_BG))
        ts.add('FONTNAME', (0, 10), (-1, -1), 'Helvetica-Bold')
        t.setStyle(ts)
        self.story.append(t)

        self.story.append(Spacer(1, 0.15 * inch))
        self.story.append(Paragraph(
            "8.2 Five-Year Projection", self.styles['SubHeader'],
        ))
        five_year = [
            ['Year', 'Cost', 'Savings', 'Net Benefit', 'Cumulative'],
            ['Year 1', 'R24,360', 'R650,000', 'R625,640', 'R625,640'],
            ['Year 2', 'R24,360', 'R680,000', 'R655,640', 'R1,281,280'],
            ['Year 3', 'R24,360', 'R710,000', 'R685,640', 'R1,966,920'],
            ['Year 4', 'R24,360', 'R740,000', 'R715,640', 'R2,682,560'],
            ['Year 5', 'R24,360', 'R775,000', 'R750,640', 'R3,433,200'],
        ]
        t = Table(five_year, colWidths=[0.9 * inch, 1.1 * inch, 1.1 * inch, 1.3 * inch, 1.4 * inch])
        ts = self._table_style(PRIMARY)
        ts.add('ALIGN', (1, 0), (-1, -1), 'RIGHT')
        ts.add('BACKGROUND', (0, -1), (-1, -1), colors.HexColor(HIGHLIGHT_BG))
        ts.add('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold')
        t.setStyle(ts)
        self.story.append(t)

        self.story.append(Spacer(1, 0.12 * inch))
        self.story.append(Paragraph(
            "<b>5-year total savings: R3.4 million</b> on an investment of R121,800. "
            "That is a <b>28:1 return</b>. Even if actual savings are half our "
            "conservative estimates, the ROI remains extraordinary.",
            self.styles['Highlight'],
        ))
        self.story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # SECTION 10 — TECHNOLOGY ARCHITECTURE
    # ══════════════════════════════════════════════════════════
    def _sec_technology(self):
        self.story.append(Paragraph(
            "9. Technology Architecture", self.styles['SectionHeader'],
        ))
        self.story.append(Paragraph(
            "RostraCore is built on a modern, scalable technology stack designed for "
            "reliability, security, and rapid feature development.",
            self.styles['Body'],
        ))

        tech_data = [
            ['Layer', 'Technology', 'Why'],
            ['Frontend (Web)',
             'Next.js 14 (React)\nTypeScript, Tailwind CSS',
             'Fast, responsive SPA;\nserver-side rendering for SEO;\ntype-safe codebase'],
            ['Frontend (Mobile)',
             'React Native (Expo)\niOS + Android',
             'Single codebase for both\nplatforms; GPS + biometric\naccess; offline-capable'],
            ['Backend API',
             'Python (FastAPI)\n91 RESTful endpoints',
             'Async I/O for high throughput;\nauto-generated OpenAPI docs;\ntype validation'],
            ['Database',
             'PostgreSQL\n69 data models\n(SQLAlchemy ORM)',
             'ACID compliance; complex\nquery support; proven at scale;\nfull-text search'],
            ['Hosting',
             'Railway (cloud PaaS)\nAuto-scaling; SA region',
             'Low-latency for SA users;\nautomatic deployments;\n99.9% uptime SLA'],
            ['Real-time',
             'WebSocket connections\nPush notifications',
             'Live updates; instant alerts;\nno polling overhead'],
            ['Security',
             'JWT auth; bcrypt hashing;\nRBAC; HTTPS everywhere;\nrate limiting',
             'Industry-standard security;\nrole-based access; POPIA\ncompliant data handling'],
        ]
        t = Table(tech_data, colWidths=[1.2 * inch, 1.8 * inch, 2.8 * inch])
        t.setStyle(self._table_style())
        self.story.append(t)

        self.story.append(Spacer(1, 0.12 * inch))
        self.story.append(Paragraph(
            "<b>Key architecture decisions:</b> (1) API-first design allows third-party "
            "integrations. (2) Multi-tenant architecture supports unlimited organisations. "
            "(3) Event-driven notifications ensure real-time responsiveness. "
            "(4) Modular service layer allows rapid feature addition without regression risk.",
            self.styles['Highlight'],
        ))
        self.story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # SECTION 11 — ABOUT US & CTA
    # ══════════════════════════════════════════════════════════
    def _sec_about_cta(self):
        self.story.append(Paragraph(
            "10. About Us & Getting Started", self.styles['SectionHeader'],
        ))

        self.story.append(Paragraph(
            "<b>Blaq Cooperation (Pty) Ltd</b> is a South African technology company "
            "focused on transforming workforce management in the security industry. We "
            "combine deep domain knowledge of South African labour law, security "
            "regulations, and operational challenges with modern software engineering "
            "to build solutions that make a measurable difference.",
            self.styles['Body'],
        ))

        self.story.append(Paragraph("Our Mission", self.styles['SubHeader']))
        self.story.append(Paragraph(
            "To optimise security workforce management through technology — reducing costs, "
            "eliminating compliance risk, and enabling security companies to focus on what "
            "matters: keeping people and property safe.",
            self.styles['Body'],
        ))

        self.story.append(Paragraph("Our Commitment", self.styles['SubHeader']))
        commitments = [
            "<b>Continuous innovation</b> — monthly feature releases driven by customer feedback.",
            "<b>SA-first design</b> — every regulation, every deduction type, every compliance requirement built in.",
            "<b>Accessible pricing</b> — R29/guard/month because we believe every security company deserves world-class tools.",
            "<b>Customer partnership</b> — we succeed only when our customers succeed; aligned incentives.",
            "<b>Data sovereignty</b> — your data stays in South Africa, protected by POPIA, owned by you.",
        ]
        for c in commitments:
            self.story.append(Paragraph(f"\u2022  {c}", self.styles['BodySmall']))

        self.story.append(Spacer(1, 0.15 * inch))
        self.story.append(Paragraph("Getting Started — Three Simple Steps", self.styles['SubHeader']))

        steps = [
            ['Step', 'Action', 'Duration'],
            ['1', 'Sign up for 14-day free trial at rostracore.com\nNo credit card required; full platform access', '5 minutes'],
            ['2', 'Import your employees and sites\n(or let our team assist with data migration)', '1-2 hours'],
            ['3', 'Generate your first optimised roster\nand experience the difference', '60 seconds'],
        ]
        t = Table(steps, colWidths=[0.6 * inch, 3.8 * inch, 1.2 * inch])
        ts = self._table_style(SUCCESS)
        ts.add('ALIGN', (0, 0), (0, -1), 'CENTER')
        ts.add('ALIGN', (2, 0), (2, -1), 'CENTER')
        t.setStyle(ts)
        self.story.append(t)

        self.story.append(Spacer(1, 0.2 * inch))

        # Contact box
        contact = [
            ['Contact Information', ''],
            ['Website', 'www.rostracore.com'],
            ['Email', 'info@rostracore.co.za'],
            ['Platform', 'app.rostracore.com'],
            ['Company', 'Blaq Cooperation (Pty) Ltd'],
            ['Location', 'South Africa'],
        ]
        t = Table(contact, colWidths=[1.5 * inch, 4.2 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(PRIMARY)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('SPAN', (0, 0), (1, 0)),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor(ROW_ALT)),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        self.story.append(t)

        self.story.append(Spacer(1, 0.3 * inch))

        # Final CTA
        self.story.append(Paragraph(
            "<b>Start your 14-day free trial today.</b><br/><br/>"
            "No credit card. No commitment. No risk.<br/>"
            "Just better workforce management.",
            ParagraphStyle(name='_cta', fontSize=14,
                           textColor=colors.HexColor(PRIMARY_DARK),
                           alignment=TA_CENTER, fontName='Helvetica-Bold',
                           spaceAfter=20, leading=20),
        ))

        self._hr()

        self.story.append(Paragraph(
            f"<i>This document is confidential and proprietary. "
            f"\u00a9 {datetime.now().year} Blaq Cooperation (Pty) Ltd. All rights reserved. "
            f"RostraCore is a registered trademark.</i>",
            self.styles['FooterStyle'],
        ))

    # ══════════════════════════════════════════════════════════
    # GENERATE
    # ══════════════════════════════════════════════════════════
    def generate(self):
        print("Generating RostraCore Value Proposition PDF...")

        self._sec_cover()
        self._sec_executive_summary()
        self._sec_problem_landscape()
        self._sec_platform()
        self._sec_before_after()
        self._sec_compliance()
        self._sec_predictive()
        self._sec_future_vision()
        self._sec_pricing()
        self._sec_technology()
        self._sec_about_cta()

        self.doc.build(self.story)
        size_kb = os.path.getsize(self.filename) / 1024
        print(f"PDF generated: {self.filename} ({size_kb:.1f} KB)")
        return self.filename


if __name__ == "__main__":
    out = ValuePropositionGenerator("RostraCore_Value_Proposition.pdf").generate()
    print(f"\nDone! -> {out}")
    print("\nSections:")
    print("  1. Cover Page")
    print("  2. Executive Summary")
    print("  3. Problem Landscape (Mathematical, Administrative, Management, Financial)")
    print("  4. The RostraCore Platform (90+ modules)")
    print("  5. How We Solve Each Pain Point (Before/After)")
    print("  6. SA Compliance Deep Dive (PSIRA, BCEA, POPIA, SARS)")
    print("  7. Predictive Intelligence (Reactive -> Proactive)")
    print("  8. Future Vision & Roadmap (Hardware, IoT, ML/AI, Ecosystem)")
    print("  9. Pricing & ROI (with 5-year projection)")
    print(" 10. Technology Architecture")
    print(" 11. About Us & Getting Started")
