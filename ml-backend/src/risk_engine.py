"""
Risk Scoring Engine
Calculates risk scores from environmental data and manages dynamic zone classification
"""
from typing import Dict, List, Optional
import random


# In-memory storage for risk history per location
# Format: {location_id: {"history": [last_5_risk_scores], "zone": "LOW" or "HIGH"}}
risk_storage: Dict[str, Dict] = {}


def calculate_risk_score(weather_data: Dict) -> float:
    """
    Calculate risk score from environmental data using Indian-specific thresholds

    Formula:
    - rain_score = min(rainfall_mm_hr / 80, 1)
    - temp_score = 0 if temp < 35, else min((temp - 35) / 10, 1)
    - aqi_score = 0 if aqi < 150, else min((aqi - 150) / 300, 1)
    - risk_score = (rain_score * 0.4) + (temp_score * 0.3) + (aqi_score * 0.3)

    Args:
        weather_data: Dict with keys 'rainfall_mm_hr', 'temperature_celsius', 'aqi'

    Returns:
        Risk score between 0.0 and 1.0
    """
    rainfall = weather_data.get('rainfall_mm_hr', 0)
    temp = weather_data.get('temperature_celsius', 0)
    aqi = weather_data.get('aqi', 0)

    # Rain score: normalized to 80mm/hr threshold
    rain_score = min(rainfall / 80, 1.0)

    # Temperature score: starts at 35°C
    if temp < 35:
        temp_score = 0.0
    else:
        temp_score = min((temp - 35) / 10, 1.0)

    # AQI score: starts at 150
    if aqi < 150:
        aqi_score = 0.0
    else:
        aqi_score = min((aqi - 150) / 300, 1.0)

    # Weighted combination
    risk_score = (rain_score * 0.4) + (temp_score * 0.3) + (aqi_score * 0.3)

    return round(risk_score, 3)


def update_risk_history(location_id: str, risk_score: float):
    """
    Update risk score history for a location, keeping only last 5 scores

    Args:
        location_id: Unique identifier for the location
        risk_score: New risk score to add
    """
    if location_id not in risk_storage:
        risk_storage[location_id] = {"history": [], "zone": "LOW"}

    history = risk_storage[location_id]["history"]
    history.append(risk_score)

    # Keep only last 5 scores
    if len(history) > 5:
        history.pop(0)


def classify_zone(location_id: str) -> str:
    """
    Classify zone based on average of last 5 risk scores with hysteresis

    Rules:
    - If avg_risk >= 0.50 → HIGH
    - If avg_risk <= 0.40 → LOW
    - Else → keep previous zone

    Args:
        location_id: Unique identifier for the location

    Returns:
        Zone classification: "LOW" or "HIGH"
    """
    if location_id not in risk_storage:
        return "LOW"

    history = risk_storage[location_id]["history"]
    if not history:
        return "LOW"

    avg_risk = sum(history) / len(history)
    current_zone = risk_storage[location_id]["zone"]

    if avg_risk >= 0.50:
        new_zone = "HIGH"
    elif avg_risk <= 0.40:
        new_zone = "LOW"
    else:
        new_zone = current_zone

    # Update stored zone
    risk_storage[location_id]["zone"] = new_zone

    return new_zone


def simulate_realistic_weather() -> Dict:
    """
    Simulate realistic weather conditions based on Indian datasets

    Ranges inspired by:
    - IMD Rainfall Dataset: 0-120 mm/hr
    - India AQI Dataset: 50-300
    - Typical Indian temperatures: 30-45°C

    Returns:
        Dict with 'rainfall_mm_hr', 'temperature_celsius', 'aqi'
    """
    rainfall_options = [0, 5, 10, 20, 50, 80, 120]
    temp_options = [30, 32, 35, 38, 40, 42, 45]
    aqi_options = [50, 80, 100, 150, 200, 250, 300]

    return {
        'rainfall_mm_hr': random.choice(rainfall_options),
        'temperature_celsius': random.choice(temp_options),
        'aqi': random.choice(aqi_options)
    }


def get_location_id(latitude: float, longitude: float) -> str:
    """
    Generate a location ID from coordinates

    Args:
        latitude: Latitude
        longitude: Longitude

    Returns:
        Location ID string
    """
    return f"{latitude:.2f}_{longitude:.2f}"


if __name__ == "__main__":
    # Test the functions
    print("Testing Risk Scoring Engine...")

    # Test calculate_risk_score
    test_weather = {'rainfall_mm_hr': 60, 'temperature_celsius': 40, 'aqi': 200}
    score = calculate_risk_score(test_weather)
    print(f"Risk score for {test_weather}: {score}")

    # Test simulation
    sim_weather = simulate_realistic_weather()
    print(f"Simulated weather: {sim_weather}")

    # Test history and classification
    loc_id = "12.34_56.78"
    for i in range(6):
        score = calculate_risk_score(sim_weather)
        update_risk_history(loc_id, score)
        zone = classify_zone(loc_id)
        print(f"Iteration {i+1}: Score {score}, Zone {zone}, History: {risk_storage[loc_id]['history']}")