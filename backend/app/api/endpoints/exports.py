"""Export endpoints for PDF reports and CSV/Excel downloads."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
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

router = APIRouter(prefix="/exports", tags=["Exports"])


# ==================== PDF ROSTER REPORT ====================

@router.get("/roster/pdf")
async def export_roster_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    site_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Generate PDF report for roster with professional South African formatting.

    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        site_id: Optional filter by site

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

        # Query shifts
        query = db.query(Shift).filter(
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
        assigned_shifts = len([s for s in shifts if s.assigned_employee_id])
        total_cost = 0
        total_hours = 0

        for shift in shifts:
            if shift.employee:
                duration = (shift.end_time - shift.start_time).total_seconds() / 3600
                cost = duration * shift.employee.hourly_rate
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
            shift_data = [['ID', 'Site', 'Start', 'End', 'Employee', 'Hours', 'Cost (ZAR)']]

            for shift in shifts:
                site_name = shift.site.client_name if shift.site else "N/A"
                employee_name = f"{shift.employee.first_name} {shift.employee.last_name}" if shift.employee else "Unassigned"
                start_time = shift.start_time.strftime('%d/%m %H:%M')
                end_time = shift.end_time.strftime('%d/%m %H:%M')

                duration = (shift.end_time - shift.start_time).total_seconds() / 3600
                cost = duration * shift.employee.hourly_rate if shift.employee else 0

                shift_data.append([
                    str(shift.shift_id),
                    site_name[:20],  # Truncate long names
                    start_time,
                    end_time,
                    employee_name[:25],
                    f"{duration:.1f}",
                    f"R {cost:,.2f}"
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
async def export_employees_csv(db: Session = Depends(get_db)):
    """Export all employees to CSV."""
    try:
        employees = db.query(Employee).all()

        data = []
        for emp in employees:
            data.append({
                'ID': emp.employee_id,
                'First Name': emp.first_name,
                'Last Name': emp.last_name,
                'ID Number': emp.id_number,
                'Email': emp.email,
                'Phone': emp.phone,
                'Role': emp.role.value,
                'Hourly Rate (ZAR)': emp.hourly_rate,
                'Status': emp.status.value,
                'Skills': emp.skills or '',
                'Created': emp.created_at.strftime('%Y-%m-%d %H:%M:%S') if emp.created_at else ''
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
async def export_employees_excel(db: Session = Depends(get_db)):
    """Export all employees to Excel."""
    try:
        employees = db.query(Employee).all()

        data = []
        for emp in employees:
            data.append({
                'ID': emp.employee_id,
                'First Name': emp.first_name,
                'Last Name': emp.last_name,
                'ID Number': emp.id_number,
                'Email': emp.email,
                'Phone': emp.phone,
                'Role': emp.role.value,
                'Hourly Rate (ZAR)': emp.hourly_rate,
                'Status': emp.status.value,
                'Skills': emp.skills or '',
                'Created': emp.created_at.strftime('%Y-%m-%d %H:%M:%S') if emp.created_at else ''
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
