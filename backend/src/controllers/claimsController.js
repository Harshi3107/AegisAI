import Claim from '../models/Claim.js';

// @desc    Get claims for profile
// @route   GET /api/claims
// @access  Private
export const getClaims = async (req, res, next) => {
  try {
    const query = req.user?._id ? { user_id: req.user._id } : {};
    const claims = await Claim.find(query).sort({ createdAt: -1 }).limit(50);

    res.status(200).json({
      success: true,
      data: claims
    });
  } catch (error) {
    next(error);
  }
};
