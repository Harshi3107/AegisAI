# File Structure & Quick Reference

## 📂 Complete ML Backend Structure

```
AGESIS AI/
│
├── ml-backend/                          # Python ML Backend (NEW)
│   │
│   ├── src/
│   │   ├── __init__.py                 # Package initialization
│   │   ├── main.py                     # FastAPI application (12+ endpoints)
│   │   ├── config.py                   # Configuration & thresholds
│   │   ├── trigger_engine.py           # Environmental trigger validation (340 lines)
│   │   ├── ml_models.py                # ML model training & inference (560 lines)
│   │   ├── dataset_generators.py       # Dataset processing (550 lines)
│   │   ├── services.py                 # External services integration (400 lines)
│   │   └── fraud_detector.py           # Fraud detection orchestrator (380 lines)
│   │
│   ├── scripts/
│   │   ├── train_models.py             # Model training pipeline (~150 lines)
│   │   └── examples.py                 # 5 usage examples (~450 lines)
│   │
│   ├── models/                         # Trained models directory (created after training)
│   │   ├── financial_fraud_model.pkl
│   │   ├── financial_fraud_scaler.pkl
│   │   ├── movement_anomaly_model.pkl
│   │   ├── movement_anomaly_scaler.pkl
│   │   ├── behavioral_fraud_model.pkl
│   │   └── behavioral_fraud_scaler.pkl
│   │
│   ├── datasets/                       # Dataset storage directory
│   │
│   ├── requirements.txt                # Python dependencies (12 packages)
│   ├── .env.example                    # Environment variables template
│   ├── .renderignore                   # Render deployment ignore file
│   └── README.md                       # Comprehensive ML backend documentation
│
├── INTEGRATION_GUIDE.md                # Integration with Node.js backend (~600 lines)
├── DEPLOYMENT_GUIDE.md                 # Production deployment guide (~500 lines)
├── PROJECT_SUMMARY.md                  # This project summary
└── [existing backend/ and DevTrails/]
```

---

## 📋 File Descriptions & Purpose

### Core ML Modules

| File | Lines | Purpose |
|------|-------|---------|
| `src/main.py` | ~450 | FastAPI application with REST endpoints |
| `src/trigger_engine.py` | ~340 | Environmental trigger validation logic |
| `src/ml_models.py` | ~560 | ML model training and inference |
| `src/dataset_generators.py` | ~550 | Dataset preprocessing and generation |
| `src/services.py` | ~400 | External API integrations (weather, location) |
| `src/fraud_detector.py` | ~380 | Orchestrates complete fraud detection |
| `src/config.py` | ~180 | Configuration, thresholds, constants |

### Scripts & Tools

| File | Lines | Purpose |
|------|-------|---------|
| `scripts/train_models.py` | ~150 | Complete model training pipeline |
| `scripts/examples.py` | ~450 | 5 comprehensive usage examples |

### Configuration

| File | Purpose |
|------|---------|
| `requirements.txt` | Python dependencies |
| `.env.example` | Environment variables |
| `README.md` | ML backend documentation |

### Documentation

| File | Lines | Purpose |
|------|-------|---------|
| `INTEGRATION_GUIDE.md` | ~600 | How to integrate with Node.js |
| `DEPLOYMENT_GUIDE.md` | ~500 | Production deployment steps |
| `PROJECT_SUMMARY.md` | ~400 | This project overview |

---

## 🔑 Key Classes & Functions

### TriggerEngine (`trigger_engine.py`)
```python
class TriggerEngine:
  check_triggers(plan, zone, environmental_data)  # Main trigger check
  get_trigger_type(active_triggers)                # Get primary trigger
  validate_environmental_data(weather_dict)        # Validate weather data
```

### MLModelManager (`ml_models.py`)
```python
class MLModelManager:
  train_financial_fraud_model(train_df, test_df)
  train_movement_anomaly_model(train_df, test_df)
  train_behavioral_fraud_model(train_df, test_df)
  predict_financial_fraud(transaction_data)
  predict_movement_anomaly(movement_data)
  predict_behavioral_fraud(behavioral_data)
  save_models() / load_models()
```

### ClaimFraudDetector (`fraud_detector.py`)
```python
class ClaimFraudDetector:
  async validate_and_detect_fraud(
    user_id, user_plan, user_zone, coordinates,
    environmental_data, behavioral_data, ...
  ) -> FraudCheckResult
```

### WeatherService (`services.py`)
```python
class WeatherService:
  async fetch_weather_data(lat, lon)
  async fetch_air_quality_data(lat, lon)
  async fetch_combined_weather_data(lat, lon)

class LocationValidator:
  calculate_distance(lat1, lon1, lat2, lon2)
  validate_location(user_lat, user_lon, ...)
  validate_location_with_gps_history(...)

class PolicyValidator:
  validate_weekly_claim_limit(claims_count)
  validate_claim_timing(claim_time, event_time)
```

---

## 🌐 API Endpoints

