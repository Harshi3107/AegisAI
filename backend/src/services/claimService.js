import Claim from '../models/Claim.js';
import User from '../models/User.js';
import { processPayout, getPlanPayoutMap } from './payoutService.js';
import { evaluateFraud, getRecentClaims } from './fraudService.js';

const CLAIM_WINDOW_MINUTES = 60; // Avoid duplicate claims within 60 minutes

/**
 * Check if similar claim exists in a recent window
 */
const hasRecentClaim = async (userId, triggerType) => {
  const windowStart = new Date(Date.now() - CLAIM_WINDOW_MINUTES * 60 * 1000);

  const existing = await Claim.findOne({
    user_id: userId,
    trigger_type: triggerType,
    createdAt: { $gte: windowStart }
  });

  return !!existing;
};

/**
 * Validate user and policy status
 */
const validatePolicy = (user) => {
  if (!user) throw new Error('User not found');
  if (!user.policy || !user.policy.active) throw new Error('No active policy');
  if (!user.policy.plan) throw new Error('No plan assigned');
};

/**
 * Create claim and invoke payout.
 * @param {Object} user
 * @param {Object} trigger {type, value, threshold}
 * @param {Object} envData
 */
export const createClaimForTrigger = async (user, trigger, envData) => {
  try {
    validatePolicy(user);

    const populatedUser = await User.findById(user._id).populate('policy.plan');
    const plan = populatedUser.policy?.plan;
    if (!plan) {
      throw new Error('Plan not found for user policy');
    }

    const payoutMap = getPlanPayoutMap(plan);
    const expectedPayout = Math.min(payoutMap[trigger.type] || 0, plan.max_per_event || 0);

    // Avoid duplicate claims for same type within defined window
    const duplicate = await hasRecentClaim(user._id, trigger.type);
    if (duplicate) {
      console.log(`⏭️ Duplicate claim exists for user ${user._id} trigger ${trigger.type}`);
      return null;
    }

    // Create claim record
    const claim = await Claim.create({
      user_id: user._id,
      trigger_type: trigger.type,
      location: {
        lat: envData?.lat ?? populatedUser.location?.lat,
        lng: envData?.lng ?? populatedUser.location?.lng,
        city: envData?.city ?? populatedUser.location?.city
      },
      value: trigger.value,
      threshold: trigger.threshold,
      status: 'PENDING',
      fraud_score: 0,
      confidence_score: 0
    });

    // Fraud detection prior to payout
    const recentClaims = await getRecentClaims(user._id, 60);
    const fraudResult = await evaluateFraud(user, claim, recentClaims, {
      totalContribution: user.policy?.contribution || 0,
      expectedPayout
    });

    claim.fraud_score = fraudResult.fraudScore;
    claim.confidence_score = fraudResult.confidenceScore;
    claim.fraud_classification = fraudResult.classification;

    if (fraudResult.classification === 'SUSPICIOUS') {
      claim.status = 'SUSPICIOUS';
      await claim.save();
      console.warn(`🚨 Claim ${claim._id} flagged SUSPICIOUS for user ${user._id}. No auto payout.`);
      return claim;
    }

    if (fraudResult.classification === 'REVIEW') {
      claim.status = 'REVIEW';
      await claim.save();
      console.warn(`⚠️ Claim ${claim._id} requires review for user ${user._id}. No auto payout.`);
      return claim;
    }

    // NORMAL case: proceed with payout
    claim.status = 'PENDING';
    await claim.save();

    const payoutResult = await processPayout(populatedUser, claim, plan);

    claim.status = 'PAID';
    claim.payout = payoutResult.payout || claim.payout;
    await claim.save();

    console.log(`✅ Claim ${claim._id} paid: ${payoutResult.payout}`);
    return claim;

  } catch (error) {
    console.error(`❌ createClaimForTrigger failed for user ${user._id}:`, error.message);
    throw error;
  }
};
