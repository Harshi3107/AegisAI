# Integration Guide: ML Backend with Node.js Backend

## Overview

This guide explains how to integrate the Python ML backend with the existing Node.js backend for the AGESIS AI platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (React/Vite)                     │
│                    on Vercel                                │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             ▼                                ▼
    ┌─────────────────┐          ┌──────────────────────┐
    │ Node.js Backend │◄--------►│   ML Backend         │
    │  (Express.js)   │          │   (FastAPI/Python)   │
    │  on Render      │          │   on Render          │
    └─────────────────┘          └──────────────────────┘
             │                           ▲
             │                           │
             ▼                     External APIs
        MongoDB              ┌─────────────────────┐
                            │ OpenWeatherMap API  │
                            │ GeoIP Services      │
                            └─────────────────────┘
```

## Setup Instructions

### 1. Deploy ML Backend to Render

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Add ML backend"
   git push origin main
   ```

2. **Create new Web Service on Render**
   - Go to https://render.com
   - Click "New +" > "Web Service"
   - Connect your GitHub repository
   - Select the `ml-backend` directory in build command

3. **Configure Environment Variables**
   ```
   OPENWEATHER_API_KEY=your_api_key
   NODE_BACKEND_URL=https://your-node-backend.onrender.com
   FASTAPI_ENV=production
   ```

4. **Set Build and Start Commands**
   - Build: `pip install -r requirements.txt && python scripts/train_models.py`
   - Start: `uvicorn src.main:app --host 0.0.0.0 --port ${PORT}`

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Copy the service URL (e.g., `https://agesis-ml.onrender.com`)

### 2. Update Node.js Backend

#### Update Environment Variables

Add to `.env` or `backend/.env`:

```env
ML_BACKEND_URL=https://agesis-ml.onrender.com
OPENWEATHER_API_KEY=your_api_key_here
```

#### Create ML Service Module

Create `backend/src/services/mlService.js`:

```javascript
const axios = require('axios');

class MLService {
  constructor() {
    this.mlBackendUrl = process.env.ML_BACKEND_URL || 'http://localhost:8000';
  }

  /**
   * Get weather data from ML backend
   */
  async getWeatherData(latitude, longitude) {
    try {
      const response = await axios.post(
        `${this.mlBackendUrl}/weather-check`,
        { latitude, longitude }
      );
      return response.data.data;
    } catch (error) {
      console.error('ML Backend - Weather error:', error.message);
      throw new Error('Failed to fetch weather data');
    }
  }

  /**
   * Check environmental triggers
   */
  async checkTrigger(plan, zone, rainfall, temperature, aqi, floodAlert) {
    try {
      const response = await axios.post(
        `${this.mlBackendUrl}/trigger-check`,
        {
          plan,
          zone,
          rainfall_mm_hr: rainfall,
          temperature_celsius: temperature,
          aqi,
          flood_alert: floodAlert
        }
      );
      return response.data;
    } catch (error) {
      console.error('ML Backend - Trigger check error:', error.message);
      throw new Error('Failed to check environmental trigger');
    }
  }

  /**
   * Validate location
   */
  async validateLocation(userLat, userLon, registeredLat, registeredLon) {
    try {
      const response = await axios.get(
        `${this.mlBackendUrl}/validate-location`,
        {
          params: {
            user_lat: userLat,
            user_lon: userLon,
            registered_lat: registeredLat,
            registered_lon: registeredLon,
            tolerance_km: 10
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('ML Backend - Location validation error:', error.message);
      throw new Error('Failed to validate location');
    }
  }

  /**
   * Predict claim fraud and get decision
   */
  async predictClaim(claimData) {
    try {
      const payload = {
        user_id: claimData.userId,
        user_plan: claimData.plan,
        user_zone: claimData.zone,
        user_registered_latitude: claimData.registeredLatitude,
        user_registered_longitude: claimData.registeredLongitude,
        claim_latitude: claimData.latitude,
        claim_longitude: claimData.longitude,
        claim_timestamp: new Date(claimData.timestamp).toISOString(),
        rainfall_mm_hr: claimData.rainfall || 0,
        temperature_celsius: claimData.temperature || 0,
        aqi: claimData.aqi || 0,
        flood_alert: claimData.floodAlert || null,
        claims_this_week: claimData.claimsThisWeek || 0,
        transaction_amount: claimData.amount,
        old_balance_org: claimData.oldBalance || 0,
        new_balance_orig: claimData.newBalance || 0,
        claim_frequency: claimData.claimFrequency || 0,
        gps_jump: claimData.gpsJump || 0,
        city_match: claimData.cityMatch || 0.5,
        network_status: claimData.networkStatus || 0.5,
        response_time: claimData.responseTime || 0,
        event_timestamp: claimData.eventTimestamp 
          ? new Date(claimData.eventTimestamp).toISOString() 
          : null
      };

      const response = await axios.post(
        `${this.mlBackendUrl}/predict-claim`,
        payload,
        { timeout: 30000 }
      );
      
      return response.data;
    } catch (error) {
      console.error('ML Backend - Prediction error:', error.message);
      throw new Error('Failed to predict claim');
    }
  }

  /**
   * Get model status
   */
  async getModelStatus() {
    try {
      const response = await axios.get(`${this.mlBackendUrl}/models/status`);
      return response.data;
    } catch (error) {
      console.error('ML Backend - Status error:', error.message);
      return { available: false };
    }
  }
}

module.exports = new MLService();
```

