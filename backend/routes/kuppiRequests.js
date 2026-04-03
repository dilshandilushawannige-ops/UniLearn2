const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createKuppiRequest,
  getKuppiRequests,
  updateKuppiStatus,
  createStudentSession,
  reportKuppiSession,
} = require('../controllers/kuppiRequestController');

router.get('/', protect, getKuppiRequests);
router.post('/', protect, createKuppiRequest);
router.patch('/:id/status', protect, updateKuppiStatus);
router.post('/:id/session', protect, createStudentSession);
router.post('/:id/report', protect, reportKuppiSession);

module.exports = router;