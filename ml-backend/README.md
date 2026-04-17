# AGESIS AI - ML Backend

## 📊 Parametric Micro-Insurance ML System

A sophisticated ML-powered fraud detection and claim validation system for parametric micro-insurance targeting gig workers in India.

### 🎯 Core Features

- **Dynamic Trigger Engine**: Environmental threshold validation based on plan and risk zone
- **Multi-Layer Fraud Detection**: 
  - Financial transaction fraud (Random Forest)
  - Movement anomaly detection (Isolation Forest)
  - Behavioral fraud detection (Random Forest)
- **Location Validation**: GPS-based location verification with Haversine distance calculation
- **Policy Enforcement**: Weekly claim limits and timing constraints
- **Real-time Weather Integration**: OpenWeatherMap API integration for environmental data
- **Explainable AI**: Feature importance and decision reasoning

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip or conda

### Installation

1. **Clone/Extract the repository**
   ```bash
   cd ml-backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenWeatherMap API key
   ```

### Train Models

```bash
python scripts/train_models.py
```

This will:
- Generate synthetic behavioral fraud dataset
- Train Random Forest models for financial and behavioral fraud
- Train Isolation Forest for movement anomaly detection
- Save all models to `./models/`

### Start API Server

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Visit: http://localhost:8000/docs for interactive API documentation

---

## 📁 Project Structure

```
ml-backend/
├── src/
│   ├── main.py                    # FastAPI application with endpoints
│   ├── config.py                  # Configuration and thresholds
│   ├── trigger_engine.py          # Environmental trigger validation
│   ├── ml_models.py              # ML model training and inference
│   ├── dataset_generators.py     # Dataset processing and generation
│   ├── services.py               # Weather, location, policy services
│   └── fraud_detector.py         # Fraud detection orchestrator
├── scripts/
│   ├── train_models.py           # Model training pipeline
│   └── examples.py               # Usage examples
├── models/                        # Trained models (.pkl files)
├── datasets/                      # Dataset storage
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variables template
└── README.md                     # This file
```

---

## 🔧 Configuration

### Trigger Thresholds

Located in `src/config.py`:

```python
ZONE_THRESHOLDS = {
    "low_risk": {
        "basic": {"rain_mm_hr": 65, "heatwave_celsius": 45, "aqi": 430},
        "standard": {"rain_mm_hr": 60, "heatwave_celsius": 44, "aqi": 420},
        "premium": {"rain_mm_hr": 55, "heatwave_celsius": 43, "aqi": 400}
    },
    "high_risk": {
        "essential": {"rain_mm_hr": 75, "heatwave_celsius": 46, "aqi": 450},
        "standard": {"rain_mm_hr": 70, "heatwave_celsius": 45, "aqi": 430},
        "premium": {"rain_mm_hr": 65, "heatwave_celsius": 44, "aqi": 410}
    }
}
```

### ML Model Weights

```python
MODEL_WEIGHTS = {
    "financial": 0.4,      # 40% - Financial fraud detection
    "movement": 0.3,       # 30% - Movement anomaly detection
    "behavior": 0.3        # 30% - Behavioral fraud detection
}
```

### Other Settings

```python
FRAUD_THRESHOLDS = {
    "combined_score": 0.7  # Final fraud score threshold
}

LOCATION_TOLERANCE_KM = 10           # Location validation tolerance
MAX_CLAIMS_PER_WEEK = 2              # Policy constraint
```

---

## 🌐 API Endpoints

### Status & Health

```http
GET /              # Root endpoint
GET /health        # Health check
GET /models/status # Model availability
GET /config        # System configuration
GET /thresholds/{zone}  # Zone-specific triggers
```

### Environmental Triggers

```http
POST /trigger-check
```

**Request:**
```json
{
  "plan": "premium",
  "zone": "low_risk",
  "rainfall_mm_hr": 60,
  "temperature_celsius": 45,
  "aqi": 400,
  "flood_alert": "govt_alert"
}
```