#### Update Claim Controller

Update `backend/src/controllers/claimsController.js`:

```javascript
const mlService = require('../services/mlService');
const Claim = require('../models/Claim');
const User = require('../models/User');

exports.submitClaim = async (req, res) => {
  try {
    const { userId, environmentalData } = req.body;

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch current weather
    const weatherData = await mlService.getWeatherData(
      req.body.latitude,
      req.body.longitude
    );

    // Prepare claim data
    const claimData = {
      userId: user._id,
      plan: user.plan,
      zone: user.riskZone,
      registeredLatitude: user.registeredLatitude,
      registeredLongitude: user.registeredLongitude,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      timestamp: new Date(),
      rainfall: weatherData.rainfall_mm_hr,
      temperature: weatherData.temperature_celsius,
      aqi: weatherData.aqi,
      floodAlert: req.body.floodAlert || null,
      claimsThisWeek: await getClaimsThisWeek(userId),
      amount: req.body.amount || 1000,
      eventTimestamp: req.body.eventTimestamp
    };

    // Get ML prediction
    const mlDecision = await mlService.predictClaim(claimData);

    // Create claim record
    const claim = new Claim({
      userId,
      status: mlDecision.status,
      fraudScore: mlDecision.fraud_score,
      triggerType: mlDecision.trigger_type,
      mlReasons: mlDecision.reasons,
      environmentalData: weatherData,
      gpsData: {
        latitude: req.body.latitude,
        longitude: req.body.longitude
      },
      amount: req.body.amount || 1000,
      timestamp: new Date()
    });

    await claim.save();

    // If approved, process payout
    if (mlDecision.status === 'APPROVED') {
      // Trigger payment processing
      await processPayout(claim);
    }

    res.json({
      status: mlDecision.status,
      claimId: claim._id,
      fraudScore: mlDecision.fraud_score,
      reasons: mlDecision.reasons,
      details: mlDecision.details
    });

  } catch (error) {
    console.error('Claim submission error:', error);
    res.status(500).json({ error: error.message });
  }
};

async function getClaimsThisWeek(userId) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const claims = await Claim.countDocuments({
    userId,
    timestamp: { $gte: oneWeekAgo },
    status: { $in: ['APPROVED', 'SUSPICIOUS'] }
  });
  return claims;
}

async function processPayout(claim) {
  // Implementation depends on your payment service
  // Example: trigger payment job, update status, etc.
}
```

#### Update Claim Model

Update `backend/src/models/Claim.js`:

```javascript
const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // ML Decision
  status: {
    type: String,
    enum: ['APPROVED', 'REJECTED', 'SUSPICIOUS', 'LIMIT_EXCEEDED', 'PENDING'],
    default: 'PENDING'
  },
  fraudScore: Number,
  triggerType: String,
  mlReasons: [String],
  
  // Environmental Data
  environmentalData: {
    rainfall_mm_hr: Number,
    temperature_celsius: Number,
    aqi: Number,
    aqi_level: Number,
    pm25: Number,
    pm10: Number,
    weather_description: String
  },
  
  // Location Data
  gpsData: {
    latitude: Number,
    longitude: Number,
    accuracy: Number
  },
  
  // Claim Details
  amount: Number,
  triggerReason: String,
  description: String,
  
  // Timeline
  timestamp: {
    type: Date,
    default: Date.now
  },
  eventTimestamp: Date,
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSED', 'FAILED'],
    default: 'PENDING'
  },
  paymentDate: Date,
  transactionId: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Claim', claimSchema);
```

