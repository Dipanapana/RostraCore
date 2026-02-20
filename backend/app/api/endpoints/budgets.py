"""Budget management endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.budget import Budget
from app.models.site import Site
from app.auth.security import get_current_org_id

router = APIRouter()

CATEGORIES = ["wages", "equipment", "training", "operations", "other"]


class BudgetCreate(BaseModel):
    name: str
    category: Optional[str] = None
    site_id: Optional[int] = None
    period_month: Optional[int] = None
    period_year: int
    allocated_amount: int  # cents
    spent_amount: int = 0
    notes: Optional[str] = None


class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    allocated_amount: Optional[int] = None
    spent_amount: Optional[int] = None
    notes: Optional[str] = None


def _build_response(b: Budget, db: Session) -> dict:
    site = db.query(Site).get(b.site_id) if b.site_id else None
    remaining = b.allocated_amount - b.spent_amount
    utilisation = round(b.spent_amount / b.allocated_amount * 100, 1) if b.allocated_amount else 0
    return {
        "budget_id": b.budget_id,
        "name": b.name,
        "category": b.category,
        "site_id": b.site_id,
        "site_name": site.site_name if site else None,
        "period_month": b.period_month,
        "period_year": b.period_year,
        "allocated_amount": b.allocated_amount,
        "spent_amount": b.spent_amount,
        "remaining": remaining,
        "utilisation_pct": utilisation,
        "notes": b.notes,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("/")
def list_budgets(
    year: Optional[int] = None,
    category: Optional[str] = None,
    site_id: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    q = db.query(Budget).filter(Budget.org_id == org_id)
    if year:
        q = q.filter(Budget.period_year == year)
    if category:
        q = q.filter(Budget.category == category)
    if site_id:
        q = q.filter(Budget.site_id == site_id)
    q = q.order_by(Budget.period_year.desc(), Budget.period_month.desc())
    rows = q.all()
    return {"items": [_build_response(b, db) for b in rows], "total": len(rows)}


@router.post("/", status_code=201)
def create_budget(
    body: BudgetCreate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    if body.category and body.category not in CATEGORIES:
        raise HTTPException(400, f"category must be one of: {', '.join(CATEGORIES)}")
    rec = Budget(
        org_id=org_id,
        name=body.name,
        category=body.category,
        site_id=body.site_id,
        period_month=body.period_month,
        period_year=body.period_year,
        allocated_amount=body.allocated_amount,
        spent_amount=body.spent_amount,
        notes=body.notes,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.put("/{budget_id}/")
def update_budget(
    budget_id: int,
    body: BudgetUpdate,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(Budget).filter(Budget.budget_id == budget_id, Budget.org_id == org_id).first()
    if not rec:
        raise HTTPException(404, "Budget not found")
    for field, val in body.dict(exclude_unset=True).items():
        setattr(rec, field, val)
    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _build_response(rec, db)


@router.delete("/{budget_id}/")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    rec = db.query(Budget).filter(Budget.budget_id == budget_id, Budget.org_id == org_id).first()
    if not rec:
        raise HTTPException(404, "Budget not found")
    db.delete(rec)
    db.commit()
    return {"detail": "deleted"}


@router.get("/dashboard")
def budget_dashboard(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    target_year = year or datetime.utcnow().year
    budgets = db.query(Budget).filter(
        Budget.org_id == org_id, Budget.period_year == target_year
    ).all()

    total_allocated = sum(b.allocated_amount for b in budgets)
    total_spent = sum(b.spent_amount for b in budgets)
    total_remaining = total_allocated - total_spent

    # By category
    cat_map: dict = {}
    for b in budgets:
        key = b.category or "other"
        if key not in cat_map:
            cat_map[key] = {"allocated": 0, "spent": 0}
        cat_map[key]["allocated"] += b.allocated_amount
        cat_map[key]["spent"] += b.spent_amount
    by_category = [
        {"category": k, "allocated": v["allocated"], "spent": v["spent"],
         "utilisation_pct": round(v["spent"] / v["allocated"] * 100, 1) if v["allocated"] else 0}
        for k, v in cat_map.items()
    ]

    # Over-budget items
    over_budget = [_build_response(b, db) for b in budgets if b.spent_amount > b.allocated_amount]

    return {
        "year": target_year,
        "total_budgets": len(budgets),
        "total_allocated": total_allocated,
        "total_spent": total_spent,
        "total_remaining": total_remaining,
        "overall_utilisation_pct": round(total_spent / total_allocated * 100, 1) if total_allocated else 0,
        "by_category": by_category,
        "over_budget_count": len(over_budget),
        "over_budget_items": over_budget[:5],
    }
