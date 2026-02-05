"""Geofence validation utilities using Haversine formula."""

import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS points in meters using Haversine formula.

    Args:
        lat1: Latitude of first point (decimal degrees)
        lon1: Longitude of first point (decimal degrees)
        lat2: Latitude of second point (decimal degrees)
        lon2: Longitude of second point (decimal degrees)

    Returns:
        Distance in meters
    """
    # Earth radius in meters
    R = 6371000

    # Convert decimal degrees to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    # Haversine formula
    a = (
        math.sin(delta_lat / 2) ** 2 +
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c
    return distance


def validate_geofence(
    employee_lat: float,
    employee_lng: float,
    gps_accuracy: float,
    center_lat: float,
    center_lng: float,
    radius_meters: int
) -> dict:
    """
    Validate if employee GPS position is within site geofence.

    Uses graduated validation logic:
    - distance <= radius: "inside" (auto-approve)
    - distance <= radius + accuracy: "inside" (GPS uncertainty accounts for it)
    - distance > radius + accuracy: "outside"
    - gps_accuracy > 50: raise ValueError (too imprecise per research pitfall #3)

    Args:
        employee_lat: Employee's GPS latitude
        employee_lng: Employee's GPS longitude
        gps_accuracy: GPS accuracy in meters (horizontal accuracy)
        center_lat: Geofence center latitude
        center_lng: Geofence center longitude
        radius_meters: Geofence radius in meters

    Returns:
        dict with:
        - inside: bool (within radius + accuracy buffer)
        - distance: float (meters from center)
        - accuracy: float (GPS accuracy in meters)
        - effective_radius: float (radius + accuracy buffer)

    Raises:
        ValueError: If gps_accuracy > 50 meters (too imprecise)
    """
    # Validate GPS accuracy
    if gps_accuracy > 50:
        raise ValueError(
            f"GPS accuracy too low ({gps_accuracy}m > 50m threshold). "
            "Cannot reliably validate geofence. Ask employee to move to better GPS reception."
        )

    # Calculate distance from employee to geofence center
    distance = haversine_distance(employee_lat, employee_lng, center_lat, center_lng)

    # Effective radius includes GPS accuracy buffer
    effective_radius = radius_meters + gps_accuracy

    # Determine if inside
    inside = distance <= effective_radius

    return {
        "inside": inside,
        "distance": distance,
        "accuracy": gps_accuracy,
        "effective_radius": effective_radius
    }
