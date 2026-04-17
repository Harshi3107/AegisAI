"""Configuration for ML Backend"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API Keys
    openweather_api_key: str = "your_api_key_here"
    
    # Paths
    model_path: str = "./models"
    dataset_path: str = "./datasets"
    
    # Backend URLs
    node_backend_url: str = "http://localhost:5000"
    
    # Environment
    env: str = "development"
    
    # API Configuration
    api_port: int = 8000
    api_host: str = "0.0.0.0"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


# Trigger Thresholds Configuration
ZONE_THRESHOLDS = {
    "low_risk": {
        "basic": {
            "rain_mm_hr": 65,
            "heatwave_celsius": 45,
            "aqi": 430,
            "flood": "govt_alert"
        },
        "standard": {
            "rain_mm_hr": 60,
            "heatwave_celsius": 44,
            "aqi": 420,
            "flood": "govt_alert"
        },
        "premium": {
            "rain_mm_hr": 55,
            "heatwave_celsius": 43,
            "aqi": 400,
            "flood": "govt_alert"
        }
    },
    "high_risk": {
        "essential": {
            "rain_mm_hr": 75,
            "heatwave_celsius": 46,
            "aqi": 450,
            "flood": "severe_alert"
        },
        "standard": {
            "rain_mm_hr": 70,
            "heatwave_celsius": 45,
            "aqi": 430,
            "flood": "govt_alert"
        },
        "premium": {
            "rain_mm_hr": 65,
            "heatwave_celsius": 44,
            "aqi": 410,
            "flood": "govt_alert"
        }
    }
}

# ML Thresholds
FRAUD_THRESHOLDS = {
    "financial_fraud": 0.7,
    "movement_anomaly": 0.7,
    "behavior_anomaly": 0.7,
    "combined_score": 0.7
}

# Model Weights
MODEL_WEIGHTS = {
    "financial": 0.4,
    "movement": 0.3,
    "behavior": 0.3
}

# Location Validation
LOCATION_TOLERANCE_KM = 10

# Policy Constraints
MAX_CLAIMS_PER_WEEK = 2
