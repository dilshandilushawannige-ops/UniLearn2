const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  getGlobalLeaderboard,
  getUserRank,
  getTopPlayers,
} = require('../services/leaderboardService');

/**
 * @desc    Get global leaderboard
 * @route   GET /api/games/leaderboard
 * @access  Private
 */
const getLeaderboard = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, includeMe = 'true' } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  // Validate pagination params
  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ApiError(400, 'Invalid pagination parameters');
  }

  const currentUserId = includeMe === 'true' ? req.user._id.toString() : null;

  const leaderboardData = await getGlobalLeaderboard({
    page: pageNum,
    limit: limitNum,
    currentUserId,
  });

  res.json({
    success: true,
    data: leaderboardData,
  });
});

/**
 * @desc    Get current user's leaderboard rank
 * @route   GET /api/games/leaderboard/me
 * @access  Private
 */
const getMyRank = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  const rankData = await getUserRank(userId);

  res.json({
    success: true,
    data: rankData,
  });
});

/**
 * @desc    Get top N players (for dashboard widget)
 * @route   GET /api/games/leaderboard/top
 * @access  Private
 */
const getTop = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = parseInt(limit, 10);

  if (limitNum < 1 || limitNum > 50) {
    throw new ApiError(400, 'Limit must be between 1 and 50');
  }

  const topPlayers = await getTopPlayers(limitNum);

  res.json({
    success: true,
    data: topPlayers,
  });
});

module.exports = {
  getLeaderboard,
  getMyRank,
  getTop,
};
