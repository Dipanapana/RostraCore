"""Revenue dashboard — invoice revenue, contract values, client-level revenue breakdown."""

from datetime import datetime, date, timedelta
from typing import Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.client_invoice import ClientInvoice
from app.models.contract_value import ContractValue
from app.models.client import Client
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/overview")
def revenue_overview(
    days: int = Query(365, ge=1, le=730),
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Revenue dashboard — invoiced revenue, outstanding, by client, monthly trend."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    today = date.today()

    # Invoices
    invoices = db.query(ClientInvoice).filter(
        ClientInvoice.org_id == org_id,
        ClientInvoice.created_at >= cutoff,
    ).all()

    total_invoiced = 0.0
    total_paid = 0.0
    total_outstanding = 0.0
    total_overdue = 0.0

    client_revenue = defaultdict(lambda: {"invoiced": 0, "paid": 0, "outstanding": 0, "count": 0})
    monthly_revenue = defaultdict(lambda: {"invoiced": 0, "paid": 0})

    for inv in invoices:
        amount = float(inv.total_amount or 0)
        status = str(getattr(inv.status, 'value', inv.status)) if inv.status else ""

        total_invoiced += amount
        month_key = inv.created_at.strftime("%Y-%m") if inv.created_at else "unknown"
        monthly_revenue[month_key]["invoiced"] += amount

        if status in ("paid", "PAID"):
            total_paid += amount
            monthly_revenue[month_key]["paid"] += amount
        elif status in ("sent", "SENT", "draft", "DRAFT", "overdue", "OVERDUE"):
            total_outstanding += amount
            if inv.due_date and inv.due_date < today:
                total_overdue += amount

        cid = inv.client_id
        if cid:
            client_revenue[cid]["invoiced"] += amount
            client_revenue[cid]["count"] += 1
            if status in ("paid", "PAID"):
                client_revenue[cid]["paid"] += amount
            else:
                client_revenue[cid]["outstanding"] += amount

    # Client names
    client_ids = list(client_revenue.keys())
    client_names = {}
    if client_ids:
        for c in db.query(Client).filter(Client.client_id.in_(client_ids)).all():
            client_names[c.client_id] = c.client_name

    by_client = []
    for cid, rev in sorted(client_revenue.items(), key=lambda x: x[1]["invoiced"], reverse=True):
        by_client.append({
            "client_id": cid,
            "client_name": client_names.get(cid, f"Client #{cid}"),
            "invoiced": round(rev["invoiced"], 2),
            "paid": round(rev["paid"], 2),
            "outstanding": round(rev["outstanding"], 2),
            "invoice_count": rev["count"],
        })

    by_month = []
    for month in sorted(monthly_revenue.keys()):
        rev = monthly_revenue[month]
        by_month.append({
            "month": month,
            "invoiced": round(rev["invoiced"], 2),
            "paid": round(rev["paid"], 2),
        })

    # Contract values — annual/monthly recurring
    contracts = db.query(ContractValue).filter(
        ContractValue.org_id == org_id,
    ).all()

    total_contract_value = 0.0
    monthly_contract_value = 0.0
    for cv in contracts:
        val = float(cv.monthly_value or 0)
        monthly_contract_value += val
        total_contract_value += val * 12

    collection_rate = round((total_paid / total_invoiced) * 100, 1) if total_invoiced > 0 else 0

    return {
        "period_days": days,
        "total_invoiced": round(total_invoiced, 2),
        "total_paid": round(total_paid, 2),
        "total_outstanding": round(total_outstanding, 2),
        "total_overdue": round(total_overdue, 2),
        "collection_rate": collection_rate,
        "invoice_count": len(invoices),
        "monthly_contract_value": round(monthly_contract_value, 2),
        "annual_contract_value": round(total_contract_value, 2),
        "active_contracts": len(contracts),
        "by_client": by_client,
        "by_month": by_month,
    }
