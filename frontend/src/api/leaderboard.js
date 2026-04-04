import axios from './axios';

/**
 * Get global leaderboard
 * @param {Object} params - Query parameters
 * @param {Number} params.page - Page number
 * @param {Number} params.limit - Items per page
 * @param {Boolean} params.includeMe - Include current user's rank
 * @returns {Promise} Leaderboard data
 */
export const getLeaderboard = async (params = {}) => {
  const { page = 1, limit = 50, includeMe = true } = params;
  const response = await axios.get('/games/leaderboard', {
    params: { page, limit, includeMe },
  });
  return response.data.data;
};

/**
 * Get current user's rank
 * @returns {Promise} User rank data
 */
export const getMyRank = async () => {
  const response = await axios.get('/games/leaderboard/me');
  return response.data.data;
};

/**
 * Get top N players
 * @param {Number} limit - Number of top players
 * @returns {Promise} Top players array
 */
export const getTopPlayers = async (limit = 10) => {
  const response = await axios.get('/games/leaderboard/top', {
    params: { limit },
  });
  return response.data.data;
};

export default {
  getLeaderboard,
  getMyRank,
  getTopPlayers,
};
