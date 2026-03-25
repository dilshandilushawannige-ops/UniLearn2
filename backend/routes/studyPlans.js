const express = require('express');
const router  = express.Router();
const {
  generatePlan,
  getStudyPlans,
  getStudyPlanById,
  completeTask,
  generateDayMCQs,
  submitDayMCQ,
  generateDaySummaryController,
  updateProgress,
  deletePlan,
} = require('../controllers/studyPlanController');
const { protect } = require('../middleware/auth');

// ─── Plan-level routes ───────────────────────────────────────────────────────
router.post('/generate',     protect, generatePlan);
router.get('/',              protect, getStudyPlans);
router.get('/:id',           protect, getStudyPlanById);
router.patch('/:id/progress',protect, updateProgress); // legacy compat
router.delete('/:id',        protect, deletePlan);

// ─── Day-level task routes ───────────────────────────────────────────────────
router.patch('/:id/days/:dayNumber/tasks/:taskType/complete', protect, completeTask);
router.post( '/:id/days/:dayNumber/generate-mcqs',            protect, generateDayMCQs);
router.post( '/:id/days/:dayNumber/submit-mcq',               protect, submitDayMCQ);
router.post( '/:id/days/:dayNumber/generate-summary',         protect, generateDaySummaryController);

module.exports = router;
