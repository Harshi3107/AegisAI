import Claim from '../models/Claim.js';

/**
 * Fraud scoring based on a set of signals.
 * @param {Object} user
 * @param {Object} claim
 * @param {Array<Object>} recentClaims
 * @param {Object} contributionData { totalContribution }
 */
export const evaluateFraud = async (user, claim, recentClaims = [], contributionData = {}) => {
  if (!user || !claim) {
    throw new Error('Missing user or claim for fraud evaluation');
  }

  // Signal weights (sum = 1)
  const weights = {
    frequency: 0.25,
    locationMismatch: 0.2,
    noRide: 0.15,
    repeatEvent: 0.2,
    payoutContribution: 0.2
  };

  let frequencyScore = 0;
  let locationScore = 0;
  let noRideScore = 0;
  let repeatEventScore = 0;
  let payoutContributionScore = 0;
  const claimLocation = claim.location || {};
  const userLocation = user.location || {};

  // High frequency: more claims in a short period = higher score
  frequencyScore = Math.min(recentClaims.length / 4, 1);

  // Location mismatch between claim and user location
  if (claimLocation.city && userLocation.city) {
    locationScore = claimLocation.city.trim().toLowerCase() === userLocation.city.trim().toLowerCase() ? 0 : 1;
  } else if (claimLocation.lat !== undefined && claimLocation.lng !== undefined && userLocation.lat !== undefined && userLocation.lng !== undefined) {
    const distanceDelta = Math.abs(claimLocation.lat - userLocation.lat) + Math.abs(claimLocation.lng - userLocation.lng);
    locationScore = Math.min(distanceDelta / 2, 1);
  } else if (!userLocation.city) {
    locationScore = 0.5;
  }

  // no ride activity: use lastRideActivityAt/lastRideDate when available
  const lastRideActivityAt = user.lastRideActivityAt || user.lastRideDate || user.lastRideAt;
  if (lastRideActivityAt) {
    const daysSinceRide = (Date.now() - new Date(lastRideActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    noRideScore = daysSinceRide > 30 ? 1 : Math.min(daysSinceRide / 30, 1);
  } else {
    noRideScore = 0.35;
  }

  // repeated same event claims in recent window
  const sameTypeClaims = recentClaims.filter((c) => c.trigger_type === claim.trigger_type).length;
  repeatEventScore = Math.min(sameTypeClaims / 3, 1);

  // payout vs contribution ratio
  const totalContribution = contributionData.totalContribution || 0;
  const claimPayout = contributionData.expectedPayout || claim.payout || 0;
  const ratio = totalContribution > 0 ? claimPayout / totalContribution : 0.5;
  payoutContributionScore = ratio > 0.2 ? Math.min((ratio - 0.2) * 1.5, 1) : 0;

  // Weighted fraud score
  const fraudScore = Math.min(
    frequencyScore * weights.frequency +
    locationScore * weights.locationMismatch +
    noRideScore * weights.noRide +
    repeatEventScore * weights.repeatEvent +
    payoutContributionScore * weights.payoutContribution,
    1
  );

  let classification = 'NORMAL';
  if (fraudScore >= 0.6) classification = 'SUSPICIOUS';
  else if (fraudScore >= 0.3) classification = 'REVIEW';

  const confidenceScore = Math.max(0, Math.min(1, 1 - Math.abs(0.5 - fraudScore) * 2));

  return {
    fraudScore,
    confidenceScore,
    classification,
    signals: {
      frequencyScore,
      locationScore,
      noRideScore,
      repeatEventScore,
      payoutContributionScore
    }
  };
};

/**
 * Retrieve recent claims for given user.
 */
export const getRecentClaims = async (userId, minutes = 60) => {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return await Claim.find({ user_id: userId, createdAt: { $gte: since } }).sort({ createdAt: -1 });
};
