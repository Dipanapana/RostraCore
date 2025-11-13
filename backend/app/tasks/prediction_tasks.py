"""
Celery Tasks for Predictive Intelligence
Automated batch jobs for predictions and health scoring
"""

from celery import Task
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from app.celery_app import celery_app
from app.database import SessionLocal
from app.services.churn_prediction_service import ChurnPredictor
from app.services.analytics_service import AnalyticsService
from app.models.employee import Employee
from app.models.organization import Organization

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task with database session"""
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.prediction_tasks.calculate_all_churn_predictions')
def calculate_all_churn_predictions(self):
    """
    Calculate churn predictions for all active employees

    Runs daily to identify at-risk employees
    """
    try:
        logger.info("Starting churn prediction batch job")

        # Get all organizations
        organizations = self.db.query(Organization).filter(Organization.is_active == True).all()

        total_processed = 0
        total_at_risk = 0

        for org in organizations:
            logger.info(f"Processing churn predictions for org_id={org.org_id}")

            # Get active employees for this org
            employees = self.db.query(Employee).filter(
                Employee.org_id == org.org_id,
                Employee.status == 'active'
            ).all()

            org_at_risk = 0

            for employee in employees:
                try:
                    prediction = ChurnPredictor.predict_employee_churn_risk(
                        db=self.db,
                        employee_id=employee.employee_id
                    )

                    # Store prediction result (could save to database table for historical tracking)
                    if prediction.get('risk_level') in ['high', 'critical']:
                        org_at_risk += 1
                        logger.warning(
                            f"Employee {employee.employee_id} at {prediction['risk_level']} churn risk: "
                            f"{prediction['churn_risk_percentage']}%"
                        )

                    total_processed += 1

                except Exception as e:
                    logger.error(f"Error predicting churn for employee {employee.employee_id}: {e}")

            total_at_risk += org_at_risk

            # Could send email alert to org admin if many at-risk employees
            if org_at_risk > len(employees) * 0.15:  # >15% at risk
                logger.warning(
                    f"Organization {org.org_id} has {org_at_risk} employees at risk "
                    f"({round(org_at_risk/len(employees)*100, 1)}%)"
                )

        logger.info(
            f"Churn prediction completed: {total_processed} employees processed, "
            f"{total_at_risk} at high/critical risk"
        )

        return {
            'status': 'completed',
            'employees_processed': total_processed,
            'employees_at_risk': total_at_risk,
            'completed_at': datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Churn prediction batch job failed: {e}")
        raise


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.prediction_tasks.calculate_all_customer_health_scores')
def calculate_all_customer_health_scores(self):
    """
    Calculate customer health scores for all organizations

    Runs daily to track customer satisfaction and churn risk
    """
    try:
        logger.info("Starting customer health scoring batch job")

        # Get all active organizations
        organizations = self.db.query(Organization).filter(Organization.is_active == True).all()

        scores_calculated = 0

        for org in organizations:
            try:
                # Calculate and save health score
                health_score = AnalyticsService.calculate_customer_health_score(
                    db=self.db,
                    org_id=org.org_id
                )

                # Commit to database
                self.db.commit()

                logger.info(
                    f"Health score for org {org.org_id}: {health_score.overall_score}/100 "
                    f"({health_score.health_status})"
                )

                # Alert if customer is at risk
                if health_score.churn_risk > 0.5:
                    logger.warning(
                        f"Customer {org.org_id} at risk of churning: "
                        f"{float(health_score.churn_risk)*100}% churn risk"
                    )

                scores_calculated += 1

            except Exception as e:
                logger.error(f"Error calculating health score for org {org.org_id}: {e}")
                self.db.rollback()

        logger.info(f"Customer health scoring completed: {scores_calculated} scores calculated")

        return {
            'status': 'completed',
            'scores_calculated': scores_calculated,
            'completed_at': datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Customer health scoring batch job failed: {e}")
        raise


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.prediction_tasks.generate_daily_alerts')
def generate_daily_alerts(self):
    """
    Generate daily alerts for critical issues

    Alerts for:
    - Employees at critical churn risk
    - Unfilled shifts in next 24 hours
    - Expiring certifications in next 7 days
    - Customer health scores below threshold
    """
    try:
        logger.info("Starting daily alerts generation")

        alerts = []
        now = datetime.utcnow()

        # 1. Employee Churn Alerts
        from app.models.employee import Employee

        employees = self.db.query(Employee).filter(Employee.status == 'active').all()

        critical_churn_count = 0
        for employee in employees:
            prediction = ChurnPredictor.predict_employee_churn_risk(self.db, employee.employee_id)

            if prediction.get('risk_level') == 'critical':
                alerts.append({
                    'type': 'CRITICAL_CHURN_RISK',
                    'employee_id': employee.employee_id,
                    'employee_name': f"{employee.first_name} {employee.last_name}",
                    'risk_percentage': prediction['churn_risk_percentage'],
                    'recommendation': prediction['recommendation']
                })
                critical_churn_count += 1

        # 2. Unfilled Shifts Alerts (next 24 hours)
        from app.models.shift import Shift

        tomorrow = now + timedelta(hours=24)
        unfilled_shifts = self.db.query(Shift).filter(
            Shift.start_time >= now,
            Shift.start_time <= tomorrow,
            Shift.assigned_employee_id.is_(None)
        ).all()

        for shift in unfilled_shifts:
            alerts.append({
                'type': 'UNFILLED_SHIFT_URGENT',
                'shift_id': shift.shift_id,
                'site_id': shift.site_id,
                'start_time': shift.start_time.isoformat(),
                'hours_until': int((shift.start_time - now).total_seconds() / 3600)
            })

        # 3. Expiring Certifications (next 7 days)
        from app.models.certification import Certification

        seven_days = now + timedelta(days=7)
        expiring_certs = self.db.query(Certification).join(Employee).filter(
            Certification.expiry_date.isnot(None),
            Certification.expiry_date > now,
            Certification.expiry_date <= seven_days,
            Employee.status == 'active'
        ).all()

        for cert in expiring_certs:
            alerts.append({
                'type': 'CERTIFICATION_EXPIRING',
                'employee_id': cert.employee_id,
                'employee_name': f"{cert.employee.first_name} {cert.employee.last_name}",
                'cert_type': cert.cert_type,
                'expiry_date': cert.expiry_date.isoformat(),
                'days_until_expiry': (cert.expiry_date - now.date()).days
            })

        # 4. Customer Health Alerts
        from app.models.analytics import CustomerHealthScore

        at_risk_customers = self.db.query(CustomerHealthScore).filter(
            CustomerHealthScore.churn_risk > 0.5
        ).all()

        for score in at_risk_customers:
            alerts.append({
                'type': 'CUSTOMER_AT_RISK',
                'org_id': score.org_id,
                'overall_score': score.overall_score,
                'churn_risk': float(score.churn_risk),
                'health_status': score.health_status
            })

        logger.info(f"Generated {len(alerts)} alerts")

        # In production, would send these alerts via email, SMS, or push notification
        # For now, just log them

        for alert in alerts[:10]:  # Log first 10
            logger.warning(f"Alert: {alert}")

        return {
            'status': 'completed',
            'total_alerts': len(alerts),
            'churn_alerts': critical_churn_count,
            'unfilled_shift_alerts': len(unfilled_shifts),
            'certification_alerts': len(expiring_certs),
            'customer_risk_alerts': len(at_risk_customers),
            'completed_at': datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Daily alerts generation failed: {e}")
        raise


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.prediction_tasks.analyze_shift_patterns')
def analyze_shift_patterns(self):
    """
    Analyze historical shift patterns to identify difficult-to-fill times

    Runs weekly to update pattern analysis
    """
    try:
        logger.info("Starting shift pattern analysis")

        from app.services.shift_prediction_service import HistoricalPatternAnalyzer

        # Analyze patterns for each organization
        organizations = self.db.query(Organization).filter(Organization.is_active == True).all()

        patterns = []

        for org in organizations:
            try:
                difficult_patterns = HistoricalPatternAnalyzer.identify_difficult_to_fill_patterns(
                    db=self.db,
                    threshold=0.7,  # <70% fill rate considered difficult
                    org_id=org.org_id
                )

                patterns.append({
                    'org_id': org.org_id,
                    'difficult_hours': difficult_patterns['difficult_hours'],
                    'difficult_days': difficult_patterns['difficult_days'],
                    'difficult_sites_count': len(difficult_patterns['difficult_sites'])
                })

                logger.info(
                    f"Org {org.org_id} difficult patterns: "
                    f"{len(difficult_patterns['difficult_hours'])} hours, "
                    f"{len(difficult_patterns['difficult_days'])} days, "
                    f"{len(difficult_patterns['difficult_sites'])} sites"
                )

            except Exception as e:
                logger.error(f"Error analyzing patterns for org {org.org_id}: {e}")

        return {
            'status': 'completed',
            'organizations_analyzed': len(organizations),
            'patterns': patterns,
            'completed_at': datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Pattern analysis failed: {e}")
        raise
