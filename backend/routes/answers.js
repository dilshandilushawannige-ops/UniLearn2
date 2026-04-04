const express = require('express');
const {
  createAnswer,
  getAnswersForQuestion,
  voteAnswer,
  acceptAnswer,
  updateAnswer,
  deleteAnswer,
  toggleBookmarkAnswer,
  getMyBookmarkedAnswers,
} = require('../controllers/answerController');
const { protect, optionalProtect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createAnswer);
router.get('/bookmarks/mine', protect, getMyBookmarkedAnswers);
router.get('/question/:questionId', optionalProtect, getAnswersForQuestion);
router.post('/:id/bookmark', protect, toggleBookmarkAnswer);
router.post('/:id/vote', protect, voteAnswer);
router.post('/:id/accept', protect, acceptAnswer);
router.put('/:id', protect, updateAnswer);
router.delete('/:id', protect, deleteAnswer);

module.exports = router;

