"""Export endpoints for PDF reports and CSV/Excel downloads."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
from typing import Optional, List
import io
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from app.database import get_db
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.site import Site
from app.models.certification import Certification
from app.models.shift_assignment import ShiftAssignment
from app.auth.security import get_current_org_id

router = APIRouter(prefix="/exports", tags=["Exports"])


# ==================== PDF ROSTER REPORT ====================

@router.get("/roster/pdf")
async def export_roster_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    site_id: Optional[int] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Generate PDF report for roster with professional South African formatting (filtered by organization).

    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        site_id: Optional filter by site
        org_id: Organization ID (from current user)

    Returns:
        PDF file download
    """
    try:
        # Parse dates
        if start_date:
            start_dt = datetime.fromisoformat(start_date)
        else:
            start_dt = datetime.now()

        if end_date:
            end_dt = datetime.fromisoformat(end_date)
        else:
            end_dt = start_dt + timedelta(days=7)

        # Query shifts with eager-loaded relationships (SECURITY: Filter by org_id)
        query = db.query(Shift).options(
            joinedload(Shift.site),
            joinedload(Shift.shift_assignments).joinedload(ShiftAssignment.employee)
        ).filter(
            Shift.org_id == org_id,  # SECURITY FIX: Only show shifts from user's organization
            Shift.start_time >= start_dt,
            Shift.start_time <= end_dt
        )

        if site_id:
            query = query.filter(Shift.site_id == site_id)

        shifts = query.order_by(Shift.start_time).all()

        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
        elements = []

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1E3A8A'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1E3A8A'),
            spaceAfter=12,
            fontName='Helvetica-Bold'
        )

        # Title
        elements.append(Paragraph("RostraCore Roster Report", title_style))
        elements.append(Paragraph(
            f"Period: {start_dt.strftime('%d %B %Y')} - {end_dt.strftime('%d %B %Y')}",
            heading_style
        ))
        elements.append(Spacer(1, 0.3*inch))

        # Calculate summary statistics
        total_shifts = len(shifts)
        # Count shifts that have at least one active assignment
        assigned_shifts = len([s for s in shifts if any(
            a.status in ['pending', 'confirmed', 'completed'] for a in s.shift_assignments
        )])
        total_cost = 0
        total_hours = 0

        for shift in shifts:
            # Get active assignments for this shift
            active_assignments = [a for a in shift.shift_assignments if a.status in ['pending', 'confirmed', 'completed']]
            for assignment in active_assignments:
                if assignment.employee:
                    duration = (shift.end_time - shift.start_time).total_seconds() / 3600
                    cost = duration * assignment.employee.hourly_rate
                    total_cost += cost
                    total_hours += duration

        # Summary Table
        summary_data = [
            ['Metric', 'Value'],
            ['Total Shifts', str(total_shifts)],
            ['Assigned Shifts', str(assigned_shifts)],
            ['Unassigned Shifts', str(total_shifts - assigned_shifts)],
            ['Fill Rate', f"{round(assigned_shifts/total_shifts*100, 1) if total_shifts > 0 else 0}%"],
            ['Total Hours', f"{round(total_hours, 1)} hrs"],
            ['Total Cost', f"R {total_cost:,.2f}"],
            ['Average Cost/Shift', f"R {total_cost/assigned_shifts:,.2f}" if assigned_shifts > 0 else "R 0.00"]
        ]

        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F3F4F6')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D1D5DB')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')])
        ]))

        elements.append(summary_table)
        elements.append(Spacer(1, 0.4*inch))

        # Shifts Detail Table
        elements.append(Paragraph("Shift Details", heading_style))
        elements.append(Spacer(1, 0.2*inch))

        if shifts:
            shift_data = [['ID', 'Site', 'Start', 'End', 'Employee(s)', 'Hours', 'Cost (ZAR)']]

            for shift in shifts:
                site_name = shift.site.client_name if shift.site else "N/A"
                start_time = shift.start_time.strftime('%d/%m %H:%M')
                end_time = shift.end_time.strftime('%d/%m %H:%M')
                duration = (shift.end_time - shift.start_time).total_seconds() / 3600

                # Get active assignments for this shift (including pending)
                active_assignments = [a for a in shift.shift_assignments if a.status in ['pending', 'confirmed', 'completed']]

                if active_assignments:
                    # Show each assignment as a row
                    for assignment in active_assignments:
                        employee = assignment.employee
                        employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"
                        cost = duration * employee.hourly_rate if employee else 0

                        shift_data.append([
                            str(shift.shift_id),
                            site_name[:20],
                            start_time,
                            end_time,
                            employee_name[:25],
                            f"{duration:.1f}",
                            f"R {cost:,.2f}"
                        ])
                else:
                    # Unassigned shift
                    shift_data.append([
                        str(shift.shift_id),
                        site_name[:20],
                        start_time,
                        end_time,
                        "Unassigned",
                        f"{duration:.1f}",
                        "R 0.00"
                    ])

            shift_table = Table(shift_data, colWidths=[0.6*inch, 1.8*inch, 1.1*inch, 1.1*inch, 1.8*inch, 0.8*inch, 1.2*inch])
            shift_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (5, 1), (6, -1), 'RIGHT'),  # Right align hours and cost
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#D1D5DB')),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')])
            ]))

            elements.append(shift_table)
        else:
            elements.append(Paragraph("No shifts found for this period.", styles['Normal']))

        # Footer
        elements.append(Spacer(1, 0.5*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#6B7280'),
            alignment=TA_CENTER
        )
        elements.append(Paragraph(
            f"Generated by RostraCore on {datetime.now().strftime('%d %B %Y at %H:%M')} | South African Rand (ZAR)",
            footer_style
        ))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=roster_{start_dt.strftime('%Y%m%d')}_{end_dt.strftime('%Y%m%d')}.pdf"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


# ==================== CSV/EXCEL EXPORTS ====================

@router.get("/employees/csv")
async def export_employees_csv(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Export all employees to CSV (filtered by organization)."""
    try:
        employees = db.query(Employee).filter(Employee.org_id == org_id).all()

        data = []
        for emp in employees:
            data.append({
                'ID': emp.employee_id,
                'First Name': emp.first_name,
                'Last Name': emp.last_name,
                'ID Number': emp.id_number,
                'Email': emp.email or '',
                'Phone': emp.phone or '',
                'Role': emp.role.value if emp.role else '',
                'PSIRA Number': emp.psira_number or '',
                'PSIRA Grade': emp.psira_grade or '',
                'Hourly Rate (ZAR)': emp.hourly_rate,
                'Max Hours/Week': emp.max_hours_week or 48,
                'Status': emp.status.value if emp.status else '',
                'Address': emp.address or '',
                'Emergency Contact': emp.emergency_contact_name or '',
                'Emergency Phone': emp.emergency_contact_phone or ''
            })

        df = pd.DataFrame(data)
        buffer = io.BytesIO()
        df.to_csv(buffer, index=False)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=employees_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting employees: {str(e)}")


@router.get("/employees/excel")
async def export_employees_excel(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Export all employees to Excel (filtered by organization)."""
    try:
        employees = db.query(Employee).filter(Employee.org_id == org_id).all()

        data = []
        for emp in employees:
            data.append({
                'ID': emp.employee_id,
                'First Name': emp.first_name,
                'Last Name': emp.last_name,
                'ID Number': emp.id_number,
                'Email': emp.email or '',
                'Phone': emp.phone or '',
                'Role': emp.role.value if emp.role else '',
                'PSIRA Number': emp.psira_number or '',
                'PSIRA Grade': emp.psira_grade or '',
                'Hourly Rate (ZAR)': emp.hourly_rate,
                'Max Hours/Week': emp.max_hours_week or 48,
                'Status': emp.status.value if emp.status else '',
                'Address': emp.address or '',
                'Emergency Contact': emp.emergency_contact_name or '',
                'Emergency Phone': emp.emergency_contact_phone or ''
            })

        df = pd.DataFrame(data)
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Employees')
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=employees_{datetime.now().strftime('%Y%m%d')}.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting employees: {str(e)}")


@router.get("/sites/csv")
async def export_sites_csv(db: Session = Depends(get_db)):
    """Export all sites to CSV."""
    try:
        sites = db.query(Site).all()

        data = []
        for site in sites:
            data.append({
                'ID': site.site_id,
                'Client Name': site.client_name,
                'Address': site.address,
                'Contact Person': site.contact_person or '',
                'Contact Phone': site.contact_phone or '',
                'Min Staff': site.min_staff,
                'Required Skill': site.required_skill or '',
                'Shift Pattern': site.shift_pattern or '',
                'Active': site.is_active
            })

        df = pd.DataFrame(data)
        buffer = io.BytesIO()
        df.to_csv(buffer, index=False)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=sites_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting sites: {str(e)}")


@router.get("/sites/excel")
async def export_sites_excel(db: Session = Depends(get_db)):
    """Export all sites to Excel."""
    try:
        sites = db.query(Site).all()

        data = []
        for site in sites:
            data.append({
                'ID': site.site_id,
                'Client Name': site.client_name,
                'Address': site.address,
                'Contact Person': site.contact_person or '',
                'Contact Phone': site.contact_phone or '',
                'Min Staff': site.min_staff,
                'Required Skill': site.required_skill or '',
                'Shift Pattern': site.shift_pattern or '',
                'Active': site.is_active
            })

        df = pd.DataFrame(data)
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Sites')
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=sites_{datetime.now().strftime('%Y%m%d')}.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting sites: {str(e)}")


@router.get("/shifts/csv")
async def export_shifts_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Export shifts to CSV."""
    try:
        query = db.query(Shift)

        if start_date:
            query = query.filter(Shift.start_time >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Shift.start_time <= datetime.fromisoformat(end_date))

        shifts = query.order_by(Shift.start_time).all()

        data = []
        for shift in shifts:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            cost = duration * shift.employee.hourly_rate if shift.employee else 0

            data.append({
                'Shift ID': shift.shift_id,
                'Site': shift.site.client_name if shift.site else '',
                'Start Time': shift.start_time.strftime('%Y-%m-%d %H:%M:%S'),
                'End Time': shift.end_time.strftime('%Y-%m-%d %H:%M:%S'),
                'Employee': f"{shift.employee.first_name} {shift.employee.last_name}" if shift.employee else 'Unassigned',
                'Status': shift.status.value,
                'Required Skill': shift.required_skill or '',
                'Hours': round(duration, 2),
                'Cost (ZAR)': round(cost, 2)
            })

        df = pd.DataFrame(data)
        buffer = io.BytesIO()
        df.to_csv(buffer, index=False)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=shifts_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting shifts: {str(e)}")


@router.get("/shifts/excel")
async def export_shifts_excel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Export shifts to Excel."""
    try:
        query = db.query(Shift)

        if start_date:
            query = query.filter(Shift.start_time >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Shift.start_time <= datetime.fromisoformat(end_date))

        shifts = query.order_by(Shift.start_time).all()

        data = []
        for shift in shifts:
            duration = (shift.end_time - shift.start_time).total_seconds() / 3600
            cost = duration * shift.employee.hourly_rate if shift.employee else 0

            data.append({
                'Shift ID': shift.shift_id,
                'Site': shift.site.client_name if shift.site else '',
                'Start Time': shift.start_time.strftime('%Y-%m-%d %H:%M:%S'),
                'End Time': shift.end_time.strftime('%Y-%m-%d %H:%M:%S'),
                'Employee': f"{shift.employee.first_name} {shift.employee.last_name}" if shift.employee else 'Unassigned',
                'Status': shift.status.value,
                'Required Skill': shift.required_skill or '',
                'Hours': round(duration, 2),
                'Cost (ZAR)': round(cost, 2)
            })

        df = pd.DataFrame(data)
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Shifts')
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=shifts_{datetime.now().strftime('%Y%m%d')}.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting shifts: {str(e)}")


@router.get("/certifications/csv")
async def export_certifications_csv(db: Session = Depends(get_db)):
    """Export all certifications to CSV."""
    try:
        certs = db.query(Certification).all()

        data = []
        for cert in certs:
            days_until_expiry = (cert.expiry_date - datetime.now().date()).days
            status = "Expired" if days_until_expiry < 0 else ("Expiring Soon" if days_until_expiry <= 30 else "Valid")

            data.append({
                'ID': cert.cert_id,
                'Employee': f"{cert.employee.first_name} {cert.employee.last_name}" if cert.employee else '',
                'Certification Type': cert.cert_type,
                'Certificate Number': cert.cert_number or '',
                'Issuing Authority': cert.issuing_authority or '',
                'Issue Date': cert.issue_date.strftime('%Y-%m-%d'),
                'Expiry Date': cert.expiry_date.strftime('%Y-%m-%d'),
                'Days Until Expiry': days_until_expiry,
                'Status': status,
                'Verified': cert.verified
            })

        df = pd.DataFrame(data)
        buffer = io.BytesIO()
        df.to_csv(buffer, index=False)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=certifications_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting certifications: {str(e)}")


@router.get("/certifications/excel")
async def export_certifications_excel(db: Session = Depends(get_db)):
    """Export all certifications to Excel."""
    try:
        certs = db.query(Certification).all()

        data = []
        for cert in certs:
            days_until_expiry = (cert.expiry_date - datetime.now().date()).days
            status = "Expired" if days_until_expiry < 0 else ("Expiring Soon" if days_until_expiry <= 30 else "Valid")

            data.append({
                'ID': cert.cert_id,
                'Employee': f"{cert.employee.first_name} {cert.employee.last_name}" if cert.employee else '',
                'Certification Type': cert.cert_type,
                'Certificate Number': cert.cert_number or '',
                'Issuing Authority': cert.issuing_authority or '',
                'Issue Date': cert.issue_date.strftime('%Y-%m-%d'),
                'Expiry Date': cert.expiry_date.strftime('%Y-%m-%d'),
                'Days Until Expiry': days_until_expiry,
                'Status': status,
                'Verified': cert.verified
            })

        df = pd.DataFrame(data)
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Certifications')
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=certifications_{datetime.now().strftime('%Y%m%d')}.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting certifications: {str(e)}")


# ==================== ROSTER EXCEL EXPORT ====================

@router.get("/roster/excel")
async def export_roster_excel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    site_id: Optional[int] = None,
    client_id: Optional[int] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Export roster to comprehensive Excel workbook with multiple sheets.

    Includes:
    - Summary sheet with stats
    - Calendar view by site
    - Employee schedule view
    - Cost breakdown

    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        site_id: Optional filter by site
        client_id: Optional filter by client
        org_id: Organization ID (from current user)

    Returns:
        Excel file download
    """
    from app.models.client import Client
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils.dataframe import dataframe_to_rows

    try:
        # Parse dates
        if start_date:
            start_dt = datetime.fromisoformat(start_date)
        else:
            start_dt = datetime.now()

        if end_date:
            end_dt = datetime.fromisoformat(end_date)
        else:
            end_dt = start_dt + timedelta(days=7)

        # Query shifts with relationships (filtered by org_id)
        query = db.query(Shift).options(
            joinedload(Shift.site),
            joinedload(Shift.shift_assignments).joinedload(ShiftAssignment.employee)
        ).filter(
            Shift.org_id == org_id,
            Shift.start_time >= start_dt,
            Shift.start_time <= end_dt
        )

        if site_id:
            query = query.filter(Shift.site_id == site_id)

        if client_id:
            # Filter by client through site
            client_sites = db.query(Site.site_id).filter(Site.client_id == client_id).all()
            site_ids = [s.site_id for s in client_sites]
            if site_ids:
                query = query.filter(Shift.site_id.in_(site_ids))

        shifts = query.order_by(Shift.start_time).all()

        # Create Excel workbook
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:

            # ========== Summary Sheet ==========
            total_shifts = len(shifts)
            assigned_shifts = len([s for s in shifts if any(
                a.status in ['pending', 'confirmed', 'completed'] for a in s.shift_assignments
            )])
            total_cost = 0
            total_hours = 0

            for shift in shifts:
                active_assignments = [a for a in shift.shift_assignments if a.status in ['pending', 'confirmed', 'completed']]
                for assignment in active_assignments:
                    if assignment.employee:
                        duration = (shift.end_time - shift.start_time).total_seconds() / 3600
                        cost = duration * assignment.employee.hourly_rate
                        total_cost += cost
                        total_hours += duration

            summary_data = {
                'Metric': [
                    'Report Period',
                    'Total Shifts',
                    'Assigned Shifts',
                    'Unassigned Shifts',
                    'Fill Rate',
                    'Total Hours',
                    'Total Cost (ZAR)',
                    'Average Cost/Shift (ZAR)',
                    'Generated On'
                ],
                'Value': [
                    f"{start_dt.strftime('%Y-%m-%d')} to {end_dt.strftime('%Y-%m-%d')}",
                    total_shifts,
                    assigned_shifts,
                    total_shifts - assigned_shifts,
                    f"{round(assigned_shifts/total_shifts*100, 1) if total_shifts > 0 else 0}%",
                    f"{round(total_hours, 1)} hours",
                    f"R {total_cost:,.2f}",
                    f"R {total_cost/assigned_shifts:,.2f}" if assigned_shifts > 0 else "R 0.00",
                    datetime.now().strftime('%Y-%m-%d %H:%M')
                ]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, index=False, sheet_name='Summary')

            # ========== Shift Details Sheet ==========
            shift_data = []
            for shift in shifts:
                site_name = shift.site.client_name if shift.site else "N/A"
                site_address = shift.site.address if shift.site else ""
                client_name = shift.site.client.client_name if shift.site and hasattr(shift.site, 'client') and shift.site.client else "N/A"
                duration = (shift.end_time - shift.start_time).total_seconds() / 3600

                active_assignments = [a for a in shift.shift_assignments if a.status in ['pending', 'confirmed', 'completed']]

                if active_assignments:
                    for assignment in active_assignments:
                        employee = assignment.employee
                        employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"
                        cost = duration * employee.hourly_rate if employee else 0

                        shift_data.append({
                            'Shift ID': shift.shift_id,
                            'Date': shift.start_time.strftime('%Y-%m-%d'),
                            'Day': shift.start_time.strftime('%A'),
                            'Start Time': shift.start_time.strftime('%H:%M'),
                            'End Time': shift.end_time.strftime('%H:%M'),
                            'Hours': round(duration, 1),
                            'Client': client_name,
                            'Site': site_name,
                            'Site Address': site_address,
                            'Employee ID': employee.employee_id if employee else None,
                            'Employee Name': employee_name,
                            'PSIRA Grade': employee.psira_grade if employee else "",
                            'Hourly Rate': employee.hourly_rate if employee else 0,
                            'Shift Cost (ZAR)': round(cost, 2),
                            'Assignment Status': assignment.status,
                            'Shift Status': shift.status.value if shift.status else 'planned'
                        })
                else:
                    shift_data.append({
                        'Shift ID': shift.shift_id,
                        'Date': shift.start_time.strftime('%Y-%m-%d'),
                        'Day': shift.start_time.strftime('%A'),
                        'Start Time': shift.start_time.strftime('%H:%M'),
                        'End Time': shift.end_time.strftime('%H:%M'),
                        'Hours': round(duration, 1),
                        'Client': client_name,
                        'Site': site_name,
                        'Site Address': site_address,
                        'Employee ID': None,
                        'Employee Name': 'UNASSIGNED',
                        'PSIRA Grade': shift.required_skill or '',
                        'Hourly Rate': 0,
                        'Shift Cost (ZAR)': 0,
                        'Assignment Status': 'unassigned',
                        'Shift Status': shift.status.value if shift.status else 'planned'
                    })

            if shift_data:
                shifts_df = pd.DataFrame(shift_data)
                shifts_df.to_excel(writer, index=False, sheet_name='Shift Details')

            # ========== By Site Sheet ==========
            site_summary = {}
            for shift in shifts:
                site_name = shift.site.client_name if shift.site else "Unknown"
                if site_name not in site_summary:
                    site_summary[site_name] = {
                        'Site': site_name,
                        'Total Shifts': 0,
                        'Assigned': 0,
                        'Unassigned': 0,
                        'Total Hours': 0,
                        'Total Cost (ZAR)': 0
                    }

                site_summary[site_name]['Total Shifts'] += 1
                duration = (shift.end_time - shift.start_time).total_seconds() / 3600

                active_assignments = [a for a in shift.shift_assignments if a.status in ['pending', 'confirmed', 'completed']]
                if active_assignments:
                    site_summary[site_name]['Assigned'] += 1
                    for assignment in active_assignments:
                        if assignment.employee:
                            cost = duration * assignment.employee.hourly_rate
                            site_summary[site_name]['Total Hours'] += duration
                            site_summary[site_name]['Total Cost (ZAR)'] += cost
                else:
                    site_summary[site_name]['Unassigned'] += 1

            if site_summary:
                site_df = pd.DataFrame(list(site_summary.values()))
                site_df['Fill Rate'] = site_df.apply(
                    lambda x: f"{round(x['Assigned']/x['Total Shifts']*100, 1)}%" if x['Total Shifts'] > 0 else "0%",
                    axis=1
                )
                site_df['Total Cost (ZAR)'] = site_df['Total Cost (ZAR)'].apply(lambda x: round(x, 2))
                site_df['Total Hours'] = site_df['Total Hours'].apply(lambda x: round(x, 1))
                site_df.to_excel(writer, index=False, sheet_name='By Site')

            # ========== Employee Schedule Sheet ==========
            employee_schedules = {}
            for shift in shifts:
                active_assignments = [a for a in shift.shift_assignments if a.status in ['pending', 'confirmed', 'completed']]
                for assignment in active_assignments:
                    if assignment.employee:
                        emp = assignment.employee
                        emp_key = f"{emp.first_name} {emp.last_name}"
                        if emp_key not in employee_schedules:
                            employee_schedules[emp_key] = {
                                'Employee': emp_key,
                                'Employee ID': emp.employee_id,
                                'Total Shifts': 0,
                                'Total Hours': 0,
                                'Total Earnings (ZAR)': 0,
                                'Sites Worked': set()
                            }

                        duration = (shift.end_time - shift.start_time).total_seconds() / 3600
                        cost = duration * emp.hourly_rate

                        employee_schedules[emp_key]['Total Shifts'] += 1
                        employee_schedules[emp_key]['Total Hours'] += duration
                        employee_schedules[emp_key]['Total Earnings (ZAR)'] += cost
                        if shift.site:
                            employee_schedules[emp_key]['Sites Worked'].add(shift.site.client_name)

            if employee_schedules:
                for key in employee_schedules:
                    employee_schedules[key]['Sites Worked'] = ', '.join(employee_schedules[key]['Sites Worked'])
                    employee_schedules[key]['Total Hours'] = round(employee_schedules[key]['Total Hours'], 1)
                    employee_schedules[key]['Total Earnings (ZAR)'] = round(employee_schedules[key]['Total Earnings (ZAR)'], 2)

                emp_df = pd.DataFrame(list(employee_schedules.values()))
                emp_df.to_excel(writer, index=False, sheet_name='Employee Schedules')

        buffer.seek(0)

        filename = f"roster_{start_dt.strftime('%Y%m%d')}_{end_dt.strftime('%Y%m%d')}.xlsx"

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting roster: {str(e)}")


# ==================== SAVED ROSTER EXPORT ====================

@router.get("/saved-roster/{roster_id}/pdf")
async def export_saved_roster_pdf(
    roster_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Export a saved roster to PDF.

    Args:
        roster_id: Saved roster ID
        org_id: Organization ID (from current user)

    Returns:
        PDF file download
    """
    from app.models.roster import Roster

    try:
        # Get saved roster
        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()

        if not roster:
            raise HTTPException(status_code=404, detail=f"Roster {roster_id} not found")

        # Redirect to standard roster PDF endpoint with date range
        start_date = roster.start_date.strftime('%Y-%m-%d')
        end_date = roster.end_date.strftime('%Y-%m-%d')

        return await export_roster_pdf(
            start_date=start_date,
            end_date=end_date,
            site_id=None,
            org_id=org_id,
            db=db
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting roster PDF: {str(e)}")


@router.get("/saved-roster/{roster_id}/excel")
async def export_saved_roster_excel(
    roster_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Export a saved roster to Excel.

    Args:
        roster_id: Saved roster ID
        org_id: Organization ID (from current user)

    Returns:
        Excel file download
    """
    from app.models.roster import Roster

    try:
        # Get saved roster
        roster = db.query(Roster).filter(
            Roster.roster_id == roster_id,
            Roster.org_id == org_id
        ).first()

        if not roster:
            raise HTTPException(status_code=404, detail=f"Roster {roster_id} not found")

        # Use standard roster Excel export with date range and optional client filter
        start_date = roster.start_date.strftime('%Y-%m-%d')
        end_date = roster.end_date.strftime('%Y-%m-%d')

        return await export_roster_excel(
            start_date=start_date,
            end_date=end_date,
            site_id=None,
            client_id=roster.client_id,
            org_id=org_id,
            db=db
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting roster Excel: {str(e)}")


# ==================== PAYROLL SYSTEM EXPORT (SAGE / PASTEL / VIP) ====================

# Column schemas per payroll system
_PAYROLL_FORMATS = {
    "sage300": [
        "Employee Number", "Employee Name", "ID Number", "Period Start", "Period End",
        "Regular Hours", "Overtime Hours", "Total Hours",
        "Gross Pay", "PAYE", "UIF (Employee)", "UIF (Employer)", "SDL",
        "Total Deductions", "Net Pay",
    ],
    "pastel": [
        "EmpNo", "EmpName", "ID Number", "Period", "Description",
        "Reg Hours", "OT Hours",
        "Gross Amount", "PAYE", "UIF Emp", "UIF Empl", "SDL", "Net Amount",
    ],
    "vip": [
        "Pay Number", "Surname", "First Name", "ID Number", "Period",
        "Ordinary Hours", "Overtime Hours",
        "Gross Earnings", "PAYE Tax", "UIF Employee", "UIF Employer", "SDL Levy",
        "Total Deductions", "Net Pay",
    ],
}


@router.get("/payroll/csv")
async def export_payroll_csv(
    period_start: str,
    period_end: str,
    format: str = "sage300",
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Export payroll data as a CSV file formatted for a specific SA payroll system.

    Supported formats: sage300, pastel, vip

    Columns match the import templates for each system. Uses PayrollSummary records
    when available, falling back to shift-assignment cost totals for the period.
    """
    from app.models.payroll import PayrollSummary
    from datetime import date as date_type
    from sqlalchemy import and_

    if format not in _PAYROLL_FORMATS:
        raise HTTPException(status_code=400, detail=f"Unknown format '{format}'. Choose: {list(_PAYROLL_FORMATS.keys())}")

    try:
        start = datetime.fromisoformat(period_start).date()
        end = datetime.fromisoformat(period_end).date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Load payroll summaries for the period
    summaries = (
        db.query(PayrollSummary)
        .join(Employee, PayrollSummary.employee_id == Employee.employee_id)
        .filter(
            Employee.org_id == org_id,
            PayrollSummary.period_start >= start,
            PayrollSummary.period_end <= end,
        )
        .all()
    )

    # Build rows keyed by employee; aggregate if multiple records per employee
    from collections import defaultdict
    agg: dict = defaultdict(lambda: {
        "regular_hours": 0.0, "overtime_hours": 0.0,
        "gross_pay": 0.0, "expenses_total": 0.0, "net_pay": 0.0,
    })
    emp_map: dict = {}

    for s in summaries:
        eid = s.employee_id
        agg[eid]["regular_hours"] += s.total_hours - s.overtime_hours
        agg[eid]["overtime_hours"] += s.overtime_hours
        agg[eid]["gross_pay"] += s.gross_pay
        agg[eid]["expenses_total"] += s.expenses_total
        agg[eid]["net_pay"] += s.net_pay
        if eid not in emp_map:
            emp_map[eid] = s.employee

    # Estimate statutory deductions (if not stored on PayrollSummary use SARS rules)
    def _calc_deductions(gross: float):
        """Simplified SA statutory deductions for export."""
        uif_rate = 0.01  # 1% each side, capped at R177.12/month
        uif_emp = min(gross * uif_rate, 177.12)
        uif_empl = min(gross * uif_rate, 177.12)
        # Simplified PAYE (flat 18% below R237,100 annual threshold)
        annual = gross * 12
        paye_monthly = max(0, (annual - 95_750) * 0.18 / 12) if annual > 95_750 else 0
        # SDL 1% of gross (employer levy)
        sdl = gross * 0.01
        total_deductions = uif_emp + paye_monthly
        return round(paye_monthly, 2), round(uif_emp, 2), round(uif_empl, 2), round(sdl, 2), round(total_deductions, 2)

    period_label = f"{start.isoformat()} to {end.isoformat()}"
    rows = []

    for eid, totals in agg.items():
        emp = emp_map.get(eid)
        if not emp:
            continue

        gross = totals["gross_pay"]
        net = totals["net_pay"]
        reg = round(totals["regular_hours"], 2)
        ot = round(totals["overtime_hours"], 2)
        paye, uif_emp, uif_empl, sdl, total_ded = _calc_deductions(gross)

        emp_number = str(emp.employee_id).zfill(5)
        full_name = f"{emp.first_name} {emp.last_name}"
        id_num = emp.id_number or ""

        if format == "sage300":
            rows.append({
                "Employee Number": emp_number,
                "Employee Name": full_name,
                "ID Number": id_num,
                "Period Start": start.isoformat(),
                "Period End": end.isoformat(),
                "Regular Hours": reg,
                "Overtime Hours": ot,
                "Total Hours": round(reg + ot, 2),
                "Gross Pay": round(gross, 2),
                "PAYE": paye,
                "UIF (Employee)": uif_emp,
                "UIF (Employer)": uif_empl,
                "SDL": sdl,
                "Total Deductions": total_ded,
                "Net Pay": round(net, 2),
            })
        elif format == "pastel":
            rows.append({
                "EmpNo": emp_number,
                "EmpName": full_name,
                "ID Number": id_num,
                "Period": period_label,
                "Description": "Monthly Payroll",
                "Reg Hours": reg,
                "OT Hours": ot,
                "Gross Amount": round(gross, 2),
                "PAYE": paye,
                "UIF Emp": uif_emp,
                "UIF Empl": uif_empl,
                "SDL": sdl,
                "Net Amount": round(net, 2),
            })
        elif format == "vip":
            rows.append({
                "Pay Number": emp_number,
                "Surname": emp.last_name,
                "First Name": emp.first_name,
                "ID Number": id_num,
                "Period": period_label,
                "Ordinary Hours": reg,
                "Overtime Hours": ot,
                "Gross Earnings": round(gross, 2),
                "PAYE Tax": paye,
                "UIF Employee": uif_emp,
                "UIF Employer": uif_empl,
                "SDL Levy": sdl,
                "Total Deductions": total_ded,
                "Net Pay": round(net, 2),
            })

    columns = _PAYROLL_FORMATS[format]
    df = pd.DataFrame(rows, columns=columns) if rows else pd.DataFrame(columns=columns)

    buffer = io.BytesIO()
    df.to_csv(buffer, index=False)
    buffer.seek(0)

    filename = f"payroll_{format}_{start.isoformat()}_to_{end.isoformat()}.csv"
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
