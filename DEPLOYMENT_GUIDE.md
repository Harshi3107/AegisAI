# Deployment Guide - AGESIS AI

## Overview

This guide covers deploying the complete AGESIS AI platform (Frontend, Node.js Backend, and ML Backend) to production.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Vercel (Frontend)                              │
│              DevTrails - React/Vite                             │
└───────────────────────────────────────────────────────────────┬─┘
                                                                  │
                                                    HTTPS/REST API
                                                                  │
        ┌─────────────────────────────────────────────────────────▼─────┐
        │                    Render.com                                 │
        │  ┌──────────────────┐          ┌─────────────────────┐       │
        │  │  Node.js Backend │◄────────►│   ML Backend        │       │
        │  │  Express.js      │   HTTP   │   FastAPI/Python    │       │
        │  │  Environment:    │          │   Environment:      │       │
        │  │  - MONGODB_URI   │          │   - OPENWEATHER_KEY │       │
        │  │  - ML_BACKEND_URL│          │   - NODE_BACKEND_URL│       │
        │  └──────────────────┘          └─────────────────────┘       │
        └──────────────────────────────────────────────────────────────┘
                                │
                         MongoDB Atlas
                         (Database)
```

## Pre-Deployment Checklist

- [ ] All code committed to Git
- [ ] Environment variables documented
- [ ] Models trained and saved locally
- [ ] API keys obtained (OpenWeatherMap)
- [ ] MongoDB Atlas cluster created
- [ ] GitHub repositories are public (or deploy keys configured)
- [ ] Domain name (if custom)
- [ ] SSL certificates (automatic on Render/Vercel)

## Step 1: Prepare Code

### 1.1 Ensure Git Organization

```bash
# Root directory structure
AGESIS AI/
├── frontend/                  # Frontend code
├── backend/                   # Node.js backend
├── ml-backend/               # Python ML backend
├── INTEGRATION_GUIDE.md       # This file
└── DEPLOYMENT_GUIDE.md        # Deployment instructions
```

### 1.2 Update Environment Files

Create `.env.production` files for each service:

**Backend `.env.production`:**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agesis
JWT_SECRET=your_secure_secret_key_here
OPENWEATHER_API_KEY=your_api_key
ML_BACKEND_URL=https://agesis-ml.onrender.com
```

**ML Backend `.env.production`:**
```env
OPENWEATHER_API_KEY=your_api_key
NODE_BACKEND_URL=https://agesis-api.onrender.com
FASTAPI_ENV=production
```

**Frontend `.env.production`:**
```env
VITE_API_BASE_URL=https://agesis-api.onrender.com/api
```

## Step 2: Deploy ML Backend (FastAPI)

### 2.1 Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Create new account

### 2.2 Prepare ML Backend Code

```bash
cd ml-backend

# Create .renderignore
cat > .renderignore << 'EOF'
__pycache__/
*.pyc
.env
.git
.gitignore
EOF
```

### 2.3 Create Render Web Service

1. **Dashboard** → **New +** → **Web Service**
2. **Connect Repository**
   - Select your GitHub repository
   - Click "Connect"

3. **Configure Service**
   - **Name**: `agesis-ml`
   - **Environment**: Python 3.11
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && python scripts/train_models.py
     ```
   - **Start Command**:
     ```bash
     uvicorn src.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Region**: Choose closest to users (e.g., Singapore for India)

4. **Environment Variables**
   - Add from Settings tab:
   ```
   OPENWEATHER_API_KEY = your_api_key
   NODE_BACKEND_URL = https://agesis-api.onrender.com
   FASTAPI_ENV = production
   ```

5. **Click "Create Web Service"**

### 2.4 Wait for Deployment

- Monitor logs on Render dashboard
- Deployment typically takes 5-10 minutes
- Copy service URL: `https://agesis-ml.onrender.com`

### 2.5 Verify Deployment

```bash
curl https://agesis-ml.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00",
  "models": {...}
}
```

## Step 3: Deploy Node.js Backend

### 3.1 Prepare Backend Code

