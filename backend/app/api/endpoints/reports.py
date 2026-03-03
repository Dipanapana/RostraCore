"""Financial and operational reporting endpoints - Payroll, billing, and profitability reports."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, case
from datetime import date, datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import io

from app.database import get_db
from app.models.client_invoice import ClientInvoice
from app.models.payroll import PayrollSummary
from app.models.shift_assignment import ShiftAssignment
from app.models.shift import Shift
from app.models.employee import Employee
from app.models.site import Site
from app.models.client import Client
from app.models.organization import Organization
from app.models.user import User
from app.auth.security import get_current_org_id, require_finance_access
from app.services.report_generator import (
    generate_report_pdf,
    build_company_details_from_org,
)

router = APIRouter()


class ProfitabilityReport(BaseModel):
    """Profitability report comparing revenue vs costs."""
    period_start: date
    period_end: date
    total_revenue: float  # Client billing
    total_costs: float    # Guard payroll
    gross_profit: float
    profit_margin: float  # Percentage


class SitePerformanceReport(BaseModel):
    """Performance metrics per site."""
    site_id: int
    site_name: str
    client_name: str
    shifts_count: int
    hours_worked: float
    revenue: float       # Billed to client
    cost: float          # Paid to guards
    profit: float
    margin: float


class EmployeePayrollSummary(BaseModel):
    """Employee payroll summary."""
    employee_id: int
    employee_name: str
    total_hours: float
    regular_hours: float
    overtime_hours: float
    gross_pay: float
    shifts_worked: int


@router.get("/profitability", response_model=ProfitabilityReport)
async def get_profitability_report(
    period_start: date,
    period_end: date,
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get profitability report comparing revenue (client billing) vs costs (guard payroll).

    Shows gross profit and margin for the specified period.
    """
    # Calculate total revenue from invoices
    invoices = db.query(ClientInvoice).filter(
        and_(
            ClientInvoice.org_id == org_id,
            ClientInvoice.period_start >= period_start,
            ClientInvoice.period_end <= period_end
        )
    ).all()

    total_revenue = sum(inv.total_amount for inv in invoices)

    # Calculate total costs from shift assignments
    # Get all shifts in the period
    assignments = db.query(ShiftAssignment).join(Shift).filter(
        and_(
            Shift.org_id == org_id,
            Shift.start_time >= datetime.combine(period_start, datetime.min.time()),
            Shift.end_time <= datetime.combine(period_end, datetime.max.time()),
            ShiftAssignment.status.in_(["confirmed", "completed"])
        )
    ).all()

    # Sum up total cost (this is what guards are paid)
    total_costs = sum(a.total_cost for a in assignments)

    # Calculate profit
    gross_profit = total_revenue - total_costs
    profit_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0.0

    return ProfitabilityReport(
        period_start=period_start,
        period_end=period_end,
        total_revenue=total_revenue,
        total_costs=total_costs,
        gross_profit=gross_profit,
        profit_margin=round(profit_margin, 2)
    )


