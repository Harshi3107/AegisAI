"""
Sample test cases for Risk Scoring Engine integration
"""
import requests
import json

# Base URL for the API
BASE_URL = "http://localhost:8000"

def test_risk_scoring():
    """Test the risk scoring integration"""

    # Sample claim data
    claim_data = {
        "user_id": "user123",
        "user_plan": "basic",
        "user_zone": "low_risk",  # This will be overridden by dynamic calculation
        "user_registered_latitude": 28.6139,  # Delhi
        "user_registered_longitude": 77.2090,
        "claim_latitude": 28.6139,
        "claim_longitude": 77.2090,
        "claim_timestamp": "2024-01-15T10:00:00",
        "rainfall_mm_hr": 60,
        "temperature_celsius": 40,
        "aqi": 200,
        "flood_alert": None,
        "claims_this_week": 0
    }

    try:
        response = requests.post(f"{BASE_URL}/predict-claim", json=claim_data)
        result = response.json()

        print("API Response:")
        print(json.dumps(result, indent=2))

        # Check for new fields
        assert "risk_score" in result, "risk_score missing from response"
        assert "zone" in result, "zone missing from response"
        assert "fraud_score" in result, "fraud_score present"

        print(f"✅ Risk Score: {result['risk_score']}")
        print(f"✅ Dynamic Zone: {result['zone']}")
        print(f"✅ Status: {result['status']}")

    except Exception as e:
        print(f"❌ Test failed: {e}")

def test_weather_simulation():
    """Test weather simulation endpoint"""

    try:
        response = requests.get(f"{BASE_URL}/simulate-weather")
        result = response.json()

        print("\nWeather Simulation:")
        print(json.dumps(result, indent=2))

        assert "weather" in result, "weather data missing"
        assert "risk_score" in result, "risk_score missing"

        print("✅ Simulation successful")

    except Exception as e:
        print(f"❌ Simulation test failed: {e}")

if __name__ == "__main__":
    print("Testing Risk Scoring Engine Integration")
    print("=" * 50)

    test_risk_scoring()
    test_weather_simulation()

    print("\n" + "=" * 50)
    print("Test completed. Make sure the API server is running on port 8000.")