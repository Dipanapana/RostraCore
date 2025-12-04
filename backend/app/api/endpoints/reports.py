"""Financial and operational reporting endpoints - Payroll, billing, and profitability reports."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, case
from datetime import date, datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.client_invoice import ClientInvoice
from app.models.payroll import PayrollSummary
from app.models.shift_assignment import ShiftAssignment
from app.models.shift import Shift
from app.models.employee import Employee
from app.models.site import Site
from app.models.client import Client
from app.auth.security import get_current_org_id

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

    # Get all shift assignments in period
    assignments = db.query(ShiftAssignment).join(Shift).filter(
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
            shift = db.query(Shift).filter(Shift.shift_id == assignment.shift_id).first()
            site = db.query(Site).filter(Site.site_id == shift.site_id).first()
            client = db.query(Client).filter(Client.client_id == site.client_id).first()

            client_name = client.client_name if client else "Unknown"

            if client_name not in clients_data:
                clients_data[client_name] = {"cost": 0.0, "revenue": 0.0}

            # Add cost
            clients_data[client_name]["cost"] += assignment.total_cost

            # Add revenue
            billing_rate = float(site.billing_rate) if site.billing_rate else float(client.billing_rate or 120.0)
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
            shift = db.query(Shift).filter(Shift.shift_id == assignment.shift_id).first()
            site = db.query(Site).filter(Site.site_id == shift.site_id).first()
            client = db.query(Client).filter(Client.client_id == site.client_id).first()

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
            billing_rate = float(site.billing_rate) if site.billing_rate else float(client.billing_rate or 120.0)
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
