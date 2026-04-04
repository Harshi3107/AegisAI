/**
 * Risk Service for calculating environmental risk scores
 * Combines rainfall, temperature, and AQI data into a composite risk score
 */

/**
 * Calculate rainfall risk score
 * Formula: min(rainfall / 80, 1)
 * @param {number} rainfall - Rainfall in mm
 * @returns {number} Risk score between 0 and 1
 */
export const calculateRainScore = (rainfall) => {
  if (typeof rainfall !== 'number' || rainfall < 0) {
    throw new Error('Invalid rainfall value');
  }

  return Math.min(rainfall / 80, 1);
};

/**
 * Calculate temperature risk score
 * Formula:
 * - If temperature < 35°C → 0
 * - Else min((temperature - 35) / 10, 1)
 * @param {number} temperature - Temperature in Celsius
 * @returns {number} Risk score between 0 and 1
 */
export const calculateTempScore = (temperature) => {
  if (typeof temperature !== 'number') {
    throw new Error('Invalid temperature value');
  }

  if (temperature < 35) {
    return 0;
  }

  return Math.min((temperature - 35) / 10, 1);
};

/**
 * Calculate AQI risk score
 * Formula:
 * - If AQI < 150 → 0
 * - Else min((AQI - 150) / 300, 1)
 * @param {number|null} aqi - Air Quality Index value
 * @returns {number} Risk score between 0 and 1
 */
export const calculateAQIScore = (aqi) => {
  // Handle null/undefined AQI (when API fails)
  if (aqi === null || aqi === undefined) {
    return 0; // No risk contribution if AQI is unavailable
  }

  if (typeof aqi !== 'number' || aqi < 0) {
    throw new Error('Invalid AQI value');
  }

  if (aqi < 150) {
    return 0;
  }

  return Math.min((aqi - 150) / 300, 1);
};

/**
 * Calculate composite risk score
 * Formula: (rain_score * 0.4) + (temp_score * 0.3) + (aqi_score * 0.3)
 * @param {number} rainfall - Rainfall in mm
 * @param {number} temperature - Temperature in Celsius
 * @param {number|null} aqi - Air Quality Index value
 * @returns {number} Composite risk score between 0 and 1
 */
export const calculateRiskScore = (rainfall, temperature, aqi) => {
  try {
    const rainScore = calculateRainScore(rainfall);
    const tempScore = calculateTempScore(temperature);
    const aqiScore = calculateAQIScore(aqi);

    const riskScore = (rainScore * 0.4) + (tempScore * 0.3) + (aqiScore * 0.3);

    // Ensure the result is between 0 and 1 (should be, but just in case)
    return Math.max(0, Math.min(1, riskScore));

  } catch (error) {
    console.error('Risk calculation error:', error.message);
    throw new Error(`Failed to calculate risk score: ${error.message}`);
  }
};

/**
 * Get risk level description based on score
 * @param {number} riskScore - Risk score between 0 and 1
 * @returns {string} Risk level description
 */
export const getRiskLevel = (riskScore) => {
  if (riskScore < 0.2) return 'Low';
  if (riskScore < 0.4) return 'Moderate';
  if (riskScore < 0.6) return 'High';
  if (riskScore < 0.8) return 'Very High';
  return 'Extreme';
};