import fetch from 'node-fetch';

/**
 * Weather Service using Open-Meteo API
 * Fetches temperature and precipitation data for given coordinates
 */
export const getWeatherData = async (lat, lng) => {
  try {
    // Open-Meteo API endpoint for current weather
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation&timezone=auto`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.current) {
      throw new Error('Invalid response from Open-Meteo API');
    }

    // Extract current weather data
    const temperature = data.current.temperature_2m;
    const rainfall = data.current.precipitation || 0;

    return {
      temperature: parseFloat(temperature),
      rainfall: parseFloat(rainfall)
    };

  } catch (error) {
    console.error('Weather service error:', error.message);
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
};

/**
 * Historical weather data using Open-Meteo archive API.
 * Returns summary metrics for the requested date range.
 */
export const getHistoricalWeatherData = async (lat, lng, startDate, endDate) => {
  try {
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date', endDate);
    url.searchParams.set('daily', 'temperature_2m_max,precipitation_sum');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo archive API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const daily = data?.daily;

    if (!daily?.temperature_2m_max?.length || !daily?.precipitation_sum?.length) {
      throw new Error('Invalid archive response from Open-Meteo');
    }

    const temperatures = daily.temperature_2m_max.filter((value) => typeof value === 'number');
    const rainfall = daily.precipitation_sum.filter((value) => typeof value === 'number');

    const averageTemperature = temperatures.length
      ? temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length
      : null;
    const totalRainfall = rainfall.reduce((sum, value) => sum + value, 0);
    const averageRainfall = rainfall.length ? totalRainfall / rainfall.length : null;

    return {
      startDate,
      endDate,
      averageTemperature: averageTemperature !== null ? Number(averageTemperature.toFixed(2)) : null,
      totalRainfall: Number(totalRainfall.toFixed(2)),
      averageRainfall: averageRainfall !== null ? Number(averageRainfall.toFixed(2)) : null,
      dailyCount: Math.min(temperatures.length, rainfall.length),
      raw: daily
    };
  } catch (error) {
    console.error('Historical weather service error:', error.message);
    throw new Error(`Failed to fetch historical weather data: ${error.message}`);
  }
};