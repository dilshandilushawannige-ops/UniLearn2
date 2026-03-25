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
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/online-students', getOnlineStudents);
router.post('/invite', createInvite);
router.get('/invites', getInvites);
router.post('/invites/:id/respond', respondToInvite);
router.get('/battles/:id', getBattle);
router.get('/history', getBattleHistory);
router.get('/stats', getGameStats);

module.exports = router;
