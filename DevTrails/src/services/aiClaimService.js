/**
 * AI Claim Evaluation Service
 * Unified API calls to AI backend for all simulations
 */

const AI_API_BASE = 'https://aegisai-1.onrender.com';

// Base payload template
const getBasePayload = () => ({
  user_id: "u1",
  user_plan: "standard",
  user_zone: "low_risk",
  user_registered_latitude: 17.3850,
  user_registered_longitude: 78.4867,
  claim_latitude: 17.3850,
  claim_longitude: 78.4867,
  claim_timestamp: new Date().toISOString(),
  claims_this_week: 1
});

/**
 * Call AI API for claim prediction
 * @param {Object} payload - Environmental data for claim evaluation
 * @returns {Promise<Object>} - API response with claim result
 */
export const callAIApi = async (payload) => {
  try {
    const response = await fetch(`${AI_API_BASE}/predict-claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'API returned error');
    }

    return data;
  } catch (error) {
    console.error('AI API call failed:', error);
    throw error;
  }
};

/**
 * Simulate rain event
 */
export const simulateRain = async () => {
  return callAIApi({
    ...getBasePayload(),
    rainfall_mm_hr: 80,
    temperature_celsius: 30,
    aqi: 100,
    flood_alert: null
  });
};

/**
 * Simulate heatwave event
 */
export const simulateHeatwave = async () => {
  return callAIApi({
    ...getBasePayload(),
    rainfall_mm_hr: 0,
    temperature_celsius: 45,
    aqi: 120,
    flood_alert: null
  });
};

/**
 * Simulate high AQI event
 */
export const simulateAQI = async () => {
  return callAIApi({
    ...getBasePayload(),
    rainfall_mm_hr: 0,
    temperature_celsius: 30,
    aqi: 300,
    flood_alert: null
  });
};

/**
 * Simulate flood event (NEW)
 */
export const simulateFlood = async () => {
  return callAIApi({
    ...getBasePayload(),
    rainfall_mm_hr: 100,
    temperature_celsius: 28,
    aqi: 120,
    flood_alert: "SEVERE"
  });
};

/**
 * Get human-readable trigger name
 */
export const getTriggerName = (triggerType) => {
  const triggerMap = {
    'RAIN': 'Heavy Rain',
    'HEATWAVE': 'Heatwave',
    'AQI': 'High AQI',
    'FLOOD': 'Flood Alert',
    'NONE': 'No Trigger'
  };
  return triggerMap[triggerType] || triggerType || 'No Trigger';
};
