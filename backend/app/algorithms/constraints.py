"""
Constraint checking utilities for roster generation.

This module provides functions to validate rostering constraints
such as skill matching, certification validity, rest periods, etc.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional


def check_skill_match(employee_skills: List[str], required_skill: str) -> bool:
    """
    Check if employee has required skill.

    Args:
        employee_skills: List of employee's skills
        required_skill: Required skill for shift

    Returns:
        True if employee has the skill
    """
    if not required_skill:
        return True
    return required_skill.lower() in [s.lower() for s in employee_skills]


def check_certification_validity(
    certifications: List[Dict],
    shift_date: datetime,
    required_cert_type: Optional[str] = None,
    skip_check: bool = False
) -> bool:
    """
    Check if employee has valid certifications for shift date.

    Args:
        certifications: List of employee certifications
        shift_date: Date of the shift
        required_cert_type: Optional specific certification type required
        skip_check: If True, skip certification validation (testing mode)

    Returns:
        True if certifications are valid
    """
    # Testing mode: skip certification check
    if skip_check:
        return True

    if required_cert_type:
        # Check specific certification
        for cert in certifications:
            if cert["cert_type"] == required_cert_type:
                if cert["expiry_date"] > shift_date.date():
                    if cert.get("verified", False):
                        return True
        return False

    # Check if any certifications are valid
    for cert in certifications:
        if cert["expiry_date"] > shift_date.date():
            return True

    # FIXED: Require at least one valid certification
    # Employees without certifications should not pass validation
    # In production, security guards must have PSIRA certification
    return False


def check_availability_overlap(
    availability: List[Dict],
    shift_start: datetime,
    shift_end: datetime
) -> bool:
    """
    Check if employee is available during shift time.

    Args:
        availability: List of employee availability records
        shift_start: Shift start datetime
        shift_end: Shift end datetime

    Returns:
        True if employee is available
    """
    shift_date = shift_start.date()

    for avail in availability:
        if avail["date"] == shift_date and avail["available"]:
            # Check time overlap
            avail_start = datetime.combine(shift_date, avail["start_time"])
            avail_end = datetime.combine(shift_date, avail["end_time"])

            # Shift must be fully within availability window
            if avail_start <= shift_start and shift_end <= avail_end:
                return True

    return False


def check_rest_period(
    last_shift_end: Optional[datetime],
    next_shift_start: datetime,
    min_rest_hours: int = 8
) -> bool:
    """
    Check if there's sufficient rest period between shifts.

    Args:
        last_shift_end: End time of last shift
        next_shift_start: Start time of next shift
        min_rest_hours: Minimum required rest hours

    Returns:
        True if rest period is sufficient
    """
    if last_shift_end is None:
        return True

    rest_duration = next_shift_start - last_shift_end
    rest_hours = rest_duration.total_seconds() / 3600

    return rest_hours >= min_rest_hours


def check_weekly_hours(
    current_hours: float,
    shift_hours: float,
    max_hours_week: int = 48
) -> bool:
    """
    Check if adding shift would exceed weekly hour limit.

    Args:
        current_hours: Hours already worked this week
        shift_hours: Duration of new shift in hours
        max_hours_week: Maximum allowed hours per week

    Returns:
        True if within limits
    """
    return (current_hours + shift_hours) <= max_hours_week


def check_distance_constraint(
    employee_location: Dict,
    site_location: Dict,
    max_distance_km: float = 50.0
) -> bool:
    """
    Check if distance between employee home and site is acceptable.

    Args:
        employee_location: Dict with 'lat' and 'lng' keys
        site_location: Dict with 'lat' and 'lng' keys
        max_distance_km: Maximum allowed distance in kilometers

    Returns:
        True if distance is acceptable
    """
    if not employee_location.get("lat") or not site_location.get("lat"):
        return True  # No location data, skip constraint

    distance = calculate_haversine_distance(
        employee_location["lat"],
        employee_location["lng"],
        site_location["lat"],
        site_location["lng"]
    )

    return distance <= max_distance_km


def calculate_haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """
    Calculate distance between two GPS coordinates using Haversine formula.

    Args:
        lat1: Latitude of point 1
        lon1: Longitude of point 1
        lat2: Latitude of point 2
        lon2: Longitude of point 2

    Returns:
        Distance in kilometers
    """
    from math import radians, sin, cos, sqrt, atan2

    R = 6371  # Earth's radius in kilometers

    lat1_rad = radians(lat1)
    lon1_rad = radians(lon1)
    lat2_rad = radians(lat2)
    lon2_rad = radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = sin(dlat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c
    return distance


def calculate_overtime_cost(
    total_hours: float,
    hourly_rate: float,
    max_regular_hours: int = 40,
    ot_multiplier: float = 1.5
) -> Dict[str, float]:
    """
    Calculate regular and overtime costs.

    Args:
        total_hours: Total hours worked
        hourly_rate: Base hourly rate
        max_regular_hours: Hours before overtime kicks in
        ot_multiplier: Overtime rate multiplier

    Returns:
        Dict with 'regular_cost', 'overtime_cost', 'total_cost'
    """
    if total_hours <= max_regular_hours:
        return {
            "regular_hours": total_hours,
            "overtime_hours": 0,
            "regular_cost": total_hours * hourly_rate,
            "overtime_cost": 0,
            "total_cost": total_hours * hourly_rate
        }

    regular_hours = max_regular_hours
    overtime_hours = total_hours - max_regular_hours

    regular_cost = regular_hours * hourly_rate
    overtime_cost = overtime_hours * hourly_rate * ot_multiplier
    total_cost = regular_cost + overtime_cost

    return {
        "regular_hours": regular_hours,
        "overtime_hours": overtime_hours,
        "regular_cost": regular_cost,
        "overtime_cost": overtime_cost,
        "total_cost": total_cost
    }