@router.get("/site-performance", response_model=List[SitePerformanceReport])
async def get_site_performance_report(
    period_start: date,
    period_end: date,
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get performance metrics per site showing revenue, costs, and profit margins.

    Useful for identifying most/least profitable sites.
    """
    sites = db.query(Site).filter(Site.org_id == org_id).all()

    site_reports = []

    for site in sites:
        # Get all shift assignments for this site in the period
        assignments = db.query(ShiftAssignment).join(Shift).filter(
            and_(
                Shift.site_id == site.site_id,
                Shift.start_time >= datetime.combine(period_start, datetime.min.time()),
                Shift.end_time <= datetime.combine(period_end, datetime.max.time()),
                ShiftAssignment.status.in_(["confirmed", "completed"])
            )
        ).all()

        if not assignments:
            continue  # Skip sites with no activity

        # Calculate metrics
        hours_worked = sum(a.regular_hours + a.overtime_hours for a in assignments)
        shifts_count = len(set(a.shift_id for a in assignments))
        cost = sum(a.total_cost for a in assignments)

        # Calculate revenue (billable hours × client rate)
        client = db.query(Client).filter(Client.client_id == site.client_id).first()
        billing_rate = float(site.billing_rate) if site.billing_rate else float(client.billing_rate or 120.0)
        revenue = hours_worked * billing_rate

        # Profit and margin
        profit = revenue - cost
        margin = (profit / revenue * 100) if revenue > 0 else 0.0

        site_reports.append(SitePerformanceReport(
            site_id=site.site_id,
            site_name=site.site_name,
            client_name=client.client_name if client else "Unknown",
            shifts_count=shifts_count,
            hours_worked=round(hours_worked, 2),
            revenue=round(revenue, 2),
            cost=round(cost, 2),
            profit=round(profit, 2),
            margin=round(margin, 2)
        ))

    # Sort by profit descending
    site_reports.sort(key=lambda x: x.profit, reverse=True)

    return site_reports


@router.get("/employee-payroll", response_model=List[EmployeePayrollSummary])
async def get_employee_payroll_report(
    period_start: date,
    period_end: date,
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get payroll summary for all employees for the specified period.

    Shows hours worked, overtime, and total earnings per employee.
    """
    employees = db.query(Employee).filter(Employee.org_id == org_id).all()

    employee_summaries = []

    for employee in employees:
        # Get all shift assignments for this employee in the period
        assignments = db.query(ShiftAssignment).join(Shift).filter(
            and_(
                ShiftAssignment.employee_id == employee.employee_id,
                Shift.start_time >= datetime.combine(period_start, datetime.min.time()),
                Shift.end_time <= datetime.combine(period_end, datetime.max.time()),
                ShiftAssignment.status.in_(["confirmed", "completed"])
            )
        ).all()

        if not assignments:
            continue  # Skip employees with no assignments

        # Calculate totals
        regular_hours = sum(a.regular_hours for a in assignments)
        overtime_hours = sum(a.overtime_hours for a in assignments)
        total_hours = regular_hours + overtime_hours
        gross_pay = sum(a.total_cost for a in assignments)
        shifts_worked = len(assignments)

        employee_summaries.append(EmployeePayrollSummary(
            employee_id=employee.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}",
            total_hours=round(total_hours, 2),
            regular_hours=round(regular_hours, 2),
            overtime_hours=round(overtime_hours, 2),
            gross_pay=round(gross_pay, 2),
            shifts_worked=shifts_worked
        ))

    # Sort by gross_pay descending
    employee_summaries.sort(key=lambda x: x.gross_pay, reverse=True)

    return employee_summaries