```bash
cd backend

# Create .renderignore
cat > .renderignore << 'EOF'
node_modules/
.env
.git
.gitignore
test/
*.md
EOF
```

### 3.2 Update package.json

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### 3.3 Create Render Web Service

1. **Dashboard** → **New +** → **Web Service**
2. **Connect Repository**
   - Select same repository
   - Click "Connect"

3. **Configure Service**
   - **Name**: `agesis-api`
   - **Environment**: Node
   - **Build Command**:
     ```bash
     npm install
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Region**: Same as ML backend

4. **Environment Variables**
   ```
   NODE_ENV = production
   MONGODB_URI = mongodb+srv://user:pass@cluster.mongodb.net/agesis
   JWT_SECRET = your_secret_key_here
   OPENWEATHER_API_KEY = your_api_key
   ML_BACKEND_URL = https://agesis-ml.onrender.com
   ```

5. **Click "Create Web Service"**

### 3.4 Verify Deployment

```bash
curl https://agesis-api.onrender.com/health
```

## Step 4: Deploy Frontend

### 4.1 Prepare Frontend Code

```bash
cd DevTrails

# Update vite.config.js
# Ensure CORS headers are correct for API calls
```

Update `DevTrails/src/services/api.js`:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

export default api;
```

### 4.2 Deploy to Vercel

1. **Go to https://vercel.com**
2. **Sign in with GitHub**
3. **Import Project**:
   - Select your repository
   - Framework preset: Vite
   - Root directory: `DevTrails`
   - Build command: `npm run build`
   - Output directory: `dist`

4. **Environment Variables**
   ```
   VITE_API_BASE_URL = https://agesis-api.onrender.com/api
   ```

5. **Click "Deploy"**

### 4.3 Custom Domain (Optional)

1. In Vercel project settings → **Domains**
2. Add custom domain
3. Update DNS records at domain registrar
4. SSL certificate auto-provisioned

## Step 5: Create MongoDB Atlas Database

### 5.1 MongoDB Atlas Setup

1. **Go to https://www.mongodb.com/cloud/atlas**
2. **Create Account**
3. **Create Organization**
4. **Create Project** named "AGESIS"
5. **Create Cluster**:
   - **Cloud Provider**: AWS
   - **Region**: ap-south-1 (India) or ap-southeast-1 (Singapore)
   - **Cluster Name**: `agesis-prod`
   - **Cluster Tier**: M0 (free) for testing, M2+ for production

6. **Security → Database Access**:
   - Create user: `agesis_user`
   - Set strong password
   - Grant permissions: Read and write to all databases

7. **Security → Network Access**:
   - Add IP address `0.0.0.0/0` (allows all; restrict to Render IPs in production)

8. **Databases → Connect**:
   - Copy connection string
   - Format: `mongodb+srv://user:password@cluster.mongodb.net/agesis?retryWrites=true&w=majority`

### 5.2 Add to Node.js Backend

Update Render environment variable:
```
MONGODB_URI = mongodb+srv://agesis_user:password@cluster.mongodb.net/agesis?retryWrites=true&w=majority
```

## Step 6: OpenWeatherMap API

### 6.1 Get API Key

1. Go to https://openweathermap.org
2. Sign up
3. Go to API Keys page
4. Copy default API key

### 6.2 Add to Services

Add to both Render services:
```
OPENWEATHER_API_KEY = your_key_here
```

## Step 7: Health Checks & Monitoring

### 7.1 Configure Render Health Checks

For each service:

1. **Settings** → **Health Check Path**
   - ML Backend: `/health`
   - Node Backend: `/health`

2. **Advanced** → **Auto-deploy on push**: Enable

### 7.2 Monitor Logs

View logs in real-time:

**Node.js Backend**:
```bash
# Watch logs
render logs agesis-api
```

**ML Backend**:
```bash
render logs agesis-ml
```

### 7.3 Set Up Alerts

In Render dashboard:
- **Settings** → **Webhooks** → Add notification for deployment failures
- Connect to email or Slack

## Step 8: Testing Production

### 8.1 Test Frontend

