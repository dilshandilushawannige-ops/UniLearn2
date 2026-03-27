const express = require('express');
const {
  createAnswer,
  getAnswersForQuestion,
  voteAnswer,
  acceptAnswer,
  updateAnswer,
  deleteAnswer,
} = require('../controllers/answerController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createAnswer);
router.get('/question/:questionId', getAnswersForQuestion);
router.post('/:id/vote', protect, voteAnswer);
router.post('/:id/accept', protect, acceptAnswer);
router.put('/:id', protect, updateAnswer);
router.delete('/:id', protect, deleteAnswer);

module.exports = router;

