import math

EARTH_RADIUS_KM = 6371.0088
# Радиус оповещения подписчиков о новом месте гибели (из кейса), как NOTIFY_RADIUS_KM во фронте.
NOTIFY_RADIUS_KM = 20


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Расстояние по дуге большого круга (Haversine). PostGIS не нужен."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