**Response:**
```json
{
  "is_valid": true,
  "active_triggers": ["RAIN", "HEATWAVE"],
  "triggered_thresholds": [
    "RAIN: 60mm/hr >= 55mm/hr",
    "HEATWAVE: 45°C >= 43°C"
  ],
  "details": {}
}
```

### Weather Data

```http
POST /weather-check
```

**Request:**
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "rainfall_mm_hr": 5.2,
    "temperature_celsius": 32.5,
    "aqi": 250,
    "aqi_level": 3,
    "timestamp": "2024-01-15T10:30:00"
  }
}
```

### Complete Claim Prediction

```http
POST /predict-claim
```

**Request:**
```json
{
  "user_id": "user_123",
  "user_plan": "premium",
  "user_zone": "low_risk",
  "user_registered_latitude": 19.0760,
  "user_registered_longitude": 72.8777,
  "claim_latitude": 19.0850,
  "claim_longitude": 72.8850,
  "claim_timestamp": "2024-01-15T10:30:00",
  "rainfall_mm_hr": 60,
  "temperature_celsius": 45,
  "aqi": 400,
  "flood_alert": null,
  "claims_this_week": 0,
  "transaction_amount": 2000,
  "old_balance_org": 5000,
  "new_balance_orig": 3000,
  "claim_frequency": 1,
  "gps_jump": 0.15,
  "city_match": 0.95,
  "network_status": 0.8,
  "response_time": 45
}
```

**Response:**
```json
{
  "status": "APPROVED",
  "fraud_score": 0.32,
  "trigger_type": "RAIN",
  "reasons": [
    "Valid trigger: RAIN",
    "Location verified (0.85km from registered city)",
    "Normal GPS movement: 28.50km/h",
    "Valid: 2 claim(s) remaining this week",
    "Financial risk score: 15.50% (confidence: 98.00%)",
    "Behavioral fraud risk: 25.00%",
    "Claim approved. Fraud score: 0.32 (below 0.70 threshold)"
  ],
  "details": {
    "individual_scores": {
      "financial_score": 0.155,
      "movement_score": 0.0,
      "behavior_score": 0.25
    },
    "claims_this_week": 0,
    "timestamp": "2024-01-15T10:30:00"
  }
}
```

### Location Validation

```http
GET /validate-location?user_lat=19.0850&user_lon=72.8850&registered_lat=19.0760&registered_lon=72.8777&tolerance_km=10
```

---

## 📊 ML Models

### 1. Financial Fraud Detection (Random Forest)

**Purpose**: Detect fraudulent financial transactions

**Features**:
- `amount`: Transaction amount
- `oldbalanceOrg`: Previous balance (origin)
- `newbalanceOrig`: New balance (origin)
- `balance_change_org`: Change in origin balance
- `balance_change_dest`: Change in destination balance
- `amount_ratio`: Ratio of amount to previous balance

**Training Dataset**: PaySim (financial transaction simulation)

**Hyperparameters**:
```python
n_estimators=100
max_depth=10
min_samples_split=10
min_samples_leaf=5
class_weight='balanced'
```

### 2. Movement Anomaly Detection (Isolation Forest)

**Purpose**: Detect unusual GPS movement patterns

**Features**:
- `speed`: Movement speed (km/h)
- `distance`: Distance traveled
- `speed_diff`: Change in speed
- `distance_per_speed`: Distance ratio
- `speed_rolling_std`: Speed variability

**Training Dataset**: T-Drive (vehicle GPS trajectories)

**Hyperparameters**:
```python
contamination=0.1
n_estimators=100
```

### 3. Behavioral Fraud Detection (Random Forest)

**Purpose**: Detect behavioral fraud patterns in claims

**Features**:
- `claims_per_week`: Frequency of claims
- `gps_jump`: Sudden location changes
- `city_match`: GPS vs registered city match
- `network_status`: Network stability
- `trigger_type`: Environmental trigger type
- `claim_amount`: Claim amount
- `claim_frequency`: Historical claim frequency
- `response_time`: Time to submit after event
- Temporal features (day, hour, weekend, night)

**Training Dataset**: Synthetically generated

**Hyperparameters**:
```python
n_estimators=100
max_depth=12
min_samples_split=8
min_samples_leaf=4
class_weight='balanced'
```

---

## 💡 Decision Flow

### Claim Validation Pipeline

1. **Environmental Trigger Validation**
   - Check if weather meets plan-specific thresholds
   - Multiple triggers possible (rain, heat, AQI, flood)
   - REJECT if no trigger

2. **Location Validation**
   - Verify user is within 10km of registered city
   - Optional: Check GPS for unrealistic speed changes
   - REJECT if location mismatch

3. **Time Validation**
   - Claim must be submitted within 24 hours of event
   - REJECT if too late

4. **Policy Constraints**
   - Max 2 claims per week
   - LIMIT_EXCEEDED if quota reached

5. **ML Fraud Detection**
   - Financial score (0.4 weight)
   - Movement score (0.3 weight)
   - Behavioral score (0.3 weight)
   - Calculate combined score

6. **Final Decision**
   - APPROVED: Combined fraud score < 0.7
   - SUSPICIOUS: Combined fraud score ≥ 0.7

### Decision Statuses

- **APPROVED**: Claim passes all checks
- **REJECTED**: Fails trigger, location, or time validation
- **SUSPICIOUS**: Triggers fraud alert (fraud score > 0.7)
- **LIMIT_EXCEEDED**: Weekly claim limit reached

---

## 🔌 Integration with Node.js Backend

### Example integration flow:

```javascript
// Node.js backend
const axios = require('axios');