### 3. Update Frontend

Update `DevTrails/src/components/ClaimsView.jsx`:

```jsx
import { useState } from 'react';
import { api } from '../services/api';

export function ClaimsView() {
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState(null);
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    amount: 1000,
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/claims/submit', {
        ...formData,
        timestamp: new Date().toISOString()
      });

      setDecision(response.data);

      // Show decision to user
      if (response.data.status === 'APPROVED') {
        showSuccessNotification('Claim Approved! Payment will be processed soon.');
      } else if (response.data.status === 'SUSPICIOUS') {
        showWarningNotification('Claim flagged for review. Manual approval pending.');
      } else {
        showErrorNotification('Claim was rejected. ' + response.data.reasons.join(' '));
      }
    } catch (error) {
      showErrorNotification('Error submitting claim: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="claims-container">
      <h1>Submit Insurance Claim</h1>
      
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          placeholder="Latitude"
          value={formData.latitude}
          onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Longitude"
          value={formData.longitude}
          onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Claim Amount"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
        />
        <textarea
          placeholder="Claim Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Submit Claim'}
        </button>
      </form>

      {decision && (
        <div className={`decision decision-${decision.status.toLowerCase()}`}>
          <h2>Decision: {decision.status}</h2>
          <p>Fraud Score: {(decision.fraudScore * 100).toFixed(2)}%</p>
          <p>Trigger Type: {decision.triggerType}</p>
          
          <h3>why this decision:</h3>
          <ul>
            {decision.reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>

          {decision.details && (
            <details>
              <summary>Technical Details</summary>
              <pre>{JSON.stringify(decision.details, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
```

## Monitoring & Logging

### ML Backend Monitoring

Monitor the ML backend health:

```javascript
// In Node.js backend periodic check
setInterval(async () => {
  try {
    const status = await mlService.getModelStatus();
    console.log('ML Backend Status:', status);
  } catch (error) {
    console.error('ML Backend unreachable:', error.message);
    // Alert admin, fallback logic, etc.
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

### Error Handling

Implement graceful degradation:

```javascript
// If ML backend is down, use rule-based fallback
async function validateClaimWithFallback(claimData) {
  try {
    return await mlService.predictClaim(claimData);
  } catch (error) {
    console.error('ML validation failed, using fallback:', error);
    
    // Fallback: Basic rule-based validation
    return {
      status: 'PENDING',
      fraud_score: 0.5,
      trigger_type: 'UNKNOWN',
      reasons: [
        'ML service unavailable',
        'Claim queued for manual review'
      ]
    };
  }
}
```

## Testing Integration

### Local Testing with Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  node-backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://mongodb:27017/agesis
      ML_BACKEND_URL: http://ml-backend:8000
    depends_on:
      - mongodb
      - ml-backend

  ml-backend:
    build: ./ml-backend
    ports:
      - "8000:8000"
    environment:
      OPENWEATHER_API_KEY: ${OPENWEATHER_API_KEY}
      NODE_BACKEND_URL: http://node-backend:5000

  frontend:
    build: ./DevTrails
    ports:
      - "5173:5173"

volumes:
  mongodb_data:
```

Run locally:

```bash
docker-compose up
```

### API Testing

Use the provided examples:

```bash
python scripts/examples.py
```

Or use Postman/Insomnia:

1. Import API collection from `ml-backend/README.md`
2. Update base URL: `http://localhost:8000`
3. Test endpoints

## Production Checklist

- [ ] Deploy ML backend to Render with auto-build enabled
- [ ] Set all environment variables on ML backend
- [ ] Update Node.js backend `ML_BACKEND_URL` environment variable
- [ ] Test claim submission end-to-end
- [ ] Monitor ML backend logs
- [ ] Set up error alerts
- [ ] Configure database backups
- [ ] Implement rate limiting on APIs
- [ ] Add authentication headers if needed
- [ ] Test fallback logic

## Troubleshooting

### ML Backend unreachable

```javascript
// Add timeout and retry logic
const axiosConfig = {
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000
};
```

### Slow responses

- Check ML backend logs for bottlenecks
- Monitor model inference time
- Consider caching weather data (cache for 10 minutes)

### High fraud scores for valid claims

- Review model thresholds in `src/config.py`
- Retrain models with more representative data
- Adjust model weights

## Support

For issues or questions:
1. Check backend logs: `render.com` → Select service → Logs
2. Review ML backend README: `ml-backend/README.md`
3. Check integration troubleshooting section above

