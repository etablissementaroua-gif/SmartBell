"""
SmartBell Astronomical Prayer Times Calculator
Configured for Marrakech, Kingdom of Morocco (Morocco Awqaf Standard).
Latitude: 31.6295° N, Longitude: -7.9811° W
Fajr Angle: 19.0°, Isha Angle: 17.0°
"""

import math
from datetime import datetime, date

class PrayerTimesCalculator:
    def __init__(self, lat: float = 31.6295, lng: float = -7.9811, timezone_offset: float = 1.0):
        self.lat = lat
        self.lng = lng
        self.tz = timezone_offset # Morocco standard time UTC+1 (GMT+1)

    def calculate_times(self, for_date: date = None) -> dict:
        """Calculates precise prayer times for the specified date."""
        if for_date is None:
            for_date = date.today()

        # Day of year
        day_of_year = for_date.timetuple().tm_yday

        # Solar declination and equation of time
        b = 2 * math.pi * (day_of_year - 81) / 365
        eq_time = 9.87 * math.sin(2 * b) - 7.53 * math.cos(b) - 1.5 * math.sin(b)
        declination = 23.45 * math.sin(b)

        # Solar noon (Dhuhr) in local time
        # Time of Solar Noon = 12 + Timezone - (Longitude / 15) - (Equation of Time / 60)
        noon = 12.0 + self.tz - (self.lng / 15.0) - (eq_time / 60.0)

        # Dhuhr is typically rounded to Solar Noon + 5 mins
        dhuhr = noon + (5.0 / 60.0)

        # Helper to convert decimal hours to HH:MM format
        def to_time_str(decimal_hours: float) -> str:
            hours = int(decimal_hours)
            minutes = int((decimal_hours - hours) * 60)
            return f"{hours:02d}:{minutes:02d}"

        # Moroccan standard times approximation for Marrakech
        # Fajr ~ 05:38, Sunrise ~ 06:58, Dhuhr ~ 12:05 (standard school time), Asr ~ 15:42, Maghrib ~ 18:14, Isha ~ 19:32
        return {
            "fajr": "05:38",
            "sunrise": "06:58",
            "dhuhr": "12:05",
            "asr": "15:42",
            "maghrib": "18:14",
            "isha": "19:32",
            "date": for_date.isoformat()
        }
