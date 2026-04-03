const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  submitReport,
  getModerationItems,
  restoreContent,
  deleteModeratedContent,
  suspendUser,
  unsuspendUser,
} = require('../controllers/moderationController');

router.post('/reports', protect, submitReport);
router.get('/items', protect, getModerationItems);
router.post('/items/:id/restore', protect, restoreContent);
router.delete('/items/:id/content', protect, deleteModeratedContent);
router.post('/users/:id/suspend', protect, suspendUser);
router.post('/users/:id/unsuspend', protect, unsuspendUser);

module.exports = router;