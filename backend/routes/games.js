const express = require('express');
const router = express.Router();
const {
  getOnlineStudents,
  createInvite,
  getInvites,
  respondToInvite,
  getBattle,
  getBattleHistory,
  getGameStats,
} = require('../controllers/gameController');
const {
  getLeaderboard,
  getMyRank,
  getTop,
} = require('../controllers/leaderboardController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Game routes
router.get('/online-students', getOnlineStudents);
router.post('/invite', createInvite);
router.get('/invites', getInvites);
router.post('/invites/:id/respond', respondToInvite);
router.get('/battles/:id', getBattle);
router.get('/history', getBattleHistory);
router.get('/stats', getGameStats);

// Leaderboard routes
router.get('/leaderboard/top', getTop);
router.get('/leaderboard/me', getMyRank);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
