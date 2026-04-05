const User = require('../models/User');

/**
 * Get global leaderboard with pagination
 * @param {Object} options - Query options
 * @param {Number} options.page - Page number (default: 1)
 * @param {Number} options.limit - Items per page (default: 50)
 * @param {String} options.currentUserId - Current user ID to include their rank
 * @returns {Object} Leaderboard data with pagination and user rank
 */
const getGlobalLeaderboard = async ({ page = 1, limit = 50, currentUserId }) => {
  const skip = (page - 1) * limit;

  // Build query - only include users with at least 1 match
  const query = { 'gameStats.totalMatches': { $gt: 0 } };

  // Get total count
  const totalItems = await User.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limit);

  // Fetch leaderboard users with proper sorting
  // Sort by: rating desc, wins desc, totalMatches desc
  const users = await User.find(query)
    .select('username email avatar currentYear currentSemester gameStats')
    .sort({
      'gameStats.rating': -1,
      'gameStats.wins': -1,
      'gameStats.totalMatches': -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();

  // Map users to leaderboard format with rank
  const items = users.map((user, index) => {
    const rank = skip + index + 1;
    return mapLeaderboardUser(user, rank);
  });

  // Get current user's rank if requested
  let myRank = null;
  if (currentUserId) {
    myRank = await getUserRank(currentUserId);
  }

  return {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
    },
    me: myRank,
  };
};

/**
 * Get user's current rank and stats
 * @param {String} userId - User ID
 * @returns {Object} User rank and stats
 */
const getUserRank = async (userId) => {
  const user = await User.findById(userId)
    .select('username email avatar currentYear currentSemester gameStats')
    .lean();

  if (!user || !user.gameStats || user.gameStats.totalMatches === 0) {
    return {
      rank: null,
      rating: user?.gameStats?.rating || 1000,
      wins: 0,
      losses: 0,
      draws: 0,
      totalMatches: 0,
      winRate: 0,
      winStreak: 0,
      bestWinStreak: 0,
    };
  }

  // Calculate rank by counting users with better stats
  // A user ranks higher if they have:
  // 1. Higher rating, OR
  // 2. Same rating but more wins, OR
  // 3. Same rating and wins but more total matches
  const rank = await User.countDocuments({
    'gameStats.totalMatches': { $gt: 0 },
    $or: [
      { 'gameStats.rating': { $gt: user.gameStats.rating } },
      {
        'gameStats.rating': user.gameStats.rating,
        'gameStats.wins': { $gt: user.gameStats.wins },
      },
      {
        'gameStats.rating': user.gameStats.rating,
        'gameStats.wins': user.gameStats.wins,
        'gameStats.totalMatches': { $gt: user.gameStats.totalMatches },
      },
    ],
  });

  const winRate = calculateWinRate(user.gameStats.wins, user.gameStats.totalMatches);

  return {
    rank: rank + 1,
    userId: user._id,
    username: user.username,
    avatar: user.avatar,
    rating: user.gameStats.rating,
    wins: user.gameStats.wins,
    losses: user.gameStats.losses,
    draws: user.gameStats.draws,
    totalMatches: user.gameStats.totalMatches,
    winRate,
    winStreak: user.gameStats.winStreak,
    bestWinStreak: user.gameStats.bestWinStreak,
  };
};

/**
 * Get top N players for dashboard widget
 * @param {Number} limit - Number of top players (default: 10)
 * @returns {Array} Top players
 */
const getTopPlayers = async (limit = 10) => {
  const query = { 'gameStats.totalMatches': { $gt: 0 } };

  const users = await User.find(query)
    .select('username email avatar currentYear currentSemester gameStats')
    .sort({
      'gameStats.rating': -1,
      'gameStats.wins': -1,
      'gameStats.totalMatches': -1,
    })
    .limit(limit)
    .lean();

  return users.map((user, index) => mapLeaderboardUser(user, index + 1));
};

/**
 * Map user document to leaderboard format
 * @param {Object} user - User document
 * @param {Number} rank - User's rank
 * @returns {Object} Formatted leaderboard entry
 */
const mapLeaderboardUser = (user, rank) => {
  const gameStats = user.gameStats || {};
  const winRate = calculateWinRate(gameStats.wins, gameStats.totalMatches);

  return {
    rank,
    userId: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    currentYear: user.currentYear,
    currentSemester: user.currentSemester,
    rating: gameStats.rating || 1000,
    totalMatches: gameStats.totalMatches || 0,
    wins: gameStats.wins || 0,
    losses: gameStats.losses || 0,
    draws: gameStats.draws || 0,
    winRate,
    winStreak: gameStats.winStreak || 0,
    bestWinStreak: gameStats.bestWinStreak || 0,
  };
};

/**
 * Calculate win rate percentage
 * @param {Number} wins - Number of wins
 * @param {Number} totalMatches - Total matches played
 * @returns {Number} Win rate percentage (0-100)
 */
const calculateWinRate = (wins, totalMatches) => {
  if (!totalMatches || totalMatches === 0) return 0;
  return Math.round((wins / totalMatches) * 100);
};

module.exports = {
  getGlobalLeaderboard,
  getUserRank,
  getTopPlayers,
  mapLeaderboardUser,
  calculateWinRate,
};