```bash
# Visit https://your-domain.vercel.app
# Test login, submit claim, view dashboard
```

### 8.2 Test Backend APIs

```bash
# Test ML Backend
curl https://agesis-ml.onrender.com/health

# Test Node Backend
curl https://agesis-api.onrender.com/health

# Test claim submission
curl -X POST https://agesis-api.onrender.com/api/claims/submit \
  -H "Content-Type: application/json" \
  -d '{"userId": "test_user", "latitude": 19.0760, "longitude": 72.8777}'
```

### 8.3 Monitor Performance

Check latency in browser DevTools:
- Frontend load time: < 3s
- API response time: < 2s
- ML prediction time: < 5s

## Step 9: Production Optimization

### 9.1 Database Indexing

```javascript
// Create indexes for common queries
db.users.createIndex({ email: 1 });
db.claims.createIndex({ userId: 1, timestamp: -1 });
db.claims.createIndex({ status: 1 });
```

### 9.2 Cache Strategy

Add Redis caching for:
- User profiles
- Latest weather data (10 min TTL)
- Trigger thresholds
- Model status

### 9.3 Rate Limiting

Implement rate limiting on APIs:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
});

app.use('/api/', limiter);
```

### 9.4 CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://your-domain.vercel.app',
    'https://yourdomain.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

## Step 10: Maintenance & Updates

### 10.1 Scheduled Tasks

Set up cron jobs:

```javascript
// Update trailing 7-day claim counts
schedule.scheduleJob('0 */6 * * *', () => {
  updateWeeklyClaims();
});

// Retrain models weekly
schedule.scheduleJob('0 0 * * 0', () => {
  // Trigger ML backend model retraining
});
```

### 10.2 Backups

- MongoDB Atlas: Automatic daily backups
- Code: GitHub provides version control
- Models: Saved in ML backend repository

### 10.3 Updates

To deploy updates:

1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```

2. **Render auto-redeploys** (if enabled)

3. **Verify deployment** in render.com dashboard

## Troubleshooting

### Service won't start

1. **Check logs**:
   - Render dashboard → Service → Logs
   - Look for error messages

2. **Common issues**:
   - Missing environment variables → Add to Render
   - Syntax errors → Fix and redeploy
   - Dependency issues → Update `requirements.txt` or `package.json`

### Slow responses

1. **Check database connection** → MongoDB Atlas connection string
2. **Check ML backend** → Is it responding to requests?
3. **Add database indexes** → Optimize queries
4. **Enable caching** → Reduce database hits

###Connection errors

1. **Check CORS configuration** → Both backends should allow frontend origin
2. **Check firewall/IP whitelist** → MongoDB Atlas should allow Render IPs
3. **Check environment variables** → All URLs should be correct

### High billing

1**Monitor Render usage**:
   - Render dashboard → Usage
   - Downgrade to free tier features if possible
   - Use auto-scaling wisely

2. **MongoDB Atlas**:
   - Use free M0 tier for development
   - Upgrade to M2+ only for production
   - Enable autoscaling for storage

## Performance Goals

Target metrics after deployment:

| Metric | Target |
|--------|--------|
| Frontend load time | < 3 seconds |
| API response time | < 1 second |
| ML prediction time | < 5 seconds |
| Database query time | < 100ms |
| Uptime | 99.9% |

## Security Checklist

- [ ] All secrets in environment variables (never in code)
- [ ] HTTPS enabled (automatic on Render/Vercel)
- [ ] CORS configured for allowed origins only
- [ ] Database restricted to Render IPs
- [ ] JWT tokens with expiration
- [ ] Input validation on all endpoints
- [ ] Rate limiting enabled
- [ ] Logging enabled for security events
- [ ] Regular dependency updates
- [ ] Security headers configured

## Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Express.js Docs**: https://expressjs.com

## Contact & Support

For deployment issues:
1. Check service logs
2. Review this guide
3. Contact platform support
   - Render support: https://support.render.com
   - Vercel support: https://vercel.com/support

---

**Last Updated**: January 2024
**Deployment Guide Version**: 1.0.0
