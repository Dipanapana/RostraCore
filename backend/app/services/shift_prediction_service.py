"""
Shift Fill Prediction Service
Predicts the probability that a shift will be filled based on historical patterns
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, case
import math

from app.models.shift import Shift
from app.models.employee import Employee
from app.models.availability import Availability
from app.models.site import Site


class ShiftFillPredictor:
    """
    Predicts shift fill probability using rule-based ML approach

    Factors considered:
    1. Historical fill rate for similar shifts (time of day, day of week)
    2. Number of available guards
    3. Number of qualified guards (certifications)
    4. Site difficulty (historical fill rate for this site)
    5. Lead time (how far in advance)
    6. Recent fill rate trend
    """

    @staticmethod
    def predict_shift_fill_probability(
        db: Session,
        shift_start: datetime,
        shift_end: datetime,
        site_id: int,
        required_certifications: Optional[List[str]] = None,
        org_id: Optional[int] = None
    ) -> Dict:
        """
        Predict probability that a shift will be filled

        Returns:
            {
                'fill_probability': float (0-1),
                'confidence': str ('high', 'medium', 'low'),
                'factors': {
                    'historical_fill_rate': float,
                    'available_guards': int,
                    'qualified_guards': int,
                    'site_difficulty': float,
                    'lead_time_days': int,
                    'recent_trend': str
                },
                'recommendation': str
            }
        """

        factors = {}

        # 1. Calculate historical fill rate for similar shifts
        # (same day of week, same time of day, last 90 days)
        day_of_week = shift_start.weekday()
        hour_of_day = shift_start.hour
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)

        similar_shifts = db.query(Shift).filter(
            Shift.start_time >= ninety_days_ago,
            Shift.start_time < datetime.utcnow(),
            extract('dow', Shift.start_time) == day_of_week,
            extract('hour', Shift.start_time) == hour_of_day,
            *([Shift.org_id == org_id] if org_id else [])
        )

        total_similar = similar_shifts.count()
        filled_similar = similar_shifts.filter(Shift.assigned_employee_id.isnot(None)).count()

        historical_fill_rate = (filled_similar / total_similar) if total_similar > 0 else 0.7
        factors['historical_fill_rate'] = round(historical_fill_rate, 2)
        factors['similar_shifts_analyzed'] = total_similar

        # 2. Count available guards on that day
        shift_date = shift_start.date()
        available_guards_count = db.query(func.count(Availability.availability_id)).join(
            Employee, Employee.employee_id == Availability.employee_id
        ).filter(
            Availability.date == shift_date,
            Availability.is_available == True,
            Employee.status == 'active',
            *([Employee.org_id == org_id] if org_id else [])
        ).scalar() or 0

        factors['available_guards'] = available_guards_count

        # 3. Count qualified guards (with required certifications)
        # Simplified: assume all active guards are qualified if no certs specified
        total_active_guards = db.query(func.count(Employee.employee_id)).filter(
            Employee.status == 'active',
            *([Employee.org_id == org_id] if org_id else [])
        ).scalar() or 1

        qualified_guards_count = available_guards_count  # Simplified
        factors['qualified_guards'] = qualified_guards_count

        # 4. Site difficulty (historical fill rate for this specific site)
        site_shifts = db.query(Shift).filter(
            Shift.site_id == site_id,
            Shift.start_time >= ninety_days_ago,
            Shift.start_time < datetime.utcnow()
        )

        total_site_shifts = site_shifts.count()
        filled_site_shifts = site_shifts.filter(Shift.assigned_employee_id.isnot(None)).count()

        site_fill_rate = (filled_site_shifts / total_site_shifts) if total_site_shifts > 0 else 0.7
        factors['site_difficulty'] = round(1.0 - site_fill_rate, 2)  # Lower fill rate = higher difficulty
        factors['site_fill_rate'] = round(site_fill_rate, 2)

        # 5. Lead time (days until shift)
        lead_time = (shift_start.date() - datetime.utcnow().date()).days
        factors['lead_time_days'] = max(lead_time, 0)

        # Lead time factor: more time = higher probability
        # 0 days = 0.5, 7+ days = 1.0
        lead_time_factor = min(1.0, 0.5 + (lead_time / 14))

        # 6. Recent trend (last 30 days fill rate)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_shifts = db.query(Shift).filter(
            Shift.start_time >= thirty_days_ago,
            Shift.start_time < datetime.utcnow(),
            *([Shift.org_id == org_id] if org_id else [])
        )

        total_recent = recent_shifts.count()
        filled_recent = recent_shifts.filter(Shift.assigned_employee_id.isnot(None)).count()

        recent_fill_rate = (filled_recent / total_recent) if total_recent > 0 else 0.7

        # Determine trend
        if recent_fill_rate > historical_fill_rate + 0.05:
            factors['recent_trend'] = 'improving'
            trend_factor = 1.1
        elif recent_fill_rate < historical_fill_rate - 0.05:
            factors['recent_trend'] = 'declining'
            trend_factor = 0.9
        else:
            factors['recent_trend'] = 'stable'
            trend_factor = 1.0

        # Calculate weighted probability
        # Weights: historical (40%), availability (30%), site (15%), lead time (10%), trend (5%)
        availability_factor = min(1.0, qualified_guards_count / 10)  # Assume need 10 guards max

        fill_probability = (
            historical_fill_rate * 0.40 +
            availability_factor * 0.30 +
            site_fill_rate * 0.15 +
            lead_time_factor * 0.10 +
            (recent_fill_rate * trend_factor) * 0.05
        )

        # Cap between 0 and 1
        fill_probability = max(0.0, min(1.0, fill_probability))

        # Determine confidence based on data availability
        if total_similar >= 20 and total_site_shifts >= 10:
            confidence = 'high'
        elif total_similar >= 10 or total_site_shifts >= 5:
            confidence = 'medium'
        else:
            confidence = 'low'

        # Generate recommendation
        if fill_probability >= 0.8:
            recommendation = 'High probability of filling. Standard scheduling recommended.'
        elif fill_probability >= 0.6:
            recommendation = 'Good probability. Consider scheduling 2-3 days in advance.'
        elif fill_probability >= 0.4:
            recommendation = 'Moderate risk. Schedule early and have backup guards identified.'
        else:
            recommendation = 'Low probability. Consider offering incentives or assigning preferred guards.'

        return {
            'fill_probability': round(fill_probability, 2),
            'fill_probability_percentage': round(fill_probability * 100, 1),
            'confidence': confidence,
            'factors': factors,
            'recommendation': recommendation
        }

    @staticmethod
    def predict_roster_success(
        db: Session,
        shifts: List[Dict],
        org_id: Optional[int] = None
    ) -> Dict:
        """
        Predict overall roster success for a set of shifts

        Args:
            shifts: List of shift dicts with start_time, end_time, site_id

        Returns:
            {
                'overall_fill_probability': float,
                'expected_fills': int,
                'high_risk_shifts': int,
                'shift_predictions': List[Dict]
            }
        """

        predictions = []
        total_prob = 0
        high_risk_count = 0

        for shift in shifts:
            pred = ShiftFillPredictor.predict_shift_fill_probability(
                db=db,
                shift_start=shift['start_time'],
                shift_end=shift['end_time'],
                site_id=shift['site_id'],
                org_id=org_id
            )

            predictions.append({
                'shift': shift,
                'prediction': pred
            })

            total_prob += pred['fill_probability']
            if pred['fill_probability'] < 0.5:
                high_risk_count += 1

        avg_prob = total_prob / len(shifts) if shifts else 0
        expected_fills = int(avg_prob * len(shifts))

        return {
            'overall_fill_probability': round(avg_prob, 2),
            'overall_fill_probability_percentage': round(avg_prob * 100, 1),
            'total_shifts': len(shifts),
            'expected_fills': expected_fills,
            'high_risk_shifts': high_risk_count,
            'shift_predictions': predictions[:10]  # Return first 10 detailed predictions
        }


class HistoricalPatternAnalyzer:
    """
    Analyzes historical patterns to identify trends and anomalies
    """

    @staticmethod
    def get_fill_rate_by_time_of_day(db: Session, org_id: Optional[int] = None) -> List[Dict]:
        """
        Get fill rate patterns by hour of day

        Returns:
            List of {hour: int, fill_rate: float, shift_count: int}
        """

        ninety_days_ago = datetime.utcnow() - timedelta(days=90)

        # Group shifts by hour
        results = []
        for hour in range(24):
            shifts = db.query(Shift).filter(
                Shift.start_time >= ninety_days_ago,
                extract('hour', Shift.start_time) == hour,
                *([Shift.org_id == org_id] if org_id else [])
            )

            total = shifts.count()
            filled = shifts.filter(Shift.assigned_employee_id.isnot(None)).count()

            fill_rate = (filled / total) if total > 0 else 0

            results.append({
                'hour': hour,
                'fill_rate': round(fill_rate, 2),
                'shift_count': total
            })

        return results

    @staticmethod
    def get_fill_rate_by_day_of_week(db: Session, org_id: Optional[int] = None) -> List[Dict]:
        """
        Get fill rate patterns by day of week

        Returns:
            List of {day: str, fill_rate: float, shift_count: int}
        """

        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        results = []
        for day_num, day_name in enumerate(days):
            shifts = db.query(Shift).filter(
                Shift.start_time >= ninety_days_ago,
                extract('dow', Shift.start_time) == day_num,
                *([Shift.org_id == org_id] if org_id else [])
            )

            total = shifts.count()
            filled = shifts.filter(Shift.assigned_employee_id.isnot(None)).count()

            fill_rate = (filled / total) if total > 0 else 0

            results.append({
                'day': day_name,
                'day_number': day_num,
                'fill_rate': round(fill_rate, 2),
                'shift_count': total
            })

        return results

    @staticmethod
    def identify_difficult_to_fill_patterns(
        db: Session,
        threshold: float = 0.7,
        org_id: Optional[int] = None
    ) -> Dict:
        """
        Identify patterns that are historically difficult to fill

        Returns:
            {
                'difficult_hours': List[int],
                'difficult_days': List[str],
                'difficult_sites': List[Dict],
                'overall_statistics': Dict
            }
        """

        # Get hourly patterns
        hourly = HistoricalPatternAnalyzer.get_fill_rate_by_time_of_day(db, org_id)
        difficult_hours = [h['hour'] for h in hourly if h['fill_rate'] < threshold and h['shift_count'] >= 5]

        # Get daily patterns
        daily = HistoricalPatternAnalyzer.get_fill_rate_by_day_of_week(db, org_id)
        difficult_days = [d['day'] for d in daily if d['fill_rate'] < threshold and d['shift_count'] >= 10]

        # Get site patterns
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        sites = db.query(
            Site.site_id,
            Site.name,
            func.count(Shift.shift_id).label('total'),
            func.sum(case((Shift.assigned_employee_id.isnot(None), 1), else_=0)).label('filled')
        ).join(Shift, Shift.site_id == Site.site_id).filter(
            Shift.start_time >= ninety_days_ago,
            *([Site.org_id == org_id] if org_id else [])
        ).group_by(Site.site_id, Site.name).all()

        difficult_sites = [
            {
                'site_id': s.site_id,
                'site_name': s.name,
                'fill_rate': round(s.filled / s.total, 2) if s.total > 0 else 0,
                'shift_count': s.total
            }
            for s in sites
            if s.total > 0 and (s.filled / s.total) < threshold
        ]

        return {
            'difficult_hours': difficult_hours,
            'difficult_days': difficult_days,
            'difficult_sites': difficult_sites,
            'threshold': threshold,
            'analysis_period_days': 90
        }
