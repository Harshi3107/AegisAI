import fetch from 'node-fetch';

/**
 * AQI Service using AQICN API
 * Fetches Air Quality Index for a given city
 */
export const getAQIData = async (city) => {
  try {
    // AQICN API endpoint - using city search
    const url = `https://api.waqi.info/search/?token=${process.env.AQICN_TOKEN}&keyword=${encodeURIComponent(city)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`AQICN API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'ok' || !data.data || data.data.length === 0) {
      console.warn(`No AQI data found for city: ${city}`);
      return null;
    }

    // Get the first result (closest match)
    const station = data.data[0];

    if (!station.aqi) {
      console.warn(`No AQI value available for city: ${city}`);
      return null;
    }

    const aqi = parseInt(station.aqi);

    // Validate AQI value
    if (isNaN(aqi) || aqi < 0) {
      console.warn(`Invalid AQI value for city: ${city}`);
      return null;
    }

    return aqi;

  } catch (error) {
    console.error('AQI service error:', error.message);

    // Return null as fallback instead of throwing error
    // This allows the system to continue with other data
    return null;
  }
};

/**
 * Get AQI data with fallback to last known value
 * This method can be enhanced to store and retrieve cached values
 */
export const getAQIDataWithFallback = async (city) => {
  const currentAQI = await getAQIData(city);

  if (currentAQI !== null) {
    return currentAQI;
  }

  // TODO: Implement fallback to last known value from database
  // For now, return null
  console.warn(`Using fallback AQI value (null) for city: ${city}`);
  return null;
};