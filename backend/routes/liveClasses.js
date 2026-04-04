const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createLiveClass,
  updateLiveClass,
  cancelLiveClass,
  deleteLiveClass,
  getLiveClasses,
  joinLiveClass,
  leaveLiveClass,
  getClassAttendance,
} = require('../controllers/liveClassController');

router.get('/', protect, getLiveClasses);
router.post('/', protect, createLiveClass);
router.put('/:id', protect, updateLiveClass);
router.patch('/:id/cancel', protect, cancelLiveClass);
router.delete('/:id', protect, deleteLiveClass);

router.post('/:id/join', protect, joinLiveClass);
router.post('/:id/leave', protect, leaveLiveClass);
router.get('/:id/attendance', protect, getClassAttendance);

module.exports = router;