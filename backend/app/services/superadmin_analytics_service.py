"""Superadmin Analytics Service - Platform-wide metrics and revenue tracking."""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, date, timedelta
from typing import Dict, Any, List
from decimal import Decimal

from app.models.organization import Organization
from app.models.guard_applicant import GuardApplicant
from app.models.job_posting import JobPosting
from app.models.job_application import JobApplication
from app.models.marketplace_commission import MarketplaceCommission, CommissionStatus, CommissionType
from app.models.cv_generation import CVPurchase, GeneratedCV, PaymentStatus
from app.models.marketplace_commission import BulkHiringPackage, PremiumJobPosting
from app.models.employee import Employee


class SuperadminAnalyticsService:
    """
    Platform-wide analytics for superadmin.

    Tracks:
    - Total revenue across all streams
    - Marketplace activity (guards, companies, jobs, hires)
    - Commission collection rates
    - CV generation stats
    - Premium job performance
    - Bulk package utilization
    """

    @staticmethod
    def get_platform_overview(db: Session) -> Dict[str, Any]:
        """
        Get high-level platform statistics.

        Returns complete overview for superadmin dashboard.
        """

        # Organizations
        total_orgs = db.query(func.count(Organization.id)).scalar() or 0
        active_orgs = db.query(func.count(Organization.id)).filter(
            Organization.subscription_active == True
        ).scalar() or 0

        # Guards
        total_guards = db.query(func.count(GuardApplicant.applicant_id)).scalar() or 0
        verified_guards = db.query(func.count(GuardApplicant.applicant_id)).filter(
            GuardApplicant.status == "verified"
        ).scalar() or 0
        available_guards = db.query(func.count(GuardApplicant.applicant_id)).filter(
            GuardApplicant.available_for_work == True
        ).scalar() or 0

        # Jobs
        total_jobs = db.query(func.count(JobPosting.job_id)).scalar() or 0
        active_jobs = db.query(func.count(JobPosting.job_id)).filter(
            JobPosting.status == "open"
        ).scalar() or 0
        premium_jobs = db.query(func.count(PremiumJobPosting.premium_job_id)).filter(
            PremiumJobPosting.payment_status == "paid"
        ).scalar() or 0

        # Applications & Hires
        total_applications = db.query(func.count(JobApplication.application_id)).scalar() or 0
        total_hires = db.query(func.count(JobApplication.application_id)).filter(
            JobApplication.hired == True
        ).scalar() or 0

        # Employees hired from marketplace
        marketplace_hires = db.query(func.count(Employee.employee_id)).filter(
            Employee.hired_from_marketplace == True
        ).scalar() or 0

        return {
            "organizations": {
                "total": total_orgs,
                "active": active_orgs,
                "inactive": total_orgs - active_orgs
            },
            "guards": {
                "total": total_guards,
                "verified": verified_guards,
                "available": available_guards
            },
            "jobs": {
                "total": total_jobs,
                "active": active_jobs,
                "premium": premium_jobs
            },
            "activity": {
                "total_applications": total_applications,
                "total_hires": total_hires,
                "marketplace_hires": marketplace_hires
            }
        }

    @staticmethod
    def get_revenue_summary(db: Session, period_days: int = 30) -> Dict[str, Any]:
        """
        Get revenue summary across all streams.

        Args:
            period_days: Number of days to look back (default 30)

        Returns:
            Revenue breakdown by stream
        """

        cutoff_date = datetime.utcnow() - timedelta(days=period_days)

        # 1. CV Generation Revenue (R60 per purchase)
        cv_revenue = db.query(func.sum(CVPurchase.amount)).filter(
            CVPurchase.payment_status == PaymentStatus.COMPLETED,
            CVPurchase.paid_at >= cutoff_date
        ).scalar() or Decimal(0)

        cv_purchases_count = db.query(func.count(CVPurchase.purchase_id)).filter(
            CVPurchase.payment_status == PaymentStatus.COMPLETED,
            CVPurchase.paid_at >= cutoff_date
        ).scalar() or 0

        # 2. Marketplace Commission Revenue (R500 from guards)
        commission_revenue = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE,
            MarketplaceCommission.status == CommissionStatus.PAID,
            MarketplaceCommission.paid_at >= cutoff_date
        ).scalar() or Decimal(0)

        commission_count = db.query(func.count(MarketplaceCommission.commission_id)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE,
            MarketplaceCommission.status == CommissionStatus.PAID,
            MarketplaceCommission.paid_at >= cutoff_date
        ).scalar() or 0

        # 3. Premium Job Revenue (from companies)
        premium_revenue = db.query(func.sum(PremiumJobPosting.price_paid)).filter(
            PremiumJobPosting.payment_status == "paid",
            PremiumJobPosting.paid_at >= cutoff_date
        ).scalar() or Decimal(0)

        premium_count = db.query(func.count(PremiumJobPosting.premium_job_id)).filter(
            PremiumJobPosting.payment_status == "paid",
            PremiumJobPosting.paid_at >= cutoff_date
        ).scalar() or 0

        # 4. Bulk Package Revenue (from companies)
        bulk_revenue = db.query(func.sum(BulkHiringPackage.price_paid)).filter(
            BulkHiringPackage.payment_status == "paid",
            BulkHiringPackage.paid_at >= cutoff_date
        ).scalar() or Decimal(0)

        bulk_count = db.query(func.count(BulkHiringPackage.package_id)).filter(
            BulkHiringPackage.payment_status == "paid",
            BulkHiringPackage.paid_at >= cutoff_date
        ).scalar() or 0

        # Total revenue
        total_revenue = float(cv_revenue) + float(commission_revenue) + float(premium_revenue) + float(bulk_revenue)

        return {
            "period_days": period_days,
            "total_revenue": total_revenue,
            "revenue_streams": {
                "cv_generation": {
                    "revenue": float(cv_revenue),
                    "count": cv_purchases_count,
                    "average": float(cv_revenue) / cv_purchases_count if cv_purchases_count > 0 else 0
                },
                "marketplace_commission": {
                    "revenue": float(commission_revenue),
                    "count": commission_count,
                    "average": float(commission_revenue) / commission_count if commission_count > 0 else 0
                },
                "premium_jobs": {
                    "revenue": float(premium_revenue),
                    "count": premium_count,
                    "average": float(premium_revenue) / premium_count if premium_count > 0 else 0
                },
                "bulk_packages": {
                    "revenue": float(bulk_revenue),
                    "count": bulk_count,
                    "average": float(bulk_revenue) / bulk_count if bulk_count > 0 else 0
                }
            }
        }

    @staticmethod
    def get_commission_analytics(db: Session) -> Dict[str, Any]:
        """
        Get detailed commission analytics.

        Shows collection rates and pending revenue.
        """

        # Total commissions
        total = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE
        ).scalar() or Decimal(0)

        # Pending (not started deduction)
        pending = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE,
            MarketplaceCommission.status == CommissionStatus.PENDING
        ).scalar() or Decimal(0)

        pending_count = db.query(func.count(MarketplaceCommission.commission_id)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE,
            MarketplaceCommission.status == CommissionStatus.PENDING
        ).scalar() or 0

        # In progress (partial deductions)
        in_progress = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE,
            MarketplaceCommission.status == CommissionStatus.IN_PROGRESS
        ).scalar() or Decimal(0)

        in_progress_count = db.query(func.count(MarketplaceCommission.commission_id)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE,
            MarketplaceCommission.status == CommissionStatus.IN_PROGRESS
        ).scalar() or 0

        # Fully paid
        paid = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE,
            MarketplaceCommission.status == CommissionStatus.PAID
        ).scalar() or Decimal(0)

        paid_count = db.query(func.count(MarketplaceCommission.commission_id)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE,
            MarketplaceCommission.status == CommissionStatus.PAID
        ).scalar() or 0

        # Waived (sponsored by companies)
        waived = db.query(func.sum(MarketplaceCommission.amount)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE,
            MarketplaceCommission.status == CommissionStatus.WAIVED
        ).scalar() or Decimal(0)

        waived_count = db.query(func.count(MarketplaceCommission.commission_id)).filter(
            MarketplaceCommission.commission_type == CommissionType.HIRE,
            MarketplaceCommission.status == CommissionStatus.WAIVED
        ).scalar() or 0

        # Collection rate
        total_expected = float(total) - float(waived)  # Exclude waived
        collection_rate = (float(paid) / total_expected * 100) if total_expected > 0 else 0

        return {
            "total_commissions": float(total),
            "pending": {
                "amount": float(pending),
                "count": pending_count
            },
            "in_progress": {
                "amount": float(in_progress),
                "count": in_progress_count
            },
            "paid": {
                "amount": float(paid),
                "count": paid_count
            },
            "waived_by_sponsorship": {
                "amount": float(waived),
                "count": waived_count
            },
            "collection_rate_percent": round(collection_rate, 2)
        }

    @staticmethod
    def get_cv_generation_stats(db: Session) -> Dict[str, Any]:
        """Get CV generation statistics."""

        # Purchases
        total_purchases = db.query(func.count(CVPurchase.purchase_id)).scalar() or 0
        completed_purchases = db.query(func.count(CVPurchase.purchase_id)).filter(
            CVPurchase.payment_status == PaymentStatus.COMPLETED
        ).scalar() or 0

        # CVs generated
        total_cvs = db.query(func.count(GeneratedCV.cv_id)).scalar() or 0

        # Template popularity
        template_stats = db.query(
            GeneratedCV.template_name,
            func.count(GeneratedCV.cv_id).label('count')
        ).group_by(GeneratedCV.template_name).all()

        template_breakdown = {template: count for template, count in template_stats}

        # Total downloads
        total_downloads = db.query(func.sum(GeneratedCV.download_count)).scalar() or 0

        return {
            "total_purchases": total_purchases,
            "completed_purchases": completed_purchases,
            "total_cvs_generated": total_cvs,
            "total_downloads": int(total_downloads),
            "template_popularity": template_breakdown,
            "avg_cvs_per_purchase": round(total_cvs / completed_purchases, 2) if completed_purchases > 0 else 0
        }

    @staticmethod
    def get_bulk_package_stats(db: Session) -> Dict[str, Any]:
        """Get bulk package utilization statistics."""

        # Active packages
        active_packages = db.query(BulkHiringPackage).filter(
            BulkHiringPackage.status == "active",
            BulkHiringPackage.payment_status == "paid"
        ).all()

        # Breakdown by type
        starter = [p for p in active_packages if p.package_type == "starter"]
        professional = [p for p in active_packages if p.package_type == "professional"]
        enterprise = [p for p in active_packages if p.package_type == "enterprise"]

        def calc_utilization(packages):
            if not packages:
                return {"count": 0, "total_quota": 0, "used": 0, "remaining": 0, "utilization_percent": 0}

            total_quota = sum(p.hires_quota for p in packages)
            used = sum(p.hires_used for p in packages)
            remaining = sum(p.hires_remaining for p in packages)

            return {
                "count": len(packages),
                "total_quota": total_quota,
                "used": used,
                "remaining": remaining,
                "utilization_percent": round((used / total_quota * 100) if total_quota > 0 else 0, 2)
            }

        return {
            "active_packages_total": len(active_packages),
            "starter": calc_utilization(starter),
            "professional": calc_utilization(professional),
            "enterprise": calc_utilization(enterprise)
        }

    @staticmethod
    def get_recent_activity(db: Session, limit: int = 10) -> Dict[str, Any]:
        """Get recent platform activity for dashboard feed."""

        # Recent hires
        recent_hires = db.query(JobApplication).filter(
            JobApplication.hired == True
        ).order_by(JobApplication.hired_at.desc()).limit(limit).all()

        # Recent CV purchases
        recent_cvs = db.query(CVPurchase).filter(
            CVPurchase.payment_status == PaymentStatus.COMPLETED
        ).order_by(CVPurchase.paid_at.desc()).limit(limit).all()

        # Recent premium jobs
        recent_premium = db.query(PremiumJobPosting).filter(
            PremiumJobPosting.payment_status == "paid"
        ).order_by(PremiumJobPosting.paid_at.desc()).limit(limit).all()

        return {
            "recent_hires": [
                {
                    "application_id": h.application_id,
                    "hired_at": h.hired_at.isoformat() if h.hired_at else None,
                    "job_id": h.job_id
                }
                for h in recent_hires
            ],
            "recent_cv_purchases": [
                {
                    "purchase_id": cv.purchase_id,
                    "amount": float(cv.amount),
                    "paid_at": cv.paid_at.isoformat() if cv.paid_at else None
                }
                for cv in recent_cvs
            ],
            "recent_premium_jobs": [
                {
                    "premium_job_id": p.premium_job_id,
                    "badge_color": p.badge_color,
                    "price_paid": float(p.price_paid),
                    "paid_at": p.paid_at.isoformat() if p.paid_at else None
                }
                for p in recent_premium
            ]
        }