@router.get("/revenue-vs-cost")
async def get_revenue_cost_comparison(
    period_start: date,
    period_end: date,
    group_by: str = "month",  # month, week, client
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get revenue vs cost comparison grouped by time period or client.

    Useful for trend analysis and identifying profitable periods/clients.
    """
    if group_by not in ["month", "week", "client"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="group_by must be 'month', 'week', or 'client'"
        )

    # Get all shift assignments in period — single joined bulk query (no N+1)
    assignments = db.query(ShiftAssignment).join(
        Shift, Shift.shift_id == ShiftAssignment.shift_id
    ).join(
        Site, Site.site_id == Shift.site_id
    ).outerjoin(
        Client, Client.client_id == Site.client_id
    ).options(
        joinedload(ShiftAssignment.shift).joinedload(Shift.site).joinedload(Site.client)
    ).filter(
        and_(
            Shift.org_id == org_id,
            Shift.start_time >= datetime.combine(period_start, datetime.min.time()),
            Shift.end_time <= datetime.combine(period_end, datetime.max.time()),
            ShiftAssignment.status.in_(["confirmed", "completed"])
        )
    ).all()

    if group_by == "client":
        # Group by client
        clients_data = {}

        for assignment in assignments:
            shift = assignment.shift           # already loaded via joinedload
            site = shift.site if shift else None
            client = site.client if site else None

            client_name = client.client_name if client else "Unknown"

            if client_name not in clients_data:
                clients_data[client_name] = {"cost": 0.0, "revenue": 0.0}

            # Add cost
            clients_data[client_name]["cost"] += assignment.total_cost

            # Add revenue
            billing_rate = float(site.billing_rate or 0) if site and site.billing_rate else float(client.billing_rate or 120.0) if client else 120.0
            hours = assignment.regular_hours + assignment.overtime_hours
            clients_data[client_name]["revenue"] += hours * billing_rate

        # Format response
        result = []
        for client_name, data in clients_data.items():
            profit = data["revenue"] - data["cost"]
            margin = (profit / data["revenue"] * 100) if data["revenue"] > 0 else 0.0

            result.append({
                "group": client_name,
                "revenue": round(data["revenue"], 2),
                "cost": round(data["cost"], 2),
                "profit": round(profit, 2),
                "margin": round(margin, 2)
            })

        # Sort by profit descending
        result.sort(key=lambda x: x["profit"], reverse=True)

        return {
            "group_by": group_by,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "data": result
        }

    else:
        # Group by time period (month or week)
        time_data = {}

        for assignment in assignments:
            shift = assignment.shift           # already loaded via joinedload
            site = shift.site if shift else None
            client = site.client if site else None

            # Determine group key
            shift_date = shift.start_time.date()
            if group_by == "month":
                group_key = shift_date.strftime("%Y-%m")
            else:  # week
                # ISO week number
                group_key = shift_date.strftime("%Y-W%W")

            if group_key not in time_data:
                time_data[group_key] = {"cost": 0.0, "revenue": 0.0}

            # Add cost
            time_data[group_key]["cost"] += assignment.total_cost

            # Add revenue
            billing_rate = float(site.billing_rate or 0) if site and site.billing_rate else float(client.billing_rate or 120.0) if client else 120.0
            hours = assignment.regular_hours + assignment.overtime_hours
            time_data[group_key]["revenue"] += hours * billing_rate

        # Format response
        result = []
        for period, data in sorted(time_data.items()):
            profit = data["revenue"] - data["cost"]
            margin = (profit / data["revenue"] * 100) if data["revenue"] > 0 else 0.0

            result.append({
                "period": period,
                "revenue": round(data["revenue"], 2),
                "cost": round(data["cost"], 2),
                "profit": round(profit, 2),
                "margin": round(margin, 2)
            })

        return {
            "group_by": group_by,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "data": result
        }


@router.get("/outstanding-invoices")
async def get_outstanding_invoices_report(
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get report of all outstanding (unpaid) invoices.

    Shows invoices in 'sent' and 'overdue' status grouped by client.
    """
    # Get all unpaid invoices
    invoices = db.query(ClientInvoice).filter(
        and_(
            ClientInvoice.org_id == org_id,
            ClientInvoice.status.in_(["sent", "overdue"])
        )
    ).order_by(ClientInvoice.due_date.asc()).all()

    # Group by client
    clients_outstanding = {}

    for invoice in invoices:
        client = db.query(Client).filter(Client.client_id == invoice.client_id).first()
        client_name = client.client_name if client else "Unknown"

        if client_name not in clients_outstanding:
            clients_outstanding[client_name] = {
                "client_id": invoice.client_id,
                "client_name": client_name,
                "total_outstanding": 0.0,
                "invoices_count": 0,
                "oldest_invoice_date": None,
                "invoices": []
            }

        clients_outstanding[client_name]["total_outstanding"] += invoice.total_amount
        clients_outstanding[client_name]["invoices_count"] += 1

        if (clients_outstanding[client_name]["oldest_invoice_date"] is None or
            invoice.invoice_date < clients_outstanding[client_name]["oldest_invoice_date"]):
            clients_outstanding[client_name]["oldest_invoice_date"] = invoice.invoice_date

        clients_outstanding[client_name]["invoices"].append({
            "invoice_id": invoice.invoice_id,
            "invoice_number": invoice.invoice_number,
            "invoice_date": invoice.invoice_date.isoformat(),
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
            "amount": invoice.total_amount,
            "status": invoice.status,
            "days_overdue": (date.today() - invoice.due_date).days if invoice.due_date and date.today() > invoice.due_date else 0
        })

    # Convert to list and sort by total outstanding descending
    result = list(clients_outstanding.values())
    result.sort(key=lambda x: x["total_outstanding"], reverse=True)

    # Convert dates to ISO format
    for client_data in result:
        if client_data["oldest_invoice_date"]:
            client_data["oldest_invoice_date"] = client_data["oldest_invoice_date"].isoformat()

    total_outstanding = sum(c["total_outstanding"] for c in result)

    return {
        "total_outstanding": round(total_outstanding, 2),
        "clients_count": len(result),
        "total_invoices": sum(c["invoices_count"] for c in result),
        "clients": result
    }


@router.get("/client-profitability")
async def get_client_profitability(
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Per-client wage-to-revenue profitability breakdown.

    Revenue = billable hours × client billing rate.
    Wage cost = sum of ShiftAssignment.total_cost for guards at client's sites.
    Profit margin = (revenue - wage_cost) / revenue × 100.

    Default window: last 30 days.
    Returns clients sorted by profit margin descending (most profitable first).
    """
    today = date.today()
    if not period_end:
        period_end = today
    if not period_start:
        period_start = today - timedelta(days=30)

    start_dt = datetime.combine(period_start, datetime.min.time())
    end_dt = datetime.combine(period_end, datetime.max.time())

    clients = db.query(Client).filter(
        Client.org_id == org_id,
        Client.status == "active",
    ).all()

    result = []
    for client in clients:
        assignments = (
            db.query(ShiftAssignment)
            .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
            .join(Site, Shift.site_id == Site.site_id)
            .filter(
                Site.client_id == client.client_id,
                Shift.start_time >= start_dt,
                Shift.end_time <= end_dt,
                ShiftAssignment.status.in_(["confirmed", "completed"]),
            )
            .all()
        )

        if not assignments:
            continue

        wage_cost = sum(a.total_cost for a in assignments)
        hours_billed = sum(a.regular_hours + a.overtime_hours for a in assignments)
        billing_rate = float(client.billing_rate or 120.0)
        revenue = hours_billed * billing_rate
        profit = revenue - wage_cost
        margin = (profit / revenue * 100) if revenue > 0 else 0.0

        if margin >= 30:
            margin_status = "green"
        elif margin >= 15:
            margin_status = "amber"
        else:
            margin_status = "red"

        result.append({
            "client_id": client.client_id,
            "client_name": client.client_name,
            "revenue": round(revenue, 2),
            "wage_cost": round(wage_cost, 2),
            "profit": round(profit, 2),
            "profit_margin": round(margin, 1),
            "margin_status": margin_status,
            "hours_billed": round(hours_billed, 1),
            "shifts_count": len(set(a.shift_id for a in assignments)),
        })

    result.sort(key=lambda x: x["profit_margin"], reverse=True)

    return {
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "clients": result,
    }


# ==================== PDF REPORT EXPORTS ====================

def _load_org_company_details(db: Session, org_id: int):
    """Load organization and build CompanyDetails for PDF generation.

    Args:
        db: Database session.
        org_id: Organization ID.

    Returns:
        CompanyDetails dataclass.

    Raises:
        HTTPException: If organization is not found.
    """
    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    return build_company_details_from_org(org)


@router.get("/profitability/pdf")
async def export_profitability_pdf(
    period_start: date,
    period_end: date,
    group_by: str = "month",
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Export Profit & Loss report as PDF.

    Generates a professional PDF with summary metrics and monthly/client breakdown.
    Uses the same data as the profitability and revenue-vs-cost JSON endpoints.

    Args:
        period_start: Start of reporting period (YYYY-MM-DD)
        period_end: End of reporting period (YYYY-MM-DD)
        group_by: Grouping - 'month', 'week', or 'client'
        org_id: Organization ID (from auth)

    Returns:
        PDF file download
    """
    try:
        company = _load_org_company_details(db, org_id)

        # Get profitability totals
        invoices = db.query(ClientInvoice).filter(
            and_(
                ClientInvoice.org_id == org_id,
                ClientInvoice.period_start >= period_start,
                ClientInvoice.period_end <= period_end
            )
        ).all()

        total_revenue = sum(inv.total_amount for inv in invoices)

        assignments = db.query(ShiftAssignment).join(Shift).join(Site, Shift.site_id == Site.site_id).outerjoin(Client, Site.client_id == Client.client_id).options(
            joinedload(ShiftAssignment.shift).joinedload(Shift.site).joinedload(Site.client)
        ).filter(
            and_(
                Shift.org_id == org_id,
                Shift.start_time >= datetime.combine(period_start, datetime.min.time()),
                Shift.end_time <= datetime.combine(period_end, datetime.max.time()),
                ShiftAssignment.status.in_(["confirmed", "completed"])
            )
        ).all()

        total_costs = sum(a.total_cost for a in assignments)
        gross_profit = total_revenue - total_costs
        profit_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0.0

        # Build breakdown data (reuse revenue-vs-cost logic)
        breakdown = []
        if group_by == "client":
            clients_data = {}
            for assignment in assignments:
                shift = assignment.shift
                site = shift.site if shift else None
                client = site.client if site else None
                client_name = client.client_name if client else "Unknown"

                if client_name not in clients_data:
                    clients_data[client_name] = {"cost": 0.0, "revenue": 0.0}

                clients_data[client_name]["cost"] += assignment.total_cost
                billing_rate = float(site.billing_rate) if site.billing_rate else float(client.billing_rate or 120.0)
                hours = assignment.regular_hours + assignment.overtime_hours
                clients_data[client_name]["revenue"] += hours * billing_rate

            for name, data in clients_data.items():
                profit = data["revenue"] - data["cost"]
                margin = (profit / data["revenue"] * 100) if data["revenue"] > 0 else 0.0
                breakdown.append({
                    "group": name,
                    "revenue": round(data["revenue"], 2),
                    "cost": round(data["cost"], 2),
                    "profit": round(profit, 2),
                    "margin": round(margin, 2),
                })
            breakdown.sort(key=lambda x: x["profit"], reverse=True)
        else:
            time_data = {}
            for assignment in assignments:
                shift = assignment.shift
                site = shift.site if shift else None
                client = site.client if site else None

                shift_date = shift.start_time.date()
                if group_by == "month":
                    group_key = shift_date.strftime("%Y-%m")
                else:
                    group_key = shift_date.strftime("%Y-W%W")

                if group_key not in time_data:
                    time_data[group_key] = {"cost": 0.0, "revenue": 0.0}

                time_data[group_key]["cost"] += assignment.total_cost
                billing_rate = float(site.billing_rate) if site.billing_rate else float(client.billing_rate or 120.0)
                hours = assignment.regular_hours + assignment.overtime_hours
                time_data[group_key]["revenue"] += hours * billing_rate

            for period_key, data in sorted(time_data.items()):
                profit = data["revenue"] - data["cost"]
                margin = (profit / data["revenue"] * 100) if data["revenue"] > 0 else 0.0
                breakdown.append({
                    "group": period_key,
                    "revenue": round(data["revenue"], 2),
                    "cost": round(data["cost"], 2),
                    "profit": round(profit, 2),
                    "margin": round(margin, 2),
                })

        report_data = {
            "total_revenue": round(total_revenue, 2),
            "total_costs": round(total_costs, 2),
            "gross_profit": round(gross_profit, 2),
            "profit_margin": round(profit_margin, 2),
            "breakdown": breakdown,
        }

        pdf_bytes = generate_report_pdf(
            report_type="profit_loss",
            data=report_data,
            company=company,
            period_start=period_start,
            period_end=period_end,
        )

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=profit-loss-{date.today().isoformat()}.pdf"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating profitability PDF: {str(e)}"
        )


@router.get("/revenue-by-client/pdf")
async def export_revenue_by_client_pdf(
    period_start: date,
    period_end: date,
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Export Revenue by Client report as PDF.

    Shows revenue breakdown per client with hours, shifts, and percentage of total.

    Args:
        period_start: Start of reporting period (YYYY-MM-DD)
        period_end: End of reporting period (YYYY-MM-DD)
        org_id: Organization ID (from auth)

    Returns:
        PDF file download
    """
    try:
        company = _load_org_company_details(db, org_id)

        # Get all assignments in the period
        assignments = db.query(ShiftAssignment).join(Shift).join(Site, Shift.site_id == Site.site_id).outerjoin(Client, Site.client_id == Client.client_id).options(
            joinedload(ShiftAssignment.shift).joinedload(Shift.site).joinedload(Site.client)
        ).filter(
            and_(
                Shift.org_id == org_id,
                Shift.start_time >= datetime.combine(period_start, datetime.min.time()),
                Shift.end_time <= datetime.combine(period_end, datetime.max.time()),
                ShiftAssignment.status.in_(["confirmed", "completed"])
            )
        ).all()

        # Group by client
        clients_data = {}
        for assignment in assignments:
            shift = assignment.shift
            site = shift.site if shift else None
            client = site.client if site else None
            client_name = client.client_name if client else "Unknown"

            if client_name not in clients_data:
                clients_data[client_name] = {"hours": 0.0, "shifts": set(), "revenue": 0.0}

            hours = assignment.regular_hours + assignment.overtime_hours
            clients_data[client_name]["hours"] += hours
            clients_data[client_name]["shifts"].add(assignment.shift_id)

            billing_rate = float(site.billing_rate) if site.billing_rate else float(client.billing_rate or 120.0)
            clients_data[client_name]["revenue"] += hours * billing_rate

        total_revenue = sum(d["revenue"] for d in clients_data.values())

        clients_list = []
        for name, data in clients_data.items():
            pct = (data["revenue"] / total_revenue * 100) if total_revenue > 0 else 0.0
            clients_list.append({
                "client_name": name,
                "hours": round(data["hours"], 1),
                "shifts": len(data["shifts"]),
                "revenue": round(data["revenue"], 2),
                "pct_of_total": round(pct, 1),
            })

        # Sort by revenue descending
        clients_list.sort(key=lambda x: x["revenue"], reverse=True)

        report_data = {
            "total_revenue": round(total_revenue, 2),
            "client_count": len(clients_list),
            "clients": clients_list,
        }

        pdf_bytes = generate_report_pdf(
            report_type="revenue_by_client",
            data=report_data,
            company=company,
            period_start=period_start,
            period_end=period_end,
        )

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=revenue-by-client-{date.today().isoformat()}.pdf"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating revenue by client PDF: {str(e)}"
        )


@router.get("/coverage/pdf")
async def export_coverage_pdf(
    period_start: date,
    period_end: date,
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Export Coverage report as PDF.

    Shows shift fill rates per site with required vs filled counts and hours.

    Args:
        period_start: Start of reporting period (YYYY-MM-DD)
        period_end: End of reporting period (YYYY-MM-DD)
        org_id: Organization ID (from auth)

    Returns:
        PDF file download
    """
    try:
        company = _load_org_company_details(db, org_id)

        # Get all shifts in the period for this org with site eagerly loaded
        shifts = db.query(Shift).join(Site, Shift.site_id == Site.site_id).options(
            joinedload(Shift.site),
            joinedload(Shift.shift_assignments)
        ).filter(
            and_(
                Shift.org_id == org_id,
                Shift.start_time >= datetime.combine(period_start, datetime.min.time()),
                Shift.end_time <= datetime.combine(period_end, datetime.max.time()),
            )
        ).all()

        total_shifts = len(shifts)

        # Calculate per-site coverage
        site_data = {}
        filled_total = 0

        for shift in shifts:
            site = shift.site
            site_name = site.site_name if site else "Unknown"

            if site_name not in site_data:
                site_data[site_name] = {"required": 0, "filled": 0, "hours": 0.0}

            site_data[site_name]["required"] += 1

            # Check if shift has active assignments (already loaded via joinedload)
            active_assignments = [sa for sa in shift.shift_assignments if sa.status in ("pending", "confirmed", "completed")]

            if active_assignments:
                site_data[site_name]["filled"] += 1
                filled_total += 1

                # Calculate hours
                duration = (shift.end_time - shift.start_time).total_seconds() / 3600
                site_data[site_name]["hours"] += duration * len(active_assignments)

        fill_rate = (filled_total / total_shifts * 100) if total_shifts > 0 else 0.0

        sites_list = []
        for name, data in site_data.items():
            site_fill = (data["filled"] / data["required"] * 100) if data["required"] > 0 else 0.0
            sites_list.append({
                "site_name": name,
                "required": data["required"],
                "filled": data["filled"],
                "fill_rate": round(site_fill, 1),
                "hours": round(data["hours"], 1),
            })

        # Sort by fill rate ascending (worst first)
        sites_list.sort(key=lambda x: x["fill_rate"])

        report_data = {
            "total_shifts": total_shifts,
            "filled_shifts": filled_total,
            "fill_rate": round(fill_rate, 1),
            "sites": sites_list,
        }

        pdf_bytes = generate_report_pdf(
            report_type="coverage",
            data=report_data,
            company=company,
            period_start=period_start,
            period_end=period_end,
        )

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=coverage-report-{date.today().isoformat()}.pdf"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating coverage PDF: {str(e)}"
        )


@router.get("/outstanding-invoices/pdf")
async def export_outstanding_invoices_pdf(
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Export Outstanding Invoices report as PDF.

    Shows all unpaid invoices with amounts, due dates, and overdue status.
    No period filter required - shows all currently outstanding invoices.

    Args:
        org_id: Organization ID (from auth)

    Returns:
        PDF file download
    """
    try:
        company = _load_org_company_details(db, org_id)

        # Get all unpaid invoices
        invoices = db.query(ClientInvoice).filter(
            and_(
                ClientInvoice.org_id == org_id,
                ClientInvoice.status.in_(["sent", "overdue"])
            )
        ).order_by(ClientInvoice.due_date.asc()).all()

        total_outstanding = 0.0
        num_overdue = 0
        total_days_overdue = 0
        overdue_count = 0
        invoices_list = []

        for invoice in invoices:
            client = db.query(Client).filter(Client.client_id == invoice.client_id).first()
            client_name = client.client_name if client else "Unknown"

            days_overdue = 0
            if invoice.due_date and date.today() > invoice.due_date:
                days_overdue = (date.today() - invoice.due_date).days
                num_overdue += 1
                total_days_overdue += days_overdue
                overdue_count += 1

            total_outstanding += invoice.total_amount

            invoices_list.append({
                "invoice_number": invoice.invoice_number,
                "client_name": client_name,
                "amount": invoice.total_amount,
                "due_date": invoice.due_date,
                "days_overdue": days_overdue,
                "status": invoice.status,
            })

        avg_days_overdue = (total_days_overdue / overdue_count) if overdue_count > 0 else 0

        report_data = {
            "total_outstanding": round(total_outstanding, 2),
            "num_overdue": num_overdue,
            "avg_days_overdue": round(avg_days_overdue, 1),
            "invoices": invoices_list,
        }

        pdf_bytes = generate_report_pdf(
            report_type="outstanding_invoices",
            data=report_data,
            company=company,
        )

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=outstanding-invoices-{date.today().isoformat()}.pdf"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating outstanding invoices PDF: {str(e)}"
        )


@router.get("/employee-payroll/pdf")
async def export_employee_payroll_pdf(
    period_start: date,
    period_end: date,
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Export Employee Payroll Summary as PDF.

    Shows total payroll costs, hours, and per-employee breakdown
    including regular and overtime pay.

    Args:
        period_start: Start of reporting period (YYYY-MM-DD)
        period_end: End of reporting period (YYYY-MM-DD)
        org_id: Organization ID (from auth)

    Returns:
        PDF file download
    """
    try:
        company = _load_org_company_details(db, org_id)

        employees = db.query(Employee).filter(Employee.org_id == org_id).all()

        employees_list = []
        total_payroll = 0.0
        total_hours = 0.0

        for employee in employees:
            assignments = db.query(ShiftAssignment).join(Shift).filter(
                and_(
                    ShiftAssignment.employee_id == employee.employee_id,
                    Shift.start_time >= datetime.combine(period_start, datetime.min.time()),
                    Shift.end_time <= datetime.combine(period_end, datetime.max.time()),
                    ShiftAssignment.status.in_(["confirmed", "completed"])
                )
            ).all()

            if not assignments:
                continue

            regular_hours = sum(a.regular_hours for a in assignments)
            overtime_hours = sum(a.overtime_hours for a in assignments)
            emp_total_hours = regular_hours + overtime_hours
            gross_pay = sum(a.total_cost for a in assignments)

            # Estimate regular vs overtime pay split
            hourly_rate = employee.hourly_rate if employee.hourly_rate else 0
            regular_pay = regular_hours * hourly_rate
            overtime_pay = gross_pay - regular_pay if gross_pay > regular_pay else 0
            if overtime_pay < 0:
                regular_pay = gross_pay
                overtime_pay = 0

            total_payroll += gross_pay
            total_hours += emp_total_hours

            employees_list.append({
                "employee_name": f"{employee.first_name} {employee.last_name}",
                "total_hours": round(emp_total_hours, 1),
                "regular_pay": round(regular_pay, 2),
                "overtime_pay": round(overtime_pay, 2),
                "gross_pay": round(gross_pay, 2),
            })

        # Sort by gross_pay descending
        employees_list.sort(key=lambda x: x["gross_pay"], reverse=True)

        avg_hourly = (total_payroll / total_hours) if total_hours > 0 else 0.0

        report_data = {
            "total_payroll": round(total_payroll, 2),
            "total_hours": round(total_hours, 1),
            "avg_hourly_rate": round(avg_hourly, 2),
            "employees": employees_list,
        }

        pdf_bytes = generate_report_pdf(
            report_type="employee_payroll",
            data=report_data,
            company=company,
            period_start=period_start,
            period_end=period_end,
        )

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=employee-payroll-{date.today().isoformat()}.pdf"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating employee payroll PDF: {str(e)}"
        )


@router.get("/psira-compliance/pdf")
async def export_psira_compliance_pdf(
    as_of_date: Optional[date] = None,
    current_user: User = Depends(require_finance_access),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """
    Export PSIRA Compliance Report as PDF.

    Lists all active guards with their PSIRA registration number, grade,
    and certification expiry status. Flags expired and expiring-soon certs.

    Required by PSIRA regulations for audit and compliance purposes.

    Args:
        as_of_date: Reference date (defaults to today)
    """
    from app.models.certification import Certification
    from app.models.shift_assignment import ShiftAssignment, AssignmentStatus

    check_date = as_of_date or date.today()

    try:
        company = _load_org_company_details(db, org_id)

        employees = (
            db.query(Employee)
            .filter(
                Employee.org_id == org_id,
                Employee.status == "active",
            )
            .order_by(Employee.last_name, Employee.first_name)
            .all()
        )

        guards = []
        grade_counts: dict = {}
        valid_count = expired_count = expiring_count = no_psira_count = 0

        for emp in employees:
            # Prefer the employee-level PSIRA fields; fall back to certifications
            psira_number = emp.psira_number or "–"
            psira_grade = (emp.psira_grade or "–").upper()
            psira_expiry = emp.psira_expiry_date

            # If no employee-level fields, look in certifications table
            if not emp.psira_number:
                psira_cert = next(
                    (c for c in emp.certifications if c.psira_grade is not None),
                    None,
                )
                if psira_cert:
                    psira_number = psira_cert.cert_number or "–"
                    psira_grade = (psira_cert.psira_grade.value if hasattr(psira_cert.psira_grade, "value")
                                   else str(psira_cert.psira_grade)).upper()
                    psira_expiry = psira_cert.expiry_date

            # Determine status
            if psira_expiry is None and psira_number == "–":
                status_label = "No PSIRA"
                days_left = None
                no_psira_count += 1
            else:
                days_left = (psira_expiry - check_date).days if psira_expiry else None
                if days_left is None or days_left < 0:
                    status_label = "Expired"
                    expired_count += 1
                elif days_left <= 30:
                    status_label = "Expiring Soon"
                    expiring_count += 1
                else:
                    status_label = "Valid"
                    valid_count += 1

            # Grade tally
            if psira_grade != "–":
                grade_counts[psira_grade] = grade_counts.get(psira_grade, 0) + 1

            # Current site (most recent active assignment)
            site_name = "–"
            latest = (
                db.query(ShiftAssignment)
                .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
                .join(Site, Shift.site_id == Site.site_id)
                .filter(
                    ShiftAssignment.employee_id == emp.employee_id,
                    ShiftAssignment.status == AssignmentStatus.CONFIRMED,
                )
                .order_by(Shift.start_time.desc())
                .first()
            )
            if latest and latest.shift and latest.shift.site:
                site_name = latest.shift.site.site_name

            guards.append({
                "name": f"{emp.first_name} {emp.last_name}",
                "psira_number": psira_number,
                "grade": psira_grade,
                "expiry_date": psira_expiry.strftime("%d %b %Y") if psira_expiry else "–",
                "days_until_expiry": days_left,
                "status": status_label,
                "site": site_name,
            })

        # Sort: expired first, then expiring, then valid, then no PSIRA
        status_order = {"Expired": 0, "Expiring Soon": 1, "Valid": 2, "No PSIRA": 3}
        guards.sort(key=lambda g: (status_order.get(g["status"], 9), g["name"]))

        report_data = {
            "as_of_date": check_date.strftime("%d %b %Y"),
            "total_guards": len(employees),
            "valid_count": valid_count,
            "expiring_count": expiring_count,
            "expired_count": expired_count,
            "no_psira_count": no_psira_count,
            "grade_counts": grade_counts,
            "guards": guards,
        }

        pdf_bytes = generate_report_pdf(
            report_type="psira_compliance",
            data=report_data,
            company=company,
            period_start=check_date,
            period_end=check_date,
        )

        filename = f"psira-compliance-{check_date.isoformat()}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating PSIRA compliance report: {str(e)}",
        )
