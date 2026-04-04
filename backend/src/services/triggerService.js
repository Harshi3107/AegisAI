import Claim from '../models/Claim.js';
import Plan from '../models/Plan.js';
import { createClaimForTrigger } from './claimService.js';

/**
 * Determine trigger events based on environmental values and plan thresholds
 * @param {Object} user - User document
 * @param {Object} envData - { rainfall, temperature, aqi }
 * @returns {Promise<Array>} Array of triggered events
 */
export const evaluateTriggers = async (user, envData) => {
  if (!user || !user.policy || !user.policy.active || !user.policy.plan) {
    return [];
  }

  const plan = await Plan.findById(user.policy.plan);
  if (!plan) {
    console.warn(`No plan found for user ${user._id}`);
    return [];
  }

  const triggered = [];
  const { thresholds } = plan;

  // Keep all compared metrics in one place
  const rainValue = envData.rainfall;
  const tempValue = envData.temperature;
  const aqiValue = envData.aqi;

  if (typeof rainValue === 'number' && rainValue >= thresholds.rain) {
    triggered.push({ type: 'rain', value: rainValue, threshold: thresholds.rain });
  }

  if (typeof tempValue === 'number' && tempValue >= thresholds.temp) {
    triggered.push({ type: 'heat', value: tempValue, threshold: thresholds.temp });
  }

  if (aqiValue !== null && typeof aqiValue === 'number' && aqiValue >= thresholds.aqi) {
    triggered.push({ type: 'aqi', value: aqiValue, threshold: thresholds.aqi });
  }

  // Flood is not direct in current data; we can infer from heavy rainfall for now
  if (typeof rainValue === 'number' && rainValue >= plan.thresholds.rain * 1.5) {
    triggered.push({ type: 'flood', value: rainValue, threshold: plan.thresholds.rain * 1.5 });
  }

  return triggered;
};

/**
 * Run triggers for a user and create payouts if applicable.
 * @param {Object} user User document
 * @param {Object} envData { rainfall, temperature, aqi }
 */
export const runTriggerEngine = async (user, envData) => {
  try {
    const triggers = await evaluateTriggers(user, envData);

    if (!triggers.length) {
      console.log(`No triggers for user ${user._id}`);
      return;
    }

    for (const trigger of triggers) {
      try {
        await createClaimForTrigger(user, trigger, envData);
      } catch (error) {
        console.error(`Failed to process claim for user ${user._id} trigger ${trigger.type}:`, error.message);
      }
    }

  } catch (error) {
    console.error(`Trigger engine failure for user ${user._id}:`, error.message);
  }
};
