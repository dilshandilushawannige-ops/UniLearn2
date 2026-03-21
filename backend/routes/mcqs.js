const express = require('express');
const router = express.Router();
const {
  generateMCQSet,
  getMCQSet,
  getMCQSets,
  submitAttempt,
} = require('../controllers/mcqController');
const { protect } = require('../middleware/auth');

router.post('/generate', protect, generateMCQSet);
router.get('/', protect, getMCQSets);
router.get('/:id', protect, getMCQSet);
router.post('/:id/submit', protect, submitAttempt);

module.exports = router;
