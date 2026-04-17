"""
Trigger Engine - Dynamic Environmental Trigger System
Validates claims based on environmental thresholds, plan, and zone
"""
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from src.config import ZONE_THRESHOLDS


class TriggerType(Enum):
    """Trigger types"""
    RAIN = "RAIN"
    HEATWAVE = "HEATWAVE"
    AQI = "AQI"
    FLOOD = "FLOOD"
    NONE = "NONE"


@dataclass
class EnvironmentalData:
    """Environmental data structure"""
    rainfall_mm_hr: float
    temperature_celsius: float
    aqi: int
    flood_alert: Optional[str] = None
    

@dataclass
class ClaimValidation:
    """Claim validation result"""
    is_valid: bool
    triggered_thresholds: List[str]
    active_triggers: List[TriggerType]
    details: Dict[str, any]


class TriggerEngine:
    """Dynamic trigger system based on plan, zone, and environmental data"""
    
    def __init__(self):
        self.thresholds = ZONE_THRESHOLDS
    
    def check_triggers(
        self,
        plan: str,
        zone: str,
        environmental_data: EnvironmentalData
    ) -> ClaimValidation:
        """
        Check if environmental triggers are met based on user plan and zone
        
        Args:
            plan: User's insurance plan (basic, standard, premium, essential)
            zone: Risk zone (low_risk, high_risk)
            environmental_data: Current environmental conditions
            
        Returns:
            ClaimValidation object with trigger details
        """
        
        # Validate inputs
        zone = zone.lower()
        plan = plan.lower()
        
        if zone not in self.thresholds:
            return ClaimValidation(
                is_valid=False,
                triggered_thresholds=[],
                active_triggers=[],
                details={"error": f"Invalid zone: {zone}"}
            )
        
        if plan not in self.thresholds[zone]:
            return ClaimValidation(
                is_valid=False,
                triggered_thresholds=[],
                active_triggers=[],
                details={"error": f"Invalid plan {plan} for zone {zone}"}
            )
        
        # Get thresholds for user's plan and zone
        user_thresholds = self.thresholds[zone][plan]
        
        # Check triggers
        triggered_thresholds = []
        active_triggers = []
        details = {
            "rainfall_mm_hr": environmental_data.rainfall_mm_hr,
            "temperature_celsius": environmental_data.temperature_celsius,
            "aqi": environmental_data.aqi,
            "flood_alert": environmental_data.flood_alert
        }
        
        # Check rainfall
        if environmental_data.rainfall_mm_hr >= user_thresholds["rain_mm_hr"]:
            triggered_thresholds.append(
                f"RAIN: {environmental_data.rainfall_mm_hr}mm/hr >= {user_thresholds['rain_mm_hr']}mm/hr"
            )
            active_triggers.append(TriggerType.RAIN)
        
        # Check heatwave
        if environmental_data.temperature_celsius >= user_thresholds["heatwave_celsius"]:
            triggered_thresholds.append(
                f"HEATWAVE: {environmental_data.temperature_celsius}°C >= {user_thresholds['heatwave_celsius']}°C"
            )
            active_triggers.append(TriggerType.HEATWAVE)
        
        # Check AQI
        if environmental_data.aqi >= user_thresholds["aqi"]:
            triggered_thresholds.append(
                f"AQI: {environmental_data.aqi} >= {user_thresholds['aqi']}"
            )
            active_triggers.append(TriggerType.AQI)
        
        # Check flood
        required_flood_alert = user_thresholds.get("flood")
        if environmental_data.flood_alert and required_flood_alert:
            # Check if flood_alert meets the requirement
            alert_level = environmental_data.flood_alert.lower()
            required_level = required_flood_alert.lower()
            
            # Flood alert hierarchy: severe > govt
            alert_hierarchy = {"severe_alert": 2, "govt_alert": 1, "none": 0}
            
            alert_value = alert_hierarchy.get(alert_level, 0)
            required_value = alert_hierarchy.get(required_level, 0)
            
            if alert_value >= required_value:
                triggered_thresholds.append(
                    f"FLOOD: {environmental_data.flood_alert} meets requirement ({required_flood_alert})"
                )
                active_triggers.append(TriggerType.FLOOD)
        
        # Determine if claim is valid
        is_valid = len(active_triggers) > 0
        
        details["triggered_thresholds"] = triggered_thresholds
        details["active_triggers"] = [t.value for t in active_triggers]
        
        return ClaimValidation(
            is_valid=is_valid,
            triggered_thresholds=triggered_thresholds,
            active_triggers=active_triggers,
            details=details
        )
    
    def get_trigger_type(self, active_triggers: List[TriggerType]) -> TriggerType:
        """
        Get primary trigger type (in priority order)
        
        Args:
            active_triggers: List of active triggers
            
        Returns:
            Primary trigger type
        """
        priority = [TriggerType.FLOOD, TriggerType.HEATWAVE, TriggerType.RAIN, TriggerType.AQI]
        
        for trigger in priority:
            if trigger in active_triggers:
                return trigger
        
        return TriggerType.NONE
    
    def validate_environmental_data(self, weather_dict: Dict) -> Optional[EnvironmentalData]:
        """
        Validate and parse weather data from API response
        
        Args:
            weather_dict: Dictionary from OpenWeatherMap API
            
        Returns:
            EnvironmentalData object or None if invalid
        """
        try:
            rainfall = weather_dict.get("rainfall_mm_hr", 0)
            temperature = weather_dict.get("temperature_celsius", 0)
            aqi = weather_dict.get("aqi", 0)
            flood = weather_dict.get("flood_alert", None)
            
            return EnvironmentalData(
                rainfall_mm_hr=float(rainfall),
                temperature_celsius=float(temperature),
                aqi=int(aqi),
                flood_alert=flood
            )
        except (ValueError, TypeError):
            return None


# Example usage
if __name__ == "__main__":
    engine = TriggerEngine()
    
    # Example 1: Low Risk user with Premium plan
    env_data = EnvironmentalData(
        rainfall_mm_hr=60,
        temperature_celsius=43,
        aqi=395,
        flood_alert=None
    )
    
    result = engine.check_triggers("premium", "low_risk", env_data)
    print(f"Claim Valid: {result.is_valid}")
    print(f"Active Triggers: {result.active_triggers}")
    print(f"Details: {result.triggered_thresholds}")
    
    # Example 2: High Risk user with Standard plan
    env_data2 = EnvironmentalData(
        rainfall_mm_hr=72,
        temperature_celsius=45,
        aqi=435,
        flood_alert="govt_alert"
    )
    
    result2 = engine.check_triggers("standard", "high_risk", env_data2)
    print(f"\nClaim Valid: {result2.is_valid}")
    print(f"Active Triggers: {[t.value for t in result2.active_triggers]}")
    print(f"Triggered Thresholds: {result2.triggered_thresholds}")