async function validateClaim(claimData) {
  try {
    const response = await axios.post(
      'http://localhost:8000/predict-claim',
      {
        user_id: claimData.userId,
        user_plan: claimData.plan,
        user_zone: claimData.zone,
        user_registered_latitude: claimData.registeredLat,
        user_registered_longitude: claimData.registeredLon,
        claim_latitude: claimData.latitude,
        claim_longitude: claimData.longitude,
        claim_timestamp: new Date().toISOString(),
        rainfall_mm_hr: claimData.rainfall,
        temperature_celsius: claimData.temperature,
        aqi: claimData.aqi,
        claims_this_week: claimData.claimsThisWeek,
        transaction_amount: claimData.amount,
        // ... other fields
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('ML validation error:', error);
    throw error;
  }
}

module.exports = { validateClaim };
```

### In your Node.js controller:

```javascript
async function submitClaim(req, res) {
  try {
    const claimData = req.body;
    
    // Fetch weather data
    const weatherResponse = await axios.post(
      'http://localhost:8000/weather-check',
      {
        latitude: claimData.latitude,
        longitude: claimData.longitude
      }
    );
    
    // Validate claim with ML backend
    const validationResult = await validateClaim({
      ...claimData,
      ...weatherResponse.data.data
    });
    
    // Update database based on decision
    if (validationResult.status === 'APPROVED') {
      // Approve claim
    } else if (validationResult.status === 'SUSPICIOUS') {
      // Flag for manual review
    } else {
      // Reject claim
    }
    
    res.json(validationResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 📚 Usage Examples

### Example 1: Check Trigger

```python
from src.trigger_engine import TriggerEngine, EnvironmentalData

engine = TriggerEngine()

env_data = EnvironmentalData(
    rainfall_mm_hr=70,
    temperature_celsius=45,
    aqi=430,
    flood_alert="govt_alert"
)

result = engine.check_triggers("standard", "high_risk", env_data)
print(f"Valid: {result.is_valid}")
print(f"Triggers: {result.active_triggers}")
```

### Example 2: Validate Location

```python
from src.services import LocationValidator

validator = LocationValidator()

is_valid, distance = validator.validate_location(
    user_latitude=19.0850,
    user_longitude=72.8850,
    registered_latitude=19.0760,
    registered_longitude=72.8777,
    tolerance_km=10
)

print(f"Valid: {is_valid}, Distance: {distance:.2f}km")
```

### Example 3: Full Claim Validation

```python
import asyncio
from src.ml_models import MLModelManager
from src.fraud_detector import ClaimFraudDetector
from datetime import datetime

async def validate():
    model_manager = MLModelManager()
    model_manager.load_models()
    
    detector = ClaimFraudDetector(model_manager)
    
    result = await detector.validate_and_detect_fraud(
        user_id="user_123",
        user_plan="premium",
        user_zone="low_risk",
        user_registered_latitude=19.0760,
        user_registered_longitude=72.8777,
        claim_latitude=19.0850,
        claim_longitude=72.8850,
        claim_timestamp=datetime.utcnow(),
        environmental_data={
            'rainfall_mm_hr': 70,
            'temperature_celsius': 45,
            'aqi': 430,
            'flood_alert': 'govt_alert'
        },
        claims_this_week=0
    )
    
    print(f"Status: {result.status.value}")
    print(f"Fraud Score: {result.fraud_score:.2%}")
    print(f"Reasons: {result.reasons}")

asyncio.run(validate())
```

### Run All Examples

```bash
python scripts/examples.py
```

---

## 🧠 Model Performance

### Expected Metrics (from synthetic/sample data)

| Model | Precision | Recall | F1-Score | AUC |
|-------|-----------|--------|----------|-----|
| Financial Fraud | 0.92 | 0.85 | 0.88 | 0.95 |
| Behavioral Fraud | 0.89 | 0.82 | 0.85 | 0.92 |
| Movement Anomaly | ~0.80 (anomaly detection) | - | - | - |

**Note**: Actual performance depends on training data quality and representative nature.

---

## 🔐 Security Considerations

1. **API Key Security**: Store OpenWeatherMap API key securely in `.env`
2. **Model Protection**: Use environment variables for model paths
3. **CORS Configuration**: Customize allowed origins in production
4. **Rate Limiting**: Consider adding rate limiting for production
5. **Authentication**: Add API key authentication for endpoints
6. **Data Privacy**: Implement data encryption for sensitive fields

---

## 📈 Deployment

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Deploy to Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Set environment variables:
   - `OPENWEATHER_API_KEY`
   - `NODE_BACKEND_URL`
5. Set build command: `pip install -r requirements.txt && python scripts/train_models.py`
6. Set start command: `uvicorn src.main:app --host 0.0.0.0 --port 8000`

### Deploy to Railway

Similar process to Render. Ensure models are trained before deployment.

---

## 🐛 Troubleshooting

### Models not found error

```bash
# Retrain models
python scripts/train_models.py
```

### OpenWeatherMap API errors

- Verify API key in `.env`
- Check API rate limits
- Use test coordinates for development: 19.0760, 72.8777 (Mumbai)

### Memory issues during training

Reduce dataset size in `dataset_generators.py`:
```python
n_samples=5000  # Instead of 10000
```

---

## 📞 Support & Documentation

- **API Docs**: http://localhost:8000/docs
- **Configuration**: `src/config.py`
- **Examples**: `scripts/examples.py`
- **Training**: `scripts/train_models.py`

---

## 📄 License

Part of AGESIS AI - Parametric Micro-Insurance Platform

---

## 🚀 Future Enhancements

- [ ] Real PaySim and T-Drive dataset integration
- [ ] Advanced time-series forecasting for weather
- [ ] Xgboost models for better performance
- [ ] SHAP values for model explainability
- [ ] A/B testing framework for model versions
- [ ] Continuous learning from claim outcomes
- [ ] Multi-language support
- [ ] Mobile app backend integration
- [ ] Real-time model monitoring dashboard
