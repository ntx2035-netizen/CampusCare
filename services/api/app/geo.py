from math import atan2, cos, radians, sin, sqrt

from app.config import get_settings


def distance_from_campus_meters(latitude: float, longitude: float) -> float:
    """Tính khoảng cách đường chim bay tới tâm ICTU bằng công thức Haversine."""
    settings = get_settings()
    earth_radius = 6_371_000
    lat1 = radians(settings.campus_center_latitude)
    lat2 = radians(latitude)
    delta_lat = radians(latitude - settings.campus_center_latitude)
    delta_lng = radians(longitude - settings.campus_center_longitude)
    value = sin(delta_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(delta_lng / 2) ** 2
    return earth_radius * 2 * atan2(sqrt(value), sqrt(1 - value))


def is_in_campus_scope(latitude: float, longitude: float) -> bool:
    return distance_from_campus_meters(latitude, longitude) <= get_settings().campus_radius_meters
