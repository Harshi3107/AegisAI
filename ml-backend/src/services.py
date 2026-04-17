"""
External Services Integration
- Weather Data from OpenWeatherMap
- Location Validation
- Policy Validation
"""
import aiohttp
import asyncio
from typing import Dict, Optional, Tuple
from datetime import datetime
import math
from src.config import settings, LOCATION_TOLERANCE_KM, MAX_CLAIMS_PER_WEEK
import logging

logger = logging.getLogger(__name__)


class WeatherService:
    """Fetch weather and air quality data from OpenWeatherMap"""
    
    BASE_URL = "https://api.openweathermap.org"
    WEATHER_ENDPOINT = "/data/2.5/weather"
    POLLUTION_ENDPOINT = "/data/2.5/air_pollution"
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.openweather_api_key
    
    async def fetch_weather_data(self, latitude: float, longitude: float) -> Optional[Dict]:
        """
        Fetch current weather data
        
        Returns:
        {
            "temperature_celsius": float,
            "rainfall_mm_hr": float,
            "description": str,
            "timestamp": str
        }
        """
        try:
            url = f"{self.BASE_URL}{self.WEATHER_ENDPOINT}"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key,
                "units": "metric"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Extract temperature
                        temp = data.get("main", {}).get("temp", 0)
                        
                        # Extract rainfall (rain in last 1hr)
                        rain = data.get("rain", {}).get("1h", 0)
                        
                        return {
                            "temperature_celsius": temp,
                            "rainfall_mm_hr": rain,
                            "description": data.get("weather", [{}])[0].get("description", ""),
                            "timestamp": datetime.utcnow().isoformat(),
                            "location": {
                                "latitude": latitude,
                                "longitude": longitude
                            }
                        }
        except Exception as e:
            logger.error(f"Error fetching weather data: {e}")
        
        return None
    
    async def fetch_air_quality_data(self, latitude: float, longitude: float) -> Optional[Dict]:
        """
        Fetch air pollution data (AQI)
        
        Returns:
        {
            "aqi": int (1-5),
            "pm25": float,
            "pm10": float,
            "no2": float,
            "o3": float,
            "timestamp": str
        }
        """
        try:
            url = f"{self.BASE_URL}{self.POLLUTION_ENDPOINT}"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        main = data.get("main", {})
                        components = data.get("components", {})
                        
                        # AQI: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
                        aqi = main.get("aqi", 3)
                        
                        # Convert AQI scale to 0-500 scale for comparison
                        aqi_value = self._convert_aqi_to_scale(aqi, components)
                        
                        return {
                            "aqi": aqi,
                            "aqi_value": aqi_value,
                            "pm25": components.get("pm2_5", 0),
                            "pm10": components.get("pm10", 0),
                            "no2": components.get("no2", 0),
                            "o3": components.get("o3", 0),
                            "timestamp": datetime.utcnow().isoformat()
                        }
        except Exception as e:
            logger.error(f"Error fetching air quality data: {e}")
        
        return None
    
    async def fetch_combined_weather_data(
        self,
        latitude: float,
        longitude: float,
        flood_alert: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Fetch combined weather and air quality data
        
        Returns environmental data ready for trigger engine
        """
        try:
            weather_data = await self.fetch_weather_data(latitude, longitude)
            aqi_data = await self.fetch_air_quality_data(latitude, longitude)
            
            if weather_data and aqi_data:
                return {
                    "rainfall_mm_hr": weather_data.get("rainfall_mm_hr", 0),
                    "temperature_celsius": weather_data.get("temperature_celsius", 0),
                    "aqi": aqi_data.get("aqi_value", 0),
                    "aqi_level": aqi_data.get("aqi", 3),
                    "pm25": aqi_data.get("pm25", 0),
                    "pm10": aqi_data.get("pm10", 0),
                    "flood_alert": flood_alert,
                    "timestamp": datetime.utcnow().isoformat(),
                    "weather_description": weather_data.get("description", "")
                }
        except Exception as e:
            logger.error(f"Error fetching combined data: {e}")
        
        return None
    
    @staticmethod
    def _convert_aqi_to_scale(aqi_level: int, components: Dict) -> int:
        """
        Convert AQI level (1-5) to scale (0-500)
        Uses PM2.5 as primary indicator
        """
        pm25 = components.get("pm2_5", 0)
        
        # AQI scale based on PM2.5 concentration
        if pm25 < 12:
            return 50  # Good (0-50)
        elif pm25 < 35.4:
            return 100  # Fair (51-100)
        elif pm25 < 55.4:
            return 150  # Moderate (101-150)
        elif pm25 < 150.4:
            return 200  # Poor (151-200)
        else:
            return min(500, 200 + (pm25 - 150.4) * 2)  # Very Poor (201-500)


class LocationValidator:
    """Validate user location against registered city"""
    
    @staticmethod
    def calculate_distance(
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate distance between two coordinates using Haversine formula
        
        Returns distance in kilometers
        """
        R = 6371  # Earth's radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    @staticmethod
    def validate_location(
        user_latitude: float,
        user_longitude: float,
        registered_latitude: float,
        registered_longitude: float,
        tolerance_km: float = LOCATION_TOLERANCE_KM
    ) -> Tuple[bool, float]:
        """
        Validate if user is within tolerance range of registered city
        
        Returns:
            Tuple of (is_valid, distance_km)
        """
        distance = LocationValidator.calculate_distance(
            user_latitude,
            user_longitude,
            registered_latitude,
            registered_longitude
        )
        
        is_valid = distance <= tolerance_km
        
        return is_valid, distance
    
    @staticmethod
    def validate_location_with_gps_history(
        current_latitude: float,
        current_longitude: float,
        previous_gps_locations: list,
        max_speed_kmh: float = 120
    ) -> Tuple[bool, float]:
        """
        Validate location based on GPS history and maximum possible speed
        
        Args:
            current_latitude: Current GPS latitude
            current_longitude: Current GPS longitude
            previous_gps_locations: List of previous (lat, lon, timestamp) tuples
            max_speed_kmh: Maximum realistic speed (default 120 km/h for vehicle)
        
        Returns:
            Tuple of (is_valid, speed_kmh)
        """
        if not previous_gps_locations:
            return True, 0.0
        
        # Get most recent location and time
        prev_lat, prev_lon, prev_time = previous_gps_locations[-1]
        current_time = datetime.utcnow()
        
        # Calculate time difference in hours
        time_diff_hours = (current_time - prev_time).total_seconds() / 3600
        
        if time_diff_hours <= 0:
            return True, 0.0
        
        # Calculate distance
        distance_km = LocationValidator.calculate_distance(
            prev_lat,
            prev_lon,
            current_latitude,
            current_longitude
        )
        
        # Calculate speed
        speed_kmh = distance_km / time_diff_hours
        
        # Validate
        is_valid = speed_kmh <= max_speed_kmh
        
        return is_valid, speed_kmh


class PolicyValidator:
    """Validate policy constraints for claims"""
    
    @staticmethod
    def validate_weekly_claim_limit(
        user_claims_this_week: int,
        max_claims: int = MAX_CLAIMS_PER_WEEK
    ) -> Tuple[bool, str]:
        """
        Validate if user has exceeded weekly claim limit
        
        Returns:
            Tuple of (is_valid, message)
        """
        if user_claims_this_week >= max_claims:
            return False, f"LIMIT_EXCEEDED: Maximum {max_claims} claims per week already exhausted"
        
        remaining = max_claims - user_claims_this_week
        return True, f"Valid: {remaining} claim(s) remaining this week"
    
    @staticmethod
    def validate_claim_timing(
        claim_timestamp: datetime,
        event_timestamp: datetime,
        max_hours: int = 24
    ) -> Tuple[bool, float]:
        """
        Validate if claim was submitted within reasonable time of event
        
        Args:
            claim_timestamp: When claim was submitted
            event_timestamp: When environmental event occurred
            max_hours: Maximum hours between event and claim submission
        
        Returns:
            Tuple of (is_valid, hours_elapsed)
        """
        time_diff = abs((claim_timestamp - event_timestamp).total_seconds() / 3600)
        is_valid = time_diff <= max_hours
        
        return is_valid, time_diff


class GeoIPService:
    """Optional: Validate location using IP address"""
    
    async def get_location_from_ip(self, ip_address: str) -> Optional[Dict]:
        """
        Get approximate location from IP address
        
        Free service: ip-api.com (no API key needed)
        Returns:
        {
            "latitude": float,
            "longitude": float,
            "city": str,
            "country": str
        }
        """
        try:
            url = f"http://ip-api.com/json/{ip_address}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get("status") == "success":
                            return {
                                "latitude": data.get("lat"),
                                "longitude": data.get("lon"),
                                "city": data.get("city"),
                                "country": data.get("country")
                            }
        except Exception as e:
            logger.error(f"Error fetching IP location: {e}")
        
        return None


if __name__ == "__main__":
    print("Services module loaded successfully")
