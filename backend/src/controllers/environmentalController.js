import EnvironmentalLog from '../models/EnvironmentalLog.js';
import { getWeatherData } from '../services/weatherService.js';
import { getHistoricalWeatherData } from '../services/weatherService.js';
import { getAQIDataWithFallback } from '../services/aqiService.js';
import { calculateRiskScore } from '../services/riskService.js';
import { getCityFromCoordinates, getLocationDetailsFromCoordinates } from '../services/mapService.js';
import { runTriggerEngine } from '../services/triggerService.js';

// @desc    Fetch and store environmental data
// @route   POST /api/environment/fetch
// @access  Private (requires authentication)
export const fetchEnvironmentalData = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;

    // Validation
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be numbers'
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude values'
      });
    }

    console.log(`Fetching environmental data for coordinates: ${lat}, ${lng}`);

    // Step 1: Get city from coordinates using Mapbox
    let city;
    try {
      city = await getCityFromCoordinates(lat, lng);
      console.log(`Resolved city: ${city}`);
    } catch (error) {
      console.error('Failed to resolve city:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to resolve city from coordinates'
      });
    }

    // Step 2: Fetch weather data
    let weatherData;
    try {
      weatherData = await getWeatherData(lat, lng);
      console.log(`Weather data:`, weatherData);
    } catch (error) {
      console.error('Failed to fetch weather data:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch weather data'
      });
    }

    // Step 3: Fetch AQI data (with fallback)
    let aqi;
    try {
      aqi = await getAQIDataWithFallback(city);
      console.log(`AQI data for ${city}: ${aqi}`);
    } catch (error) {
      console.warn('AQI service failed, proceeding with null:', error.message);
      aqi = null;
    }

    // Step 4: Calculate risk score
    let riskScore;
    try {
      riskScore = calculateRiskScore(weatherData.rainfall, weatherData.temperature, aqi);
      console.log(`Calculated risk score: ${riskScore}`);
    } catch (error) {
      console.error('Failed to calculate risk score:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate risk score'
      });
    }

    // Step 5: Store environmental log
    const environmentalLog = await EnvironmentalLog.create({
      location: {
        lat,
        lng,
        city
      },
      rainfall: weatherData.rainfall,
      temperature: weatherData.temperature,
      aqi,
      risk_score: riskScore,
      timestamp: new Date()
    });

    console.log(`Environmental log stored with ID: ${environmentalLog._id}`);

    // Step 6: Return the stored data
    res.status(201).json({
      success: true,
      message: 'Environmental data fetched and stored successfully',
      data: {
        id: environmentalLog._id,
        location: environmentalLog.location,
        weather: {
          temperature: weatherData.temperature,
          rainfall: weatherData.rainfall
        },
        aqi,
        risk_score: riskScore,
        timestamp: environmentalLog.timestamp
      }
    });

  } catch (error) {
    console.error('Environmental data fetch error:', error.message);
    next(error);
  }
};

// @desc    Get environmental logs for a location
// @route   GET /api/environment/logs
// @access  Private
export const getEnvironmentalLogs = async (req, res, next) => {
  try {
    const { lat, lng, city, limit = 10, page = 1 } = req.query;

    let query = {};

    if (lat && lng) {
      query['location.lat'] = parseFloat(lat);
      query['location.lng'] = parseFloat(lng);
    }

    if (city) {
      query['location.city'] = city;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await EnvironmentalLog
      .find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await EnvironmentalLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get environmental logs error:', error.message);
    next(error);
  }
};

// @desc    Get latest environmental data for a location
// @route   GET /api/environment/latest
// @access  Private
export const getLatestEnvironmentalData = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const latestLog = await EnvironmentalLog.getLatestForLocation(
      parseFloat(lat),
      parseFloat(lng)
    );

    if (!latestLog) {
      return res.status(404).json({
        success: false,
        message: 'No environmental data found for this location'
      });
    }

    res.status(200).json({
      success: true,
      data: latestLog
    });

  } catch (error) {
    console.error('Get latest environmental data error:', error.message);
    next(error);
  }
};

