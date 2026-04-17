"""
FastAPI Application
Main API endpoints for claim validation and fraud detection
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
import logging
from src.config import settings
from src.trigger_engine import TriggerEngine, EnvironmentalData
from src.ml_models import MLModelManager
from src.fraud_detector import ClaimFraudDetector, ClaimStatus
from src.services import WeatherService, LocationValidator, PolicyValidator
from src.risk_engine import calculate_risk_score, update_risk_history, classify_zone, get_location_id, simulate_realistic_weather
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AGESIS AI - Parametric Micro-Insurance API",
    description="ML-powered fraud detection and claim validation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services
model_manager = MLModelManager(settings.model_path)
fraud_detector = ClaimFraudDetector(model_manager)
weather_service = WeatherService()
trigger_engine = TriggerEngine()

# Try to load pre-trained models
model_manager.load_models()


@app.on_event("startup")
async def startup_event():
    """Log startup and confirm model loading"""
    logger.info("Starting AGESIS AI Microservice...")
    logger.info("Loading ML models...")
    # Models are already loaded above, but log confirmation
    model_status = model_manager.get_model_status()
    logger.info(f"Model loading status: {model_status}")
    logger.info("AGESIS AI Microservice started successfully.")


# ==================== Request/Response Models ====================

class WeatherDataRequest(BaseModel):
    """Request model for weather check"""
    latitude: float
    longitude: float


class ClaimValidationRequest(BaseModel):
    """Request model for claim validation"""
    user_id: str
    user_plan: str
    user_zone: str
    user_registered_latitude: float
    user_registered_longitude: float
    
    claim_latitude: float
    claim_longitude: float
    claim_timestamp: str  # ISO format datetime
    
    rainfall_mm_hr: float = 0
    temperature_celsius: float = 0
    aqi: int = 0
    flood_alert: Optional[str] = None
    
    claims_this_week: int = 0
    
    # Optional fields
    transaction_data: Optional[Dict] = None
    behavioral_data: Optional[Dict] = None
    event_timestamp: Optional[str] = None
    previous_gps_locations: Optional[List[tuple]] = None


class PredictClaimRequest(BaseModel):
    """Request model for claim prediction/fraud detection"""
    user_id: str
    user_plan: str
    user_zone: str
    user_registered_latitude: float
    user_registered_longitude: float
    
    claim_latitude: float
    claim_longitude: float
    claim_timestamp: str  # ISO format
    
    # Environmental data
    rainfall_mm_hr: float = 0
    temperature_celsius: float = 0
    aqi: int = 0
    flood_alert: Optional[str] = None
    
    # Policy data
    claims_this_week: int = 0
    
    # ML features
    transaction_amount: Optional[float] = None
    old_balance_org: Optional[float] = None
    new_balance_orig: Optional[float] = None
    
    claim_frequency: Optional[int] = None
    gps_jump: Optional[float] = None
    city_match: Optional[float] = None
    network_status: Optional[float] = None
    response_time: Optional[float] = None
    
    event_timestamp: Optional[str] = None


class TriggerCheckResponse(BaseModel):
    """Response model for trigger check"""
    is_valid: bool
    active_triggers: List[str]
    triggered_thresholds: List[str]
    details: Dict


class FraudDetectionResponse(BaseModel):
    """Response model for fraud detection"""
    status: str  # APPROVED, REJECTED, SUSPICIOUS, LIMIT_EXCEEDED
    risk_score: float
    zone: str
    fraud_score: float
    trigger_type: Optional[str]
    reasons: List[str]
    details: Dict


# ==================== Health & Status Endpoints ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AGESIS AI - Parametric Micro-Insurance",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "AGESIS AI"
    }


@app.get("/simulate-weather")
async def simulate_weather():
    """
    Simulate realistic weather conditions for testing
    
    Returns:
        Simulated weather data with risk score
    """
    weather = simulate_realistic_weather()
    risk_score = calculate_risk_score(weather)
    
    return {
        "weather": weather,
        "risk_score": risk_score
    }


# ==================== Trigger & Environmental Endpoints ====================

@app.post("/trigger-check", response_model=TriggerCheckResponse)
async def check_environmental_trigger(
    plan: str,
    zone: str,
    rainfall_mm_hr: float = 0,
    temperature_celsius: float = 0,
    aqi: int = 0,
    flood_alert: Optional[str] = None
):
    """
    Check if environmental conditions meet trigger thresholds
    
    Args:
        plan: Insurance plan (basic, standard, premium, essential)
        zone: Risk zone (low_risk, high_risk)
        rainfall_mm_hr: Rainfall in mm/hr
        temperature_celsius: Temperature in celsius
        aqi: Air Quality Index
        flood_alert: Flood alert level (govt_alert, severe_alert)
    
    Returns:
        TriggerCheckResponse with trigger details
    """
    try:
        env_data = EnvironmentalData(
            rainfall_mm_hr=rainfall_mm_hr,
            temperature_celsius=temperature_celsius,
            aqi=aqi,
            flood_alert=flood_alert
        )
        
        result = trigger_engine.check_triggers(plan, zone, env_data)
        
        return TriggerCheckResponse(
            is_valid=result.is_valid,
            active_triggers=[t.value for t in result.active_triggers],
            triggered_thresholds=result.triggered_thresholds,
            details=result.details
        )
    
    except Exception as e:
        logger.error(f"Error checking triggers: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/weather-check")
async def get_weather_data(request: WeatherDataRequest):
    """
    Fetch current weather and air quality data from OpenWeatherMap
    
    Args:
        latitude: GPS latitude
        longitude: GPS longitude
    
    Returns:
        Combined weather and AQI data
    """
    try:
        weather_data = await weather_service.fetch_combined_weather_data(
            request.latitude,
            request.longitude
        )
        
        if weather_data is None:
            raise HTTPException(status_code=500, detail="Failed to fetch weather data")
        
        return {
            "status": "success",
            "data": weather_data
        }
    
    except Exception as e:
        logger.error(f"Error fetching weather: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Fraud Detection Endpoints ====================

@app.post("/predict-claim")
async def predict_claim_fraud(request: PredictClaimRequest):
    """
    Complete claim validation and fraud detection
    
    Performs the following checks:
    1. Environmental trigger validation
    2. Location validation
    3. Time validation
    4. Policy constraints
    5. ML fraud detection (financial, movement, behavioral)
    
    Returns:
        Standardized response with decision and explanation
    """
    try:
        # Convert timestamps
        claim_timestamp = datetime.fromisoformat(request.claim_timestamp)
        event_timestamp = None
        if request.event_timestamp:
            event_timestamp = datetime.fromisoformat(request.event_timestamp)
        
        # Build environmental data
        environmental_data = {
            'rainfall_mm_hr': request.rainfall_mm_hr,
            'temperature_celsius': request.temperature_celsius,
            'aqi': request.aqi,
            'flood_alert': request.flood_alert
        }
        
        # Calculate risk score and update zone classification
        risk_score = calculate_risk_score(environmental_data)
        location_id = get_location_id(request.claim_latitude, request.claim_longitude)
        update_risk_history(location_id, risk_score)
        dynamic_zone = classify_zone(location_id)
        
        # Map dynamic zone to config zone format
        zone_mapping = {"LOW": "low_risk", "HIGH": "high_risk"}
        config_zone = zone_mapping.get(dynamic_zone, "low_risk")
        
        # Build transaction data
        transaction_data = {}
        if request.transaction_amount:
            transaction_data = {
                'amount': request.transaction_amount,
                'oldbalanceOrg': request.old_balance_org or 0,
                'newbalanceOrig': request.new_balance_orig or 0,
                'balance_change_org': (request.new_balance_orig or 0) - (request.old_balance_org or 0),
                'balance_change_dest': 0,
                'amount_ratio': request.transaction_amount / (request.old_balance_org or 1)
            }
        
        # Build behavioral data
        behavioral_data = {}
        if request.claim_frequency is not None:
            behavioral_data = {
                'claims_per_week': request.claim_frequency,
                'gps_jump': request.gps_jump or 0,
                'city_match': request.city_match or 0.5,
                'network_status': request.network_status or 0.5,
                'trigger_type': 1,  # Default
                'claim_amount': request.transaction_amount or 1000,
                'claim_frequency': request.claim_frequency,
                'response_time': request.response_time or 60,
                'day_of_week': claim_timestamp.weekday(),
                'time_of_day': claim_timestamp.hour,
                'day_sin': 0,
                'day_cos': 0,
                'hour_sin': 0,
                'hour_cos': 0,
                'is_weekend': 0,
                'is_night': 0
            }
        
        # Run fraud detection
        result = await fraud_detector.validate_and_detect_fraud(
            user_id=request.user_id,
            user_plan=request.user_plan,
            user_zone=config_zone,  # Use dynamically calculated zone
            user_registered_latitude=request.user_registered_latitude,
            user_registered_longitude=request.user_registered_longitude,
            claim_latitude=request.claim_latitude,
            claim_longitude=request.claim_longitude,
            claim_timestamp=claim_timestamp,
            environmental_data=environmental_data,
            claims_this_week=request.claims_this_week,
            transaction_data=transaction_data if transaction_data else None,
            behavioral_data=behavioral_data if behavioral_data else None,
            event_timestamp=event_timestamp
        )
        
        # Prepare standardized response
        data = {
            "status": result.status.value,
            "risk_score": risk_score,
            "zone": dynamic_zone,
            "fraud_score": result.fraud_score,
            "trigger_type": result.trigger_type or "NONE"
        }
        
        return {
            "success": True,
            "data": data,
            "message": "Claim processed successfully"
        }
    
    except Exception as e:
        logger.error(f"Error predicting claim: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/validate-location")
async def validate_location(
    user_lat: float,
    user_lon: float,
    registered_lat: float,
    registered_lon: float,
    tolerance_km: float = 10
):
    """
    Validate if user is within tolerance distance of registered city
    
    Returns:
        Location validation result with distance
    """
    try:
        location_validator = LocationValidator()
        is_valid, distance_km = location_validator.validate_location(
            user_lat,
            user_lon,
            registered_lat,
            registered_lon,
            tolerance_km
        )
        
        return {
            "is_valid": is_valid,
            "distance_km": distance_km,
            "tolerance_km": tolerance_km,
            "message": "Location verified" if is_valid else f"Location {distance_km:.2f}km away from registered city"
        }
    
    except Exception as e:
        logger.error(f"Error validating location: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/fraud-score/{user_id}")
async def get_user_fraud_score(user_id: str):
    """
    Get historical fraud score data for a user
    
    Note: This endpoint would connect to database in production
    """
    return {
        "user_id": user_id,
        "message": "User fraud history endpoint (requires database integration)"
    }


# ==================== Model Training Endpoints ====================

@app.post("/train-models")
async def train_all_models(background_tasks: BackgroundTasks):
    """
    Train all ML models in background
    
    Requires datasets to be present in ./datasets/
    """
    try:
        background_tasks.add_task(_train_models_background)
        
        return {
            "message": "Model training started in background",
            "status": "training"
        }
    
    except Exception as e:
        logger.error(f"Error starting training: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _train_models_background():
    """Background task for training models"""
    from src.dataset_generators import DatasetOrchestrator
    
    logger.info("Starting model training...")
    
    try:
        orchestrator = DatasetOrchestrator(settings.dataset_path)
        
        # Train behavioral fraud model
        logger.info("Training behavioral fraud model...")
        train_df, test_df, scaler = orchestrator.prepare_behavioral_dataset()
        metrics = model_manager.train_behavioral_fraud_model(train_df, test_df)
        logger.info(f"Behavioral model metrics: {metrics}")
        
        # Save models
        if model_manager.save_models():
            logger.info("Models saved successfully")
        else:
            logger.error("Failed to save models")
    
    except Exception as e:
        logger.error(f"Error during model training: {e}")


# ==================== Info Endpoints ====================

@app.get("/thresholds/{zone}")
async def get_thresholds(zone: str):
    """
    Get trigger thresholds for a risk zone
    
    Args:
        zone: Risk zone (low_risk or high_risk)
    
    Returns:
        Thresholds for all plans in the zone
    """
    from src.config import ZONE_THRESHOLDS
    
    zone_lower = zone.lower()
    
    if zone_lower not in ZONE_THRESHOLDS:
        raise HTTPException(status_code=404, detail=f"Zone {zone} not found")
    
    return {
        "zone": zone_lower,
        "thresholds": ZONE_THRESHOLDS[zone_lower]
    }


@app.get("/config")
async def get_configuration():
    """Get system configuration"""
    from src.config import MODEL_WEIGHTS, FRAUD_THRESHOLDS, MAX_CLAIMS_PER_WEEK
    
    return {
        "model_weights": MODEL_WEIGHTS,
        "fraud_thresholds": FRAUD_THRESHOLDS,
        "max_claims_per_week": MAX_CLAIMS_PER_WEEK,
        "environment": settings.env
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        log_level="info"
    )
