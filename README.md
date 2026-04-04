# 🌍 AGESIS AI — Parametric Micro-Insurance Platform

## 🚀 Overview

AGESIS AI is an autonomous parametric micro-insurance platform designed for gig workers.
It eliminates manual claim filing by automatically triggering payouts based on real-time environmental conditions such as rainfall, temperature, and air quality.

The system continuously monitors risk and executes claims without human intervention, ensuring faster, fairer, and more transparent insurance.

---

## 💡 Problem Statement

Gig workers face unpredictable income disruptions due to environmental conditions:

* 🌧️ Heavy rain affecting delivery operations
* 🌡️ Heatwaves reducing productivity
* 🌫️ Poor air quality impacting health

Traditional insurance:

* Requires manual claims
* Has slow processing
* Lacks real-time responsiveness

---

## 🎯 Solution

AGESIS AI uses:

* Real-time environmental data
* Historical baseline modeling
* Automated trigger-based payouts

👉 No paperwork. No delays. No friction.

---

## ⚙️ Key Features

### 🔄 Autonomous Claim System

* No user input required
* Claims triggered automatically based on thresholds

### 📊 Risk Intelligence Engine

* Combines:

  * Real-time weather data (Open-Meteo)
  * Historical seasonal baseline
* Produces dynamic risk scores

### 🚨 Fraud Detection Layer

* Detects abnormal claim patterns
* Flags suspicious claims for review
* Prevents payout abuse

### 🧪 Simulation Engine (Demo Mode)

* Simulate:

  * Heavy rain
  * Heat spikes
  * AQI surges
* Enables controlled demonstrations

### 💳 Payment Integration

* Razorpay sandbox integration
* Enables wallet withdrawal flow

### 📈 Dashboards

* Worker Dashboard:

  * Risk score
  * Claims timeline
  * Wallet balance
* Admin Dashboard:

  * Environmental logs
  * Fraud alerts
  * Simulation controls

---

## 🧠 System Architecture

```text
User Location → Environmental APIs → Risk Engine → Trigger Engine
→ Claim Engine → Fraud Detection → Payout Engine → Wallet → Withdrawal
```

---

## 🔌 Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS
* ShadCN UI

### Backend

* Node.js
* Express.js
* MongoDB

### APIs

* Open-Meteo (weather + historical data)
* Mapbox (geolocation — optional)
* AQI API (or simulated)

### Payments

* Razorpay (Sandbox Mode)

---

## ⚖️ Risk Model

```text
Final Risk = 0.7 × Real-Time Risk + 0.3 × Historical Baseline
```

This hybrid approach reduces seasonal bias and ensures fairer pricing.

---

## 🧪 Demo Flow

1. User starts in normal conditions
2. Admin simulates environmental event
3. System detects threshold breach
4. Claim is triggered automatically
5. Fraud detection evaluates claim
6. Valid claims → instant payout
7. User withdraws via Razorpay (sandbox)

---

## 🛠️ Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/Harshi3107/AegisAI.git
cd YOUR_REPO
```

---

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

---

### 3. Frontend Setup

```bash
cd DevTrails
npm install
npm run dev
```

---

### 4. Start MongoDB

```bash
mongod
```

---

### 5. Environment Variables

Create `.env` in backend:

```env
MONGO_URI=
JWT_SECRET=
PORT=5000
```

---

## ⚠️ Notes

* External APIs may be partially simulated for demo stability
* Razorpay is used in sandbox mode
* System is designed to integrate real-world services seamlessly

---

## 🔮 Future Scope

* Full actuarial modeling
* Real-time IoT/weather station integration
* Advanced ML-based fraud detection
* Multi-region deployment

---

## 👥 Team Astra

* Harshitha Koppuravuri
* Pasam Sahithi
* Sumasree vemuri
* Chereddy keerthana reddy
* Gudavalli gagana sai reshma

---

## 🏆 Impact

AGESIS AI transforms insurance from a reactive process into a proactive, automated safety net for gig workers.

---
