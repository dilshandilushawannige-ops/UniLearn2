const express = require('express');
const {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  voteQuestion,
  getSimilarQuestions,
  getTopContributors,
  toggleBookmarkQuestion,
  getMyBookmarkedQuestions,
} = require('../controllers/questionController');
const { protect, optionalProtect } = require('../middleware/auth');

const router = express.Router();

router.route('/').post(protect, createQuestion).get(optionalProtect, getQuestions);
router.get('/similar', getSimilarQuestions);
router.get('/top-contributors', protect, getTopContributors);
router.get('/bookmarks/mine', protect, getMyBookmarkedQuestions);
router.post('/:id/bookmark', protect, toggleBookmarkQuestion);
router.route('/:id').get(protect, getQuestion).put(protect, updateQuestion).delete(protect, deleteQuestion);
router.post('/:id/vote', protect, voteQuestion);

module.exports = router;