### Health & Status
- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /models/status` - Model availability
- `GET /config` - System configuration
- `GET /thresholds/{zone}` - Zone thresholds

### Environmental
- `POST /trigger-check` - Check triggers
- `POST /weather-check` - Get weather data

### Claim Processing
- `POST /predict-claim` - **Main endpoint** (complete validation)
- `GET /validate-location` - Location validation
- `GET /fraud-score/{user_id}` - User fraud history

### Model Management
- `POST /train-models` - Trigger model retraining

---

## 📊 ML Models Summary

### Model 1: Financial Fraud Detection
- **Algorithm**: Random Forest Classifier
- **Features**: Amount, balance change, ratio metrics (6 features)
- **Dataset**: PaySim (financial transactions)
- **Training**: `train_models.py` → `train_financial_fraud_model()`
- **Inference**: `predict_financial_fraud()`
- **Output**: Probability (0-1)

### Model 2: Movement Anomaly Detection
- **Algorithm**: Isolation Forest
- **Features**: Speed, distance, variability (5 features)
- **Dataset**: T-Drive (GPS trajectories)
- **Training**: `train_models.py` → `train_movement_anomaly_model()`
- **Inference**: `predict_movement_anomaly()`
- **Output**: Anomaly probability (0-1)

### Model 3: Behavioral Fraud Detection
- **Algorithm**: Random Forest Classifier
- **Features**: Claims frequency, GPS jump, city match, timing, etc. (14 features)
- **Dataset**: Synthetically generated
- **Training**: `train_models.py` → `train_behavioral_fraud_model()`
- **Inference**: `predict_behavioral_fraud()`
- **Output**: Fraud probability (0-1) + Feature importance

---

## 🔄 Data Flow Diagram

```
User Submits Claim
        │
        ▼
Frontend (React) → POST /predict-claim to Backend
        │
        ▼
Node.js Backend calls ML Backend
        │
        ▼
FastAPI Receives POST /predict-claim
        │
        ├─→ TriggerEngine.check_triggers()
        │   ├─→ Validate rain threshold
        │   ├─→ Validate temperature
        │   ├─→ Validate AQI
        │   └─→ Validate flood alert
        │
        ├─→ LocationValidator.validate_location()
        │   └─→ Calculate Haversine distance
        │
        ├─→ PolicyValidator.validate_claim_timing()
        │   └─→ Check time constraints
        │
        ├─→ PolicyValidator.validate_weekly_claim_limit()
        │   └─→ Count claims this week
        │
        ├─→ MLModelManager.predict_financial_fraud()
        │   └─→ RandomForest inference
        │
        ├─→ MLModelManager.predict_movement_anomaly()
        │   └─→ IsolationForest inference
        │
        ├─→ MLModelManager.predict_behavioral_fraud()
        │   └─→ RandomForest + Feature importance
        │
        └─→ Combine scores (0.4*F + 0.3*M + 0.3*B)
                │
                ▼
            Decision: APPROVED / REJECTED / SUSPICIOUS / LIMIT_EXCEEDED
                │
                ▼
        FraudCheckResult with reasons
```

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
pip install -r ml-backend/requirements.txt

# Set up environment
cp ml-backend/.env.example ml-backend/.env
# Edit .env with OpenWeatherMap API key

# Train models
python ml-backend/scripts/train_models.py

# Start API server
cd ml-backend
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Run examples
python ml-backend/scripts/examples.py

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/docs  # Interactive API docs
```

---

## 📦 Dependencies

### Python Packages (requirements.txt)
```
fastapi==0.104.1
uvicorn==0.24.0
pandas==2.1.3
numpy==1.26.2
scikit-learn==1.3.2
joblib==1.3.2
requests==2.31.0
python-dotenv==1.0.0
pydantic==2.5.0
aiohttp==3.9.1
scipy==1.11.4
```

---

## 🔐 Configuration Keys

### Trigger Thresholds (`config.py`)
```python
ZONE_THRESHOLDS = {
    "low_risk": {...},
    "high_risk": {...}
}
```

### ML Weights & Thresholds
```python
MODEL_WEIGHTS = {
    "financial": 0.4,
    "movement": 0.3,
    "behavior": 0.3
}

FRAUD_THRESHOLDS = {
    "financial_fraud": 0.7,
    "movement_anomaly": 0.7,
    "behavior_anomaly": 0.7,
    "combined_score": 0.7
}
```

### Policy Constraints
```python
MAX_CLAIMS_PER_WEEK = 2
LOCATION_TOLERANCE_KM = 10
```

---

## 📚 Documentation Files

| Document | Content |
|----------|---------|
| `README.md` | ML backend setup, usage, API docs |
| `INTEGRATION_GUIDE.md` | Connecting with Node.js backend |
| `DEPLOYMENT_GUIDE.md` | Production deployment steps |
| `PROJECT_SUMMARY.md` | This complete overview |
| `FILE_STRUCTURE.md` | This file reference guide |

---

## 🎯 Integration Checklist

- [ ] Read `INTEGRATION_GUIDE.md`
- [ ] Create `mlService.js` in Node.js backend
- [ ] Update `claimsController.js` with ML validation
- [ ] Update `Claim` model with ML fields
- [ ] Update Frontend `api.js` with correct base URL
- [ ] Test endpoints locally
- [ ] Deploy to Render/Vercel using `DEPLOYMENT_GUIDE.md`
- [ ] Configure environment variables
- [ ] Test in production

---

## 📞 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Models not found | Run `python scripts/train_models.py` |
| API not starting | Check Python dependencies: `pip install -r requirements.txt` |
| Weather API errors | Verify OpenWeatherMap API key in `.env` |
| Integration issues | Follow `INTEGRATION_GUIDE.md` step-by-step |
| Deployment fails | Check `DEPLOYMENT_GUIDE.md` troubleshooting section |

---

## 📈 Next Steps

1. **Understand the system**: Read `PROJECT_SUMMARY.md`
2. **Set up locally**: Follow quick start commands above
3. **Review integration**: Read `INTEGRATION_GUIDE.md`
4. **Deploy**: Follow `DEPLOYMENT_GUIDE.md`
5. **Monitor**: Check Render/Vercel dashboards
6. **Maintain**: Set up backups and monitoring

---

**Document Version**: 1.0.0
**Last Updated**: January 2024
**Status**: ✅ Complete
