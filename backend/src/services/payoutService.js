import Transaction from '../models/Transaction.js';
import Claim from '../models/Claim.js';

const DEMO_PAYOUTS = {
  LOW: {
    rain: 200,
    heat: 150,
    aqi: 150,
    flood: 400
  },
  HIGH: {
    rain: 200,
    heat: 150,
    aqi: 150,
    flood: 350
  }
};

export const getPlanPayoutMap = (plan) => {
  if (!plan) return {};

  const demoPayouts = DEMO_PAYOUTS[String(plan.category || '').toUpperCase()] || {};
  if (process.env.NODE_ENV === 'development') {
    return demoPayouts;
  }

  return plan.payouts || demoPayouts;
};

/**
 * Enforce payout caps and create transaction.
 * @param {Object} user
 * @param {Object} claim
 * @param {Object} plan
 */
export const processPayout = async (user, claim, plan) => {
  if (!user || !claim || !plan) {
    throw new Error('Missing required data for payout');
  }
  if (claim.status !== 'PENDING') {
    throw new Error(`Claim ${claim._id} is not eligible for payout (status: ${claim.status})`);
  }

  // Determine base payout for trigger type
  const payoutMap = getPlanPayoutMap(plan);
  const basePayout = payoutMap[claim.trigger_type];
  if (typeof basePayout !== 'number') {
    throw new Error(`No payout configured for trigger ${claim.trigger_type}`);
  }

  // Enforce max_per_event
  const payoutAmount = Math.min(basePayout, plan.max_per_event);

  // Enforce weekly cap
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

  const weekTransactions = await Transaction.find({
    user_id: user._id,
    type: 'credit',
    createdAt: { $gte: weekStart, $lte: now }
  }).lean();

  const weeklyTotal = weekTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const availableWeekly = plan.weekly_cap - weeklyTotal;

  if (availableWeekly <= 0) {
    throw new Error('Weekly cap reached');
  }

  const finalPayout = Math.min(payoutAmount, availableWeekly);
  if (finalPayout <= 0) {
    throw new Error('No payout available after caps');
  }

  // Update user wallet
  user.wallet_balance = (user.wallet_balance || 0) + finalPayout;
  await user.save();

  // Create transaction
  const transaction = await Transaction.create({
    user_id: user._id,
    amount: finalPayout,
    type: 'credit',
    reason: `Claim payout for ${claim.trigger_type}`
  });

  // Mark claim as PAID
  claim.payout = finalPayout;
  claim.status = 'PAID';
  await claim.save();

  return { transaction, payout: finalPayout };
};
