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
} = require('../controllers/questionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/').post(protect, createQuestion).get(getQuestions);
router.get('/similar', getSimilarQuestions);
router.get('/top-contributors', protect, getTopContributors);
router.route('/:id').get(protect, getQuestion).put(protect, updateQuestion).delete(protect, deleteQuestion);
router.post('/:id/vote', protect, voteQuestion);

module.exports = router;

