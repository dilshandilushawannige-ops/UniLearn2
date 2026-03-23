// controllers/studyPlanController.js
const StudyPlan = require('../models/StudyPlan');
const Resource = require('../models/Resource');
const { generateStudyPlan } = require('../services/geminiService');

// Helper: build structured days array from planJson
const buildDays = (planJson) => {
  if (!planJson || !Array.isArray(planJson.days)) return [];
  return planJson.days.map((d) => ({
    day: d.day,
    date: d.date || '',
    topics: [...(d.topics || []), ...(d.activities || [])],
    completed: false,
  }));
};

// @desc  Generate a new study plan
// @route POST /api/studyplans/generate
// @access Private
const generatePlan = async (req, res) => {
  try {
    const { year, semester, moduleCode, lectureFrom, lectureTo, examDate } = req.body;

    if (!year || !semester || !moduleCode || !lectureFrom || !lectureTo || !examDate) {
      return res.status(400).json({ message: 'year, semester, moduleCode, lectureFrom, lectureTo, examDate are required' });
    }

    const exam = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
    const daysAvailable = Math.max(diff, 1);

    // Fetch lecture PDFs in range, sorted by lectureNo
    const lectures = await Resource.find({
      year: Number(year),
      semester: Number(semester),
      moduleCode: moduleCode.toUpperCase(),
      resourceType: 'lecture_pdf',
      lectureNo: { $gte: Number(lectureFrom), $lte: Number(lectureTo) },
    }).sort({ lectureNo: 1 });

    if (lectures.length === 0) {
      return res.status(404).json({
        message: 'No lecture PDFs found for the selected range. Please upload lecture PDFs first.',
      });
    }

    const lectureData = lectures.map((l) => ({
      lectureNo: l.lectureNo,
      lectureTitle: l.lectureTitle || '',
      text: l.extractedText || '',
    }));

    const planJson = await generateStudyPlan(daysAvailable, moduleCode, lectureData, examDate);
    const days = buildDays(planJson);

    const studyPlan = await StudyPlan.create({
      user: req.user._id,
      year: Number(year),
      semester: Number(semester),
      moduleCode: moduleCode.toUpperCase(),
      lectureFrom: Number(lectureFrom),
      lectureTo: Number(lectureTo),
      examDate: exam,
      daysAvailable,
      planJson,
      days,
      completionPercent: 0,
    });

    res.status(201).json(studyPlan);
  } catch (error) {
    console.error('Study plan generation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all study plans for logged-in user
// @route GET /api/studyplans?moduleCode=
// @access Private
const getStudyPlans = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.moduleCode) filter.moduleCode = req.query.moduleCode.toUpperCase();

    const plans = await StudyPlan.find(filter).sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get a single study plan
// @route GET /api/studyplans/:id
// @access Private
const getStudyPlanById = async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Study plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Mark days as completed and recompute progress
// @route PATCH /api/studyplans/:id/progress
// @access Private
// Body: { dayIndex: 0, completed: true }  OR  { completedDays: [0,1,2] }
const updateProgress = async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Study plan not found' });

    if (Array.isArray(req.body.completedDays)) {
      // Bulk update
      plan.days.forEach((d, i) => {
        d.completed = req.body.completedDays.includes(i);
      });
    } else if (req.body.dayIndex !== undefined) {
      const idx = Number(req.body.dayIndex);
      if (plan.days[idx]) plan.days[idx].completed = Boolean(req.body.completed);
    }

    const completedCount = plan.days.filter((d) => d.completed).length;
    plan.completionPercent =
      plan.days.length > 0 ? Math.round((completedCount / plan.days.length) * 100) : 0;

    plan.markModified('days');
    await plan.save();

    res.json({ completionPercent: plan.completionPercent, days: plan.days });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a study plan
// @route DELETE /api/studyplans/:id
// @access Private
const deletePlan = async (req, res) => {
  try {
    const plan = await StudyPlan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Study plan not found' });
    res.json({ message: 'Study plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { generatePlan, getStudyPlans, getStudyPlanById, updateProgress, deletePlan };
