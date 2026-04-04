import cron from 'node-cron';
import User from '../models/User.js';
import EnvironmentalLog from '../models/EnvironmentalLog.js';
import { getWeatherData } from '../services/weatherService.js';
import { getAQIDataWithFallback } from '../services/aqiService.js';
import { calculateRiskScore } from '../services/riskService.js';
import { runTriggerEngine } from '../services/triggerService.js';

/**
 * Environmental Monitoring Job
 * Runs every 5 minutes to collect environmental data for all active users
 */

// Track job execution
let isJobRunning = false;
let lastRunTime = null;
let runCount = 0;

const getNextFiveMinuteRunUtc = () => {
  const now = new Date();
  const next = new Date(now);

  next.setUTCSeconds(0, 0);
  const currentMinute = next.getUTCMinutes();
  const remainder = currentMinute % 5;
  const minutesToAdd = remainder === 0 ? 5 : 5 - remainder;
  next.setUTCMinutes(currentMinute + minutesToAdd);

  return next;
};

/**
 * Process environmental data for a single user
 * @param {Object} user - User document from database
 */
const processUserEnvironmentalData = async (user) => {
  try {
    const { location } = user;
    const { lat, lng, city } = location;

    console.log(`📊 Processing environmental data for user ${user._id} in ${city}`);

    // Step 1: Fetch weather data
    let weatherData;
    try {
      weatherData = await getWeatherData(lat, lng);
      console.log(`🌦️ Weather data for ${city}: ${weatherData.temperature}°C, ${weatherData.rainfall}mm rain`);
    } catch (error) {
      console.error(`❌ Failed to fetch weather data for user ${user._id}:`, error.message);
      return; // Skip this user, continue with others
    }

    // Step 2: Fetch AQI data (with fallback)
    let aqi;
    try {
      aqi = await getAQIDataWithFallback(city);
      console.log(`🌫️ AQI data for ${city}: ${aqi || 'N/A'}`);
    } catch (error) {
      console.warn(`⚠️ AQI service failed for ${city}, proceeding with null:`, error.message);
      aqi = null;
    }

    // Step 3: Calculate risk score
    let riskScore;
    try {
      riskScore = calculateRiskScore(weatherData.rainfall, weatherData.temperature, aqi);
      console.log(`⚠️ Calculated risk score for ${city}: ${riskScore.toFixed(3)}`);
    } catch (error) {
      console.error(`❌ Failed to calculate risk score for user ${user._id}:`, error.message);
      return; // Skip this user
    }

    // Step 4: Check for recent duplicate (optional optimization)
    // Only store if no log exists for this location in the last 4 minutes
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);
    const recentLog = await EnvironmentalLog.findOne({
      'location.lat': lat,
      'location.lng': lng,
      timestamp: { $gte: fourMinutesAgo }
    });

    if (recentLog) {
      console.log(`⏭️ Skipping duplicate log for ${city} (recent log exists)`);
      return;
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

    console.log(`✅ Environmental log stored for ${city} with ID: ${environmentalLog._id}`);

    // Trigger/claim/payout logic (new requirements)
    try {
      await runTriggerEngine(user, {
        rainfall: weatherData.rainfall,
        temperature: weatherData.temperature,
        aqi
      });
    } catch (error) {
      console.error(`❌ Trigger engine error for user ${user._id}:`, error.message);
    }

  } catch (error) {
    console.error(`❌ Unexpected error processing user ${user._id}:`, error.message);
    // Continue with next user - don't let one failure stop the entire job
  }
};

/**
 * Main job function - runs every 5 minutes
 */
const runEnvironmentalMonitoring = async () => {
  if (isJobRunning) {
    console.log('⏳ Environmental monitoring job already running, skipping...');
    return;
  }

  isJobRunning = true;
  const startTime = Date.now();
  runCount++;

  try {
    console.log(`🚀 Starting environmental monitoring job #${runCount} at ${new Date().toISOString()}`);

    // Fetch all users with valid location data
    // TODO: Add policy check when policy model is implemented
    const users = await User.find({
      'location.lat': { $exists: true, $ne: null },
      'location.lng': { $exists: true, $ne: null },
      'location.city': { $exists: true, $ne: null }
    });

    console.log(`👥 Found ${users.length} users with valid location data`);

    if (users.length === 0) {
      console.log('ℹ️ No users with valid location data found');
      return;
    }

    // Process each user asynchronously but wait for all to complete
    const processPromises = users.map(user => processUserEnvironmentalData(user));
    await Promise.allSettled(processPromises);

    const duration = Date.now() - startTime;
    lastRunTime = new Date();

    console.log(`✅ Environmental monitoring job #${runCount} completed in ${duration}ms`);

  } catch (error) {
    console.error('❌ Environmental monitoring job failed:', error.message);
  } finally {
    isJobRunning = false;
  }
};

/**
 * Start the environmental monitoring cron job
 * Runs every 5 minutes (cron expression: 'x/5 * * * *' with x = '*')
 */
export const startEnvironmentalMonitoring = () => {
  console.log('⏰ Starting environmental monitoring cron job (every 5 minutes)');

  // Schedule job to run every 5 minutes
  cron.schedule('*/5 * * * *', runEnvironmentalMonitoring, {
    scheduled: true,
    timezone: 'UTC' // Use UTC to avoid timezone issues
  });

  console.log('✅ Environmental monitoring cron job scheduled');
};

/**
 * Get job status for monitoring/debugging
 */
export const getJobStatus = () => {
  return {
    isRunning: isJobRunning,
    lastRunTime,
    runCount,
    nextRun: getNextFiveMinuteRunUtc()
  };
};

/**
 * Manually trigger the job (for testing)
 */
export const triggerEnvironmentalMonitoring = () => {
  console.log('🔧 Manually triggering environmental monitoring job');
  runEnvironmentalMonitoring();
};

export default {
  startEnvironmentalMonitoring,
  getJobStatus,
  triggerEnvironmentalMonitoring
};