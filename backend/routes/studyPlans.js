const express = require('express');
const router = express.Router();
const {
  generatePlan,
  getStudyPlans,
  getStudyPlanById,
  updateProgress,
  deletePlan,
} = require('../controllers/studyPlanController');
const { protect } = require('../middleware/auth');

router.post('/generate', protect, generatePlan);
router.get('/', protect, getStudyPlans);
router.get('/:id', protect, getStudyPlanById);
router.patch('/:id/progress', protect, updateProgress);
router.delete('/:id', protect, deletePlan);

module.exports = router;
