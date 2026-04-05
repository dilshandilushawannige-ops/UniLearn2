const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  dismissNotification,
  clearAllNotifications,
  markAllNotificationsRead,
} = require('../controllers/notificationController');

router.get('/', protect, getNotifications);
router.patch('/:id/dismiss', protect, dismissNotification);
router.post('/clear-all', protect, clearAllNotifications);
router.post('/mark-read-all', protect, markAllNotificationsRead);

module.exports = router;