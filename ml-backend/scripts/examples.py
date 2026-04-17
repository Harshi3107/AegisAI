"""
Example Usage Scripts
Demonstrate how to use the ML backend for claim prediction
"""
import asyncio
from datetime import datetime
from src.ml_models import MLModelManager
from src.fraud_detector import ClaimFraudDetector
from src.trigger_engine import TriggerEngine, EnvironmentalData
from src.services import WeatherService, LocationValidator
from src.config import settings


async def example_1_basic_trigger_check():
    """Example 1: Basic environmental trigger checking"""
    print("\n" + "="*80)
    print("EXAMPLE 1: Environmental Trigger Checking")
    print("="*80)
    
    trigger_engine = TriggerEngine()
    
    # User with Low Risk + Premium plan
    env_data = EnvironmentalData(
        rainfall_mm_hr=60,
        temperature_celsius=43.5,
        aqi=395,
        flood_alert=None
    )
    
    result = trigger_engine.check_triggers("premium", "low_risk", env_data)
    
    print(f"Plan: Premium, Zone: Low Risk")
    print(f"Environmental Conditions:")
    print(f"  - Rainfall: {env_data.rainfall_mm_hr} mm/hr")
    print(f"  - Temperature: {env_data.temperature_celsius}°C")
    print(f"  - AQI: {env_data.aqi}")
    print(f"\nTrigger Valid: {result.is_valid}")
    print(f"Active Triggers: {[t.value for t in result.active_triggers]}")
    print(f"Triggered Thresholds:")
    for threshold in result.triggered_thresholds:
        print(f"  - {threshold}")


async def example_2_weather_fetching():
    """Example 2: Fetch real weather data"""
    print("\n" + "="*80)
    print("EXAMPLE 2: Fetching Weather Data")
    print("="*80)
    
    weather_service = WeatherService()
    
    # Mumbai coordinates
    latitude, longitude = 19.0760, 72.8777
    
    print(f"Fetching weather for: {latitude}, {longitude}")
    
    weather_data = await weather_service.fetch_weather_data(latitude, longitude)
    if weather_data:
        print("\nWeather Data:")
        for key, value in weather_data.items():
            print(f"  {key}: {value}")
    
    aqi_data = await weather_service.fetch_air_quality_data(latitude, longitude)
    if aqi_data:
        print("\nAir Quality Data:")
        for key, value in aqi_data.items():
            print(f"  {key}: {value}")


async def example_3_location_validation():
    """Example 3: Location validation"""
    print("\n" + "="*80)
    print("EXAMPLE 3: Location Validation")
    print("="*80)
    
    validator = LocationValidator()
    
    # Registered city: Mumbai
    registered_lat, registered_lon = 19.0760, 72.8777
    
    # Example 1: User is within city
    user_lat, user_lon = 19.0850, 72.8850  # ~10kg away
    
    is_valid, distance = validator.validate_location(
        user_lat, user_lon,
        registered_lat, registered_lon,
        tolerance_km=10
    )
    
    print(f"\nUser Location: {user_lat}, {user_lon}")
    print(f"Registered City: {registered_lat}, {registered_lon}")
    print(f"Distance: {distance:.2f} km")
    print(f"Valid (10km tolerance): {is_valid}")
    
    # Example 2: User is far from city
    user_lat2, user_lon2 = 20.0, 73.0  # ~100km away
    
    is_valid2, distance2 = validator.validate_location(
        user_lat2, user_lon2,
        registered_lat, registered_lon,
        tolerance_km=10
    )
    
    print(f"\nUser Location: {user_lat2}, {user_lon2}")
    print(f"Registered City: {registered_lat}, {registered_lon}")
    print(f"Distance: {distance2:.2f} km")
    print(f"Valid (10km tolerance): {is_valid2}")