// @desc    Simulate environmental event to force a test trigger
// @route   POST /api/environment/simulate
// @access  Private
export const simulateEnvironmentalEvent = async (req, res, next) => {
  try {
    const { type, lat, lng } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, message: 'type is required' });
    }

    const allowedTypes = ['highRain', 'highAQI', 'heatSpike'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Unknown simulation type: ${type}` });
    }

    let location = { lat, lng };
    if ((!lat || !lng) && req.user?.location?.lat && req.user?.location?.lng) {
      location = { lat: req.user.location.lat, lng: req.user.location.lng };
    }

    if (!location.lat || !location.lng) {
      return res.status(400).json({ success: false, message: 'Location is required for simulation' });
    }

    // Try to get city from user location, then Mapbox, with fallback to default
    let city = req.user?.location?.city;
    
    if (!city) {
      try {
        city = await getCityFromCoordinates(location.lat, location.lng);
      } catch (error) {
        console.warn('City lookup failed, using default:', error.message);
        city = 'Demo City'; // Fallback for demo/testing
      }
    }

    const baseline = {
      temperature: 28,
      rainfall: 5,
      aqi: 100
    };

    switch (type) {
      case 'highRain':
        baseline.rainfall = 75;
        baseline.temperature = 24;
        baseline.aqi = 90;
        break;
      case 'highAQI':
        baseline.rainfall = 5;
        baseline.temperature = 26;
        baseline.aqi = 470;
        break;
      case 'heatSpike':
        baseline.rainfall = 1;
        baseline.temperature = 48;
        baseline.aqi = 110;
        break;
    }

    const riskScore = calculateRiskScore(baseline.rainfall, baseline.temperature, baseline.aqi);

    const log = await EnvironmentalLog.create({
      location: { lat: location.lat, lng: location.lng, city },
      rainfall: baseline.rainfall,
      temperature: baseline.temperature,
      aqi: baseline.aqi,
      risk_score: riskScore,
      is_simulated: true,
      timestamp: new Date()
    });

    console.log(`✔️ Simulation executed: ${type} at ${location.lat},${location.lng}, city=${city}, risk=${riskScore.toFixed(3)}`);

    if (req.user) {
      try {
        await runTriggerEngine(req.user, { rainfall: baseline.rainfall, temperature: baseline.temperature, aqi: baseline.aqi });
      } catch (err) {
        console.warn('Simulation trigger engine failure:', err.message);
      }
    }

    res.status(201).json({ success: true, data: log, message: 'Simulation event recorded' });
  } catch (error) {
    console.error('Simulation event error:', error.message);
    next(error);
  }
};

// @desc    Get location risk profile from historical weather
// @route   GET /api/environment/location-risk
// @access  Public
export const getLocationRiskProfile = async (req, res, next) => {
  try {
    const { lat, lng, start_date, end_date } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be numbers'
      });
    }

    const endDateValue = end_date || new Date().toISOString().slice(0, 10);
    const startDateValue = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let city = null;
    let locationDetails = { city: null, place: null, locationName: null };

    try {
      locationDetails = await getLocationDetailsFromCoordinates(latitude, longitude);
      city = locationDetails.city;
    } catch (cityError) {
      console.warn('City lookup failed for location risk profile:', cityError.message);
    }

    const history = await getHistoricalWeatherData(latitude, longitude, startDateValue, endDateValue);

    const riskScore = calculateRiskScore(
      history.averageRainfall ?? 0,
      history.averageTemperature ?? 0,
      null
    );

    const classification = riskScore >= 0.5 ? 'High' : 'Low';

    res.status(200).json({
      success: true,
      data: {
        lat: latitude,
        lng: longitude,
        city,
        location_name: locationDetails.locationName || city,
        place: locationDetails.place || '',
        classification,
        risk_score: Number(riskScore.toFixed(3)),
        summary: history,
        label: classification === 'High'
          ? 'Higher environmental risk based on historical weather patterns'
          : 'Lower environmental risk based on historical weather patterns'
      }
    });
  } catch (error) {
    next(error);
  }
};