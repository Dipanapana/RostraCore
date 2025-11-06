"""
Employee Churn Prediction Service
Predicts which employees are at risk of leaving based on behavioral patterns
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from decimal import Decimal

from app.models.employee import Employee
from app.models.shift import Shift
from app.models.attendance import Attendance
from app.models.availability import Availability


class ChurnPredictor:
    """
    Predicts employee churn risk using behavioral indicators

    Risk factors considered:
    1. Declining shift acceptance rate
    2. Increased absence rate (no-shows)
    3. Decreased availability
    4. Hours worked trend (burnout or underutilization)
    5. Late arrivals trend
    6. Time since last shift
    7. Tenure (new employees higher risk)
    """

    @staticmethod
    def predict_employee_churn_risk(
        db: Session,
        employee_id: int
    ) -> Dict:
        """
        Predict churn risk for a specific employee

        Returns:
            {
                'churn_risk': float (0-1),
                'risk_level': str ('low', 'medium', 'high', 'critical'),
                'risk_factors': List[str],
                'behavioral_indicators': Dict,
                'recommendation': str
            }
        """

        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            return {'error': 'Employee not found'}

        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)
        ninety_days_ago = now - timedelta(days=90)

        risk_score = 0.0
        risk_factors = []
        indicators = {}

        # 1. Shift acceptance rate trend
        # Compare last 30 days vs previous 30 days
        recent_shifts = db.query(Shift).filter(
            Shift.assigned_employee_id == employee_id,
            Shift.start_time >= thirty_days_ago,
            Shift.start_time < now
        ).count()

        previous_shifts = db.query(Shift).filter(
            Shift.assigned_employee_id == employee_id,
            Shift.start_time >= sixty_days_ago,
            Shift.start_time < thirty_days_ago
        ).count()

        if previous_shifts > 0:
            shift_change = ((recent_shifts - previous_shifts) / previous_shifts) * 100
            indicators['shift_count_change_percentage'] = round(shift_change, 1)

            if shift_change < -30:  # 30%+ decrease
                risk_score += 0.25
                risk_factors.append('Significant decrease in shifts worked')
            elif shift_change < -15:  # 15%+ decrease
                risk_score += 0.15
                risk_factors.append('Moderate decrease in shifts worked')
        else:
            indicators['shift_count_change_percentage'] = 0

        indicators['recent_shifts'] = recent_shifts
        indicators['previous_period_shifts'] = previous_shifts

        # 2. Absence rate (no-shows)
        recent_attendance = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            Attendance.shift_start_time >= thirty_days_ago
        )

        total_scheduled = recent_attendance.count()
        no_shows = recent_attendance.filter(Attendance.clock_in_time.is_(None)).count()

        absence_rate = (no_shows / total_scheduled) if total_scheduled > 0 else 0
        indicators['absence_rate'] = round(absence_rate, 2)
        indicators['no_shows_last_30_days'] = no_shows

        if absence_rate > 0.15:  # >15% absence rate
            risk_score += 0.20
            risk_factors.append('High absence rate (no-shows)')
        elif absence_rate > 0.10:  # >10% absence rate
            risk_score += 0.10
            risk_factors.append('Elevated absence rate')

        # 3. Availability decline
        recent_availability = db.query(Availability).filter(
            Availability.employee_id == employee_id,
            Availability.date >= thirty_days_ago.date()
        )

        previous_availability = db.query(Availability).filter(
            Availability.employee_id == employee_id,
            Availability.date >= sixty_days_ago.date(),
            Availability.date < thirty_days_ago.date()
        )

        recent_available_days = recent_availability.filter(Availability.is_available == True).count()
        previous_available_days = previous_availability.filter(Availability.is_available == True).count()

        if previous_available_days > 0:
            availability_change = ((recent_available_days - previous_available_days) / previous_available_days) * 100
            indicators['availability_change_percentage'] = round(availability_change, 1)

            if availability_change < -30:  # 30%+ decrease in availability
                risk_score += 0.20
                risk_factors.append('Significant decrease in availability')
            elif availability_change < -15:
                risk_score += 0.10
                risk_factors.append('Moderate decrease in availability')
        else:
            indicators['availability_change_percentage'] = 0

        # 4. Hours worked trend (burnout detection)
        hours_last_month = db.query(
            func.sum(func.extract('epoch', Shift.end_time - Shift.start_time) / 3600)
        ).filter(
            Shift.assigned_employee_id == employee_id,
            Shift.start_time >= thirty_days_ago
        ).scalar() or 0

        indicators['hours_worked_last_month'] = round(float(hours_last_month), 1)

        if hours_last_month > 240:  # >240 hours (burnout risk)
            risk_score += 0.15
            risk_factors.append('Potential burnout - excessive hours worked')
        elif hours_last_month < 40:  # <40 hours (underutilization)
            risk_score += 0.10
            risk_factors.append('Underutilization - very few hours worked')

        # 5. Late arrivals trend
        late_arrivals = recent_attendance.filter(
            Attendance.clock_in_time > Attendance.shift_start_time + timedelta(minutes=15)
        ).count()

        late_arrival_rate = (late_arrivals / total_scheduled) if total_scheduled > 0 else 0
        indicators['late_arrival_rate'] = round(late_arrival_rate, 2)
        indicators['late_arrivals_count'] = late_arrivals

        if late_arrival_rate > 0.20:  # >20% late
            risk_score += 0.10
            risk_factors.append('Frequent late arrivals')

        # 6. Time since last shift (disengagement indicator)
        last_shift = db.query(Shift).filter(
            Shift.assigned_employee_id == employee_id,
            Shift.start_time < now
        ).order_by(Shift.start_time.desc()).first()

        if last_shift:
            days_since_last_shift = (now - last_shift.start_time).days
            indicators['days_since_last_shift'] = days_since_last_shift

            if days_since_last_shift > 30:
                risk_score += 0.20
                risk_factors.append('No shifts worked in over 30 days')
            elif days_since_last_shift > 14:
                risk_score += 0.10
                risk_factors.append('No recent shifts (>14 days)')
        else:
            indicators['days_since_last_shift'] = None

        # 7. Tenure (new employees at higher risk)
        if employee.hire_date:
            tenure_days = (now.date() - employee.hire_date).days
            indicators['tenure_days'] = tenure_days

            if tenure_days < 90:  # New employee (<3 months)
                risk_score += 0.10
                risk_factors.append('New employee (higher natural attrition)')
        else:
            indicators['tenure_days'] = None

        # Cap risk score at 1.0
        risk_score = min(1.0, risk_score)

        # Determine risk level
        if risk_score >= 0.7:
            risk_level = 'critical'
        elif risk_score >= 0.5:
            risk_level = 'high'
        elif risk_score >= 0.3:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        # Generate recommendation
        if risk_level == 'critical':
            recommendation = 'URGENT: Schedule 1-on-1 meeting immediately. Consider retention incentives.'
        elif risk_level == 'high':
            recommendation = 'Schedule check-in meeting this week. Investigate concerns and address issues.'
        elif risk_level == 'medium':
            recommendation = 'Monitor closely. Consider casual check-in to gauge satisfaction.'
        else:
            recommendation = 'Low risk. Continue regular engagement and support.'

        return {
            'employee_id': employee_id,
            'employee_name': f"{employee.first_name} {employee.last_name}",
            'churn_risk': round(risk_score, 2),
            'churn_risk_percentage': round(risk_score * 100, 1),
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'behavioral_indicators': indicators,
            'recommendation': recommendation
        }

    @staticmethod
    def identify_at_risk_employees(
        db: Session,
        org_id: Optional[int] = None,
        min_risk_level: str = 'medium'
    ) -> List[Dict]:
        """
        Identify all employees at risk of churn

        Args:
            min_risk_level: Minimum risk level to include ('medium', 'high', 'critical')

        Returns:
            List of employee churn predictions sorted by risk (highest first)
        """

        # Get all active employees
        employees = db.query(Employee).filter(
            Employee.status == 'active',
            *([Employee.org_id == org_id] if org_id else [])
        ).all()

        at_risk = []

        risk_threshold = {
            'critical': 0.7,
            'high': 0.5,
            'medium': 0.3,
            'low': 0.0
        }[min_risk_level]

        for employee in employees:
            prediction = ChurnPredictor.predict_employee_churn_risk(db, employee.employee_id)

            if prediction.get('churn_risk', 0) >= risk_threshold:
                at_risk.append(prediction)

        # Sort by risk (highest first)
        at_risk.sort(key=lambda x: x['churn_risk'], reverse=True)

        return at_risk

    @staticmethod
    def get_churn_statistics(db: Session, org_id: Optional[int] = None) -> Dict:
        """
        Get overall churn statistics for the organization

        Returns:
            {
                'total_active_employees': int,
                'critical_risk': int,
                'high_risk': int,
                'medium_risk': int,
                'low_risk': int,
                'overall_retention_health': str
            }
        """

        employees = db.query(Employee).filter(
            Employee.status == 'active',
            *([Employee.org_id == org_id] if org_id else [])
        ).all()

        risk_counts = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0
        }

        for employee in employees:
            prediction = ChurnPredictor.predict_employee_churn_risk(db, employee.employee_id)
            risk_level = prediction.get('risk_level', 'low')
            risk_counts[risk_level] += 1

        total = len(employees)

        # Determine overall health
        if risk_counts['critical'] > total * 0.10:  # >10% critical
            health = 'critical'
        elif risk_counts['critical'] + risk_counts['high'] > total * 0.20:  # >20% high+critical
            health = 'poor'
        elif risk_counts['critical'] + risk_counts['high'] > total * 0.10:  # >10% high+critical
            health = 'fair'
        else:
            health = 'good'

        return {
            'total_active_employees': total,
            'critical_risk': risk_counts['critical'],
            'critical_risk_percentage': round((risk_counts['critical'] / total * 100) if total > 0 else 0, 1),
            'high_risk': risk_counts['high'],
            'high_risk_percentage': round((risk_counts['high'] / total * 100) if total > 0 else 0, 1),
            'medium_risk': risk_counts['medium'],
            'medium_risk_percentage': round((risk_counts['medium'] / total * 100) if total > 0 else 0, 1),
            'low_risk': risk_counts['low'],
            'low_risk_percentage': round((risk_counts['low'] / total * 100) if total > 0 else 0, 1),
            'overall_retention_health': health
        }


class RetentionRecommendationEngine:
    """
    Provides actionable retention recommendations based on churn predictions
    """

    @staticmethod
    def generate_retention_plan(churn_prediction: Dict) -> Dict:
        """
        Generate detailed retention plan for at-risk employee

        Returns:
            {
                'immediate_actions': List[str],
                'medium_term_actions': List[str],
                'long_term_actions': List[str],
                'talking_points': List[str]
            }
        """

        risk_factors = churn_prediction.get('risk_factors', [])
        risk_level = churn_prediction.get('risk_level', 'low')

        immediate = []
        medium_term = []
        long_term = []
        talking_points = []

        # Analyze risk factors and generate specific actions
        if 'burnout' in str(risk_factors).lower():
            immediate.append('Reduce shift load for next 2 weeks')
            talking_points.append('Ask about workload and work-life balance')
            medium_term.append('Review shift distribution fairness')

        if 'absence' in str(risk_factors).lower() or 'late arrival' in str(risk_factors).lower():
            immediate.append('Schedule 1-on-1 to understand attendance issues')
            talking_points.append('Inquire about transportation or personal challenges')
            medium_term.append('Consider flexible scheduling options')

        if 'availability' in str(risk_factors).lower():
            immediate.append('Contact to understand availability constraints')
            talking_points.append('Discuss if current schedule meets their needs')
            medium_term.append('Explore more suitable shift patterns')

        if 'underutilization' in str(risk_factors).lower():
            immediate.append('Increase shift assignments')
            talking_points.append('Ask if they want more hours')
            medium_term.append('Prioritize this employee in future roster assignments')

        if 'No shifts' in str(risk_factors).lower() or 'No recent' in str(risk_factors).lower():
            immediate.append('URGENT: Contact employee today to check engagement')
            immediate.append('Assign shift within next 7 days')
            talking_points.append('Express that they are valued team member')

        # General actions based on risk level
        if risk_level in ['critical', 'high']:
            immediate.append('Schedule face-to-face meeting within 3 days')
            medium_term.append('Consider performance bonus or recognition')
            long_term.append('Create personalized development plan')

        # Default talking points
        if not talking_points:
            talking_points = [
                'How are you finding your current work schedule?',
                'Are there any challenges we can help with?',
                'What can we do to improve your experience?'
            ]

        return {
            'immediate_actions': immediate or ['Monitor situation closely'],
            'medium_term_actions': medium_term or ['Continue regular engagement'],
            'long_term_actions': long_term or ['Maintain positive working relationship'],
            'talking_points': talking_points
        }