async def example_4_complete_claim_validation():
    """Example 4: Complete claim validation and fraud detection"""
    print("\n" + "="*80)
    print("EXAMPLE 4: Complete Claim Validation & Fraud Detection")
    print("="*80)
    
    # Load models
    model_manager = MLModelManager(settings.model_path)
    if not model_manager.load_models():
        print("Warning: Models not loaded. Some features will be skipped.")
    
    fraud_detector = ClaimFraudDetector(model_manager)
    
    # Create a claim scenario
    claim_data = {
        "user_id": "user_12345",
        "user_plan": "premium",
        "user_zone": "low_risk",
        "user_registered_latitude": 19.0760,
        "user_registered_longitude": 72.8777,
        
        "claim_latitude": 19.0850,
        "claim_longitude": 72.8850,
        "claim_timestamp": datetime.utcnow(),
        
        "environmental_data": {
            "rainfall_mm_hr": 60,
            "temperature_celsius": 43.5,
            "aqi": 395,
            "flood_alert": None
        },
        
        "claims_this_week": 0,
        
        "transaction_data": {
            "amount": 2000,
            "oldbalanceOrg": 5000,
            "newbalanceOrig": 3000,
            "balance_change_org": -2000,
            "balance_change_dest": 2000,
            "amount_ratio": 0.4
        },
        
        "behavioral_data": {
            "claims_per_week": 1,
            "gps_jump": 0.15,
            "city_match": 0.95,
            "network_status": 0.8,
            "trigger_type": 1,
            "claim_amount": 2000,
            "claim_frequency": 1,
            "response_time": 45,
            "day_of_week": 2,
            "time_of_day": 14,
            "day_sin": 0.5,
            "day_cos": 0.866,
            "hour_sin": -0.95,
            "hour_cos": -0.31,
            "is_weekend": 0,
            "is_night": 0
        }
    }
    
    print(f"\nUser: {claim_data['user_id']}")
    print(f"Plan: {claim_data['user_plan']} | Zone: {claim_data['user_zone']}")
    print(f"Location: {claim_data['claim_latitude']}, {claim_data['claim_longitude']}")
    print(f"Claims this week: {claim_data['claims_this_week']}")
    
    # Run validation
    result = await fraud_detector.validate_and_detect_fraud(
        user_id=claim_data["user_id"],
        user_plan=claim_data["user_plan"],
        user_zone=claim_data["user_zone"],
        user_registered_latitude=claim_data["user_registered_latitude"],
        user_registered_longitude=claim_data["user_registered_longitude"],
        claim_latitude=claim_data["claim_latitude"],
        claim_longitude=claim_data["claim_longitude"],
        claim_timestamp=claim_data["claim_timestamp"],
        environmental_data=claim_data["environmental_data"],
        claims_this_week=claim_data["claims_this_week"],
        transaction_data=claim_data.get("transaction_data"),
        behavioral_data=claim_data.get("behavioral_data")
    )
    
    print(f"\n{'='*80}")
    print(f"CLAIM DECISION: {result.status.value}")
    print(f"{'='*80}")
    print(f"Fraud Score: {result.fraud_score:.2%}")
    print(f"Trigger Type: {result.trigger_type}")
    print(f"\nDecision Reasons:")
    for i, reason in enumerate(result.reasons, 1):
        print(f"  {i}. {reason}")
    
    if "individual_scores" in result.details:
        print(f"\nIndividual ML Scores:")
        for model, score in result.details["individual_scores"].items():
            print(f"  {model}: {score:.2%}")


async def example_5_fraud_risk_assessment():
    """Example 5: Individual fraud risk assessments"""
    print("\n" + "="*80)
    print("EXAMPLE 5: Individual ML Risk Assessments")
    print("="*80)
    
    model_manager = MLModelManager(settings.model_path)
    
    if not model_manager.load_models():
        print("Models not available. Please train models first.")
        return
    
    # Example transaction (suspicious)
    print("\n1. Financial Fraud Risk (Suspicious Transaction):")
    transaction_data = {
        "amount": 9000,  # High amount
        "oldbalanceOrg": 1000,  # Low balance
        "newbalanceOrig": -8000,  # Negative balance
        "balance_change_org": -9000,
        "balance_change_dest": 9000,
        "amount_ratio": 9.0
    }
    
    try:
        fraud_prob, confidence = model_manager.predict_financial_fraud(transaction_data)
        print(f"   Fraud Probability: {fraud_prob:.2%}")
        print(f"   Confidence: {confidence:.2%}")
    except Exception as e:
        print(f"   Skipped: {e}")
    
    # Example movement (anomalous)
    print("\n2. Movement Anomaly Risk (Jump in GPS):")
    movement_data = {
        "speed": 120.0,  # High speed
        "distance": 50.0,  # Large distance
        "speed_diff": 80.0,  # Large change
        "distance_per_speed": 0.4,
        "speed_rolling_std": 45.0  # High variability
    }
    
    try:
        anomaly_prob, raw_score = model_manager.predict_movement_anomaly(movement_data)
        print(f"   Anomaly Probability: {anomaly_prob:.2%}")
        print(f"   Raw Score: {raw_score:.4f}")
    except Exception as e:
        print(f"   Skipped: {e}")
    
    # Example behavior (suspicious)
    print("\n3. Behavioral Fraud Risk (Suspicious Claiming Pattern):")
    behavioral_data = {
        "claims_per_week": 5,  # High frequency
        "gps_jump": 0.8,  # Large jumps
        "city_match": 0.2,  # Low match
        "network_status": 0.3,  # Unstable
        "trigger_type": 0,  # No trigger
        "claim_amount": 10000,  # High amount
        "claim_frequency": 6,  # Frequent claims
        "response_time": 2,  # Very quick submission
        "day_of_week": 1,
        "time_of_day": 3,  # Off-peak
        "day_sin": 0.9,
        "day_cos": -0.43,
        "hour_sin": -0.998,
        "hour_cos": 0.06,
        "is_weekend": 0,
        "is_night": 1
    }
    
    try:
        fraud_prob, explanation = model_manager.predict_behavioral_fraud(behavioral_data)
        print(f"   Fraud Probability: {fraud_prob:.2%}")
        print(f"   Top Risk Factors:")
        for factor, importance in explanation["importance_scores"].items():
            print(f"     - {factor}: {importance:.4f}")
    except Exception as e:
        print(f"   Skipped: {e}")


async def main():
    """Run all examples"""
    print("\n" + "="*80)
    print("AGESIS AI - ML Backend Usage Examples")
    print("="*80)
    
    examples = [
        ("Environmental Trigger Checking", example_1_basic_trigger_check),
        ("Weather Data Fetching", example_2_weather_fetching),
        ("Location Validation", example_3_location_validation),
        ("Complete Claim Validation", example_4_complete_claim_validation),
        ("Individual ML Assessments", example_5_fraud_risk_assessment),
    ]
    
    for name, example_func in examples:
        try:
            await example_func()
        except Exception as e:
            print(f"\n✗ Error in {name}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*80)
    print("Examples completed!")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(main())
