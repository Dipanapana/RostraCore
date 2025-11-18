"""Superadmin Analytics Service - Platform-wide metrics for SaaS MVP."""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import Dict, Any, List
from decimal import Decimal

from app.models.organization import Organization
from app.models.employee import Employee
from app.models.client import Client
from app.models.site import Site
from app.models.shift import Shift


class SuperadminAnalyticsService:
    """
    Platform-wide analytics for superadmin in SaaS model.

    Tracks:
    - Organization subscriptions and trials
    - Platform revenue from subscriptions
    - Platform-wide usage statistics
    - Active organizations and employees
    - System health metrics

    TODO: Full implementation in Phase 5 (SuperAdmin Portal)
    """

    @staticmethod
    def get_platform_overview(db: Session) -> Dict[str, Any]:
        """
        Get high-level platform statistics for superadmin dashboard.

        Returns complete overview for superadmin.
        """

        # Organizations
        total_orgs = db.query(func.count(Organization.org_id)).scalar() or 0

        # TODO Phase 4: Add subscription status filtering
        # active_orgs = db.query(func.count(Organization.org_id)).filter(
        #     Organization.status == "active"
        # ).scalar() or 0
        # trial_orgs = db.query(func.count(Organization.org_id)).filter(
        #     Organization.status == "trial"
        # ).scalar() or 0

        # Employees (guards) across all organizations
        total_employees = db.query(func.count(Employee.employee_id)).scalar() or 0
        active_employees = db.query(func.count(Employee.employee_id)).filter(
            Employee.status == "active"
        ).scalar() or 0

        # Clients across all organizations
        total_clients = db.query(func.count(Client.client_id)).scalar() or 0

        # Sites across all organizations
        total_sites = db.query(func.count(Site.site_id)).scalar() or 0

        # Shifts (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_shifts = db.query(func.count(Shift.shift_id)).filter(
            Shift.start_time >= thirty_days_ago
        ).scalar() or 0

        return {
            "organizations": {
                "total": total_orgs,
                "active": total_orgs,  # TODO: Update in Phase 4
                "trial": 0,  # TODO: Update in Phase 4
                "cancelled": 0  # TODO: Update in Phase 4
            },
            "employees": {
                "total": total_employees,
                "active": active_employees,
                "inactive": total_employees - active_employees
            },
            "clients": {
                "total": total_clients
            },
            "sites": {
                "total": total_sites
            },
            "activity": {
                "shifts_last_30_days": recent_shifts
            }
        }

    @staticmethod
    def get_revenue_summary(db: Session, period_days: int = 30) -> Dict[str, Any]:
        """
        Get revenue summary from subscriptions.

        TODO: Implement in Phase 4 (Subscription System)
        - Calculate Monthly Recurring Revenue (MRR)
        - Track subscription upgrades/downgrades
        - Calculate churn rate
        - Trial conversion rate
        """

        return {
            "period_days": period_days,
            "total_revenue": 0.0,
            "mrr": 0.0,
            "arr": 0.0,
            "new_subscriptions": 0,
            "cancelled_subscriptions": 0,
            "upgrades": 0,
            "downgrades": 0,
            "trial_conversions": 0,
            "churn_rate": 0.0,
            "message": "Revenue tracking coming in Phase 4"
        }

    @staticmethod
    def get_organization_health_scores(db: Session) -> List[Dict[str, Any]]:
        """
        Calculate health scores for all organizations.

        Health indicators:
        - Subscription status (active/trial/cancelled)
        - Payment status (current/overdue)
        - Usage level (employees, shifts created)
        - Last activity date

        TODO: Implement in Phase 5 (SuperAdmin Portal)
        """

        orgs = db.query(Organization).all()

        health_scores = []
        for org in orgs:
            # Basic employee count
            employee_count = db.query(func.count(Employee.employee_id)).filter(
                Employee.org_id == org.org_id
            ).scalar() or 0

            health_scores.append({
                "org_id": org.org_id,
                "org_name": org.org_name,
                "employee_count": employee_count,
                "status": "active",  # TODO: Add in Phase 4
                "health_score": 100,  # TODO: Calculate in Phase 5
                "last_activity": None  # TODO: Track in Phase 5
            })

        return health_scores

    @staticmethod
    def get_subscription_analytics(db: Session) -> Dict[str, Any]:
        """
        Get subscription plan distribution and metrics.

        TODO: Implement in Phase 4 (Subscription System)
        - Breakdown by plan tier (Free, Basic, Pro, Enterprise)
        - Average revenue per organization
        - Plan upgrade/downgrade trends
        """

        return {
            "plan_distribution": {
                "free": 0,
                "basic": 0,
                "pro": 0,
                "enterprise": 0
            },
            "average_revenue_per_org": 0.0,
            "message": "Subscription analytics coming in Phase 4"
        }
