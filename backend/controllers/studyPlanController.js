// controllers/studyPlanController.js
const StudyPlan = require('../models/StudyPlan');
const Resource = require('../models/Resource');
const {
  generateStudyPlan,
  generateMCQs,
  generateDaySummary,
} = require('../services/geminiService');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build enriched `days` array from AI planJson + lecture resources.
 * We map each day's "focus" lectures to their full extracted text.
 */
const buildDays = (planJson, lectures) => {
  if (!planJson || !Array.isArray(planJson.days)) return [];

  // Map lectureNo → resource for quick lookup
  const lectureMap = new Map(lectures.map((l) => [l.lectureNo, l]));

  return planJson.days.map((d, idx) => {
    // Figure out which lectures belong to this day from the focus field
    // The AI puts strings like "Lecture 1, Lecture 2" or lectureNo refs in topics
    const dayLecNos = extractLectureNos(d.focus, d.topics, lectures);

    const assignedContent = dayLecNos.map((no) => {
      const res = lectureMap.get(no);
      return {
        lectureNo: no,
        title: res?.lectureTitle || `Lecture ${no}`,
        topics: d.topics || [],
        contentText: res?.extractedText || '',
      };
    });

    // If no lectures mapped, fall back to all when it's day 1
    // or distribute proportionally
    const finalContent = assignedContent.length > 0
      ? assignedContent
      : lectures.slice(0, 1).map((l) => ({
        lectureNo: l.lectureNo,
        title: l.lectureTitle || `Lecture ${l.lectureNo}`,
        topics: d.topics || [],
        contentText: l.extractedText || '',
      }));

    return {
      dayNumber: d.day || idx + 1,
      date: d.date || '',
      focus: d.focus || '',
      status: idx === 0 ? 'in_progress' : 'locked',
      assignedContent: finalContent,
      tasks: {
        readTask: { completed: false, completedAt: null },
        reviewTask: { completed: false, completedAt: null },
        mcqTask: { unlocked: false, completed: false, completedAt: null, score: null, mcqs: [] },
        summaryTask: { unlocked: false, completed: false, completedAt: null, summaryText: '' },
      },
      completed: false,
    };
  });
};

/**
 * Parse lecture numbers referenced in AI plan focus/topics fields.
 * e.g. "Lecture 1 - Introduction" → [1]
 */
const extractLectureNos = (focus = '', topics = [], lectures = []) => {
  const text = `${focus} ${topics.join(' ')}`.toLowerCase();
  const found = new Set();

  // Match patterns like "lecture 1", "lec 3", "lecture01"
  const matches = text.matchAll(/(?:lecture|lec)\s*(\d+)/gi);
  for (const m of matches) {
    const no = parseInt(m[1], 10);
    if (lectures.some((l) => l.lectureNo === no)) found.add(no);
  }

  return found.size > 0 ? [...found].sort((a, b) => a - b) : [];
};

/**
 * Recompute completion % and currentDayIndex after any task/day mutation.
 */
const recomputeProgress = (plan) => {
  const totalDays = plan.days.length;
  if (totalDays === 0) { plan.completionPercent = 0; return; }

  const completedDays = plan.days.filter((d) => d.status === 'completed').length;
  plan.completionPercent = Math.round((completedDays / totalDays) * 100);

  // currentDayIndex = index of first non-completed day
  const inProgressIdx = plan.days.findIndex((d) => d.status === 'in_progress');
  plan.currentDayIndex = inProgressIdx >= 0 ? inProgressIdx : completedDays;
};

/**
 * After a day is fully completed, check if next day should be unlocked.
 */
const checkAndUnlockNextDay = (plan, dayIndex) => {
  const day = plan.days[dayIndex];
  if (!day) return;

  const allTasksDone =
    day.tasks.readTask.completed &&
    day.tasks.reviewTask.completed &&
    day.tasks.mcqTask.completed &&
    day.tasks.summaryTask.completed;

  if (allTasksDone) {
    day.status = 'completed';
    day.completed = true;

    const next = plan.days[dayIndex + 1];
    if (next && next.status === 'locked') {
      next.status = 'in_progress';
    }
  }

  recomputeProgress(plan);
};

// ─── Controllers ────────────────────────────────────────────────────────────

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
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
    const daysAvailable = Math.max(diff, 1);

    // Fetch lecture PDFs in range sorted by lectureNo
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
    const days = buildDays(planJson, lectures);

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
      currentDayIndex: 0,
    });

    res.status(201).json(studyPlan);
  } catch (error) {
    console.error('Study plan generation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all study plans for logged-in user
// @route GET /api/studyplans
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

// @desc  Mark a specific task as complete
// @route PATCH /api/studyplans/:id/days/:dayNumber/tasks/:taskType/complete
// @access Private
//   taskType: readTask | reviewTask | mcqTask | summaryTask
const completeTask = async (req, res) => {
  try {
    const { id, dayNumber, taskType } = req.params;
    const validTasks = ['readTask', 'reviewTask', 'mcqTask', 'summaryTask'];
    if (!validTasks.includes(taskType)) {
      return res.status(400).json({ message: `Invalid taskType. Must be one of: ${validTasks.join(', ')}` });
    }

    const plan = await StudyPlan.findOne({ _id: id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Study plan not found' });

    const dayIdx = plan.days.findIndex((d) => d.dayNumber === Number(dayNumber));
    if (dayIdx === -1) return res.status(404).json({ message: 'Day not found' });

    const day = plan.days[dayIdx];

    // Gate checks
    if (day.status === 'locked') {
      return res.status(403).json({ message: 'This day is still locked. Complete previous days first.' });
    }
    if (taskType === 'mcqTask' && (!day.tasks.readTask.completed || !day.tasks.reviewTask.completed)) {
      return res.status(403).json({ message: 'Complete Read and Review tasks before attempting MCQ.' });
    }
    if (taskType === 'summaryTask' && !day.tasks.mcqTask.completed) {
      return res.status(403).json({ message: 'Complete the MCQ task before generating a summary.' });
    }

    day.tasks[taskType].completed = true;
    day.tasks[taskType].completedAt = new Date();

    // Auto-unlock next tasks
    if (taskType === 'readTask' || taskType === 'reviewTask') {
      if (day.tasks.readTask.completed && day.tasks.reviewTask.completed) {
        day.tasks.mcqTask.unlocked = true;
      }
    }
    if (taskType === 'mcqTask') {
      day.tasks.summaryTask.unlocked = true;
    }

    checkAndUnlockNextDay(plan, dayIdx);

    plan.markModified('days');
    await plan.save();

    res.json({ plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Generate MCQs for a specific day
// @route POST /api/studyplans/:id/days/:dayNumber/generate-mcqs
// @access Private
const generateDayMCQs = async (req, res) => {
  try {
    const { id, dayNumber } = req.params;

    const plan = await StudyPlan.findOne({ _id: id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Study plan not found' });

    const dayIdx = plan.days.findIndex((d) => d.dayNumber === Number(dayNumber));
    if (dayIdx === -1) return res.status(404).json({ message: 'Day not found' });

    const day = plan.days[dayIdx];

    if (day.status === 'locked') {
      return res.status(403).json({ message: 'This day is locked.' });
    }
    if (!day.tasks.readTask.completed || !day.tasks.reviewTask.completed) {
      return res.status(403).json({ message: 'Complete Read and Review tasks before generating MCQs.' });
    }

    // Build lecture data from ONLY this day's assignedContent
    const lectureDayData = day.assignedContent.map((ac) => ({
      lectureNo: ac.lectureNo,
      lectureTitle: ac.title,
      text: ac.contentText,
    }));

    if (lectureDayData.length === 0) {
      return res.status(400).json({ message: 'No content assigned to this day for MCQ generation.' });
    }

    const result = await generateMCQs(plan.moduleCode, lectureDayData, 5);

    // Store MCQs in the day
    day.tasks.mcqTask.mcqs = result.questions || [];
    day.tasks.mcqTask.unlocked = true;

    plan.markModified('days');
    await plan.save();

    res.json({ mcqs: day.tasks.mcqTask.mcqs });
  } catch (error) {
    console.error('MCQ generation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Submit MCQ answers and mark MCQ task complete
// @route POST /api/studyplans/:id/days/:dayNumber/submit-mcq
// @access Private
// Body: { answers: [0, 2, 1, ...] }  (answerIndex per question)
const submitDayMCQ = async (req, res) => {
  try {
    const { id, dayNumber } = req.params;
    const { answers = [] } = req.body;

    const plan = await StudyPlan.findOne({ _id: id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Study plan not found' });

    const dayIdx = plan.days.findIndex((d) => d.dayNumber === Number(dayNumber));
    if (dayIdx === -1) return res.status(404).json({ message: 'Day not found' });

    const day = plan.days[dayIdx];

    if (!day.tasks.mcqTask.unlocked || day.tasks.mcqTask.mcqs.length === 0) {
      return res.status(400).json({ message: 'MCQs not generated yet for this day.' });
    }

    // Grade answers
    const mcqs = day.tasks.mcqTask.mcqs;
    let correct = 0;
    const results = mcqs.map((mcq, i) => {
      const isCorrect = answers[i] === mcq.answerIndex;
      if (isCorrect) correct++;
      return {
        question: mcq.q,
        options: mcq.options,
        selected: answers[i] ?? null,
        correctIndex: mcq.answerIndex,
        isCorrect,
        explanation: mcq.explanation,
      };
    });

    const score = Math.round((correct / mcqs.length) * 100);

    day.tasks.mcqTask.completed = true;
    day.tasks.mcqTask.completedAt = new Date();
    day.tasks.mcqTask.score = score;
    day.tasks.summaryTask.unlocked = true;

    checkAndUnlockNextDay(plan, dayIdx);
    plan.markModified('days');
    await plan.save();

    res.json({ score, correct, total: mcqs.length, results, plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Generate a revision summary for a specific day
// @route POST /api/studyplans/:id/days/:dayNumber/generate-summary
// @access Private
const generateDaySummaryController = async (req, res) => {
  try {
    const { id, dayNumber } = req.params;

    const plan = await StudyPlan.findOne({ _id: id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Study plan not found' });

    const dayIdx = plan.days.findIndex((d) => d.dayNumber === Number(dayNumber));
    if (dayIdx === -1) return res.status(404).json({ message: 'Day not found' });

    const day = plan.days[dayIdx];

    if (day.status === 'locked') {
      return res.status(403).json({ message: 'This day is locked.' });
    }
    if (!day.tasks.mcqTask.completed) {
      return res.status(403).json({ message: 'Complete the MCQ task before generating a summary.' });
    }

    const result = await generateDaySummary(
      plan.moduleCode,
      day.dayNumber,
      day.assignedContent
    );

    day.tasks.summaryTask.summaryText = result.summaryText || '';
    day.tasks.summaryTask.completed = true;
    day.tasks.summaryTask.completedAt = new Date();
    day.tasks.summaryTask.unlocked = true;

    checkAndUnlockNextDay(plan, dayIdx);
    plan.markModified('days');
    await plan.save();

    res.json({ summaryText: day.tasks.summaryTask.summaryText, plan });
  } catch (error) {
    console.error('Summary generation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Legacy: Mark day completed/uncompleted (kept for backward compat)
// @route PATCH /api/studyplans/:id/progress
// @access Private
const updateProgress = async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Study plan not found' });

    if (Array.isArray(req.body.completedDays)) {
      plan.days.forEach((d, i) => { d.completed = req.body.completedDays.includes(i); });
    } else if (req.body.dayIndex !== undefined) {
      const idx = Number(req.body.dayIndex);
      if (plan.days[idx]) plan.days[idx].completed = Boolean(req.body.completed);
    }

    const completedCount = plan.days.filter((d) => d.completed).length;
    plan.completionPercent = plan.days.length > 0
      ? Math.round((completedCount / plan.days.length) * 100)
      : 0;

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

module.exports = {
  generatePlan,
  getStudyPlans,
  getStudyPlanById,
  completeTask,
  generateDayMCQs,
  submitDayMCQ,
  generateDaySummaryController,
  updateProgress,
  deletePlan,
};
