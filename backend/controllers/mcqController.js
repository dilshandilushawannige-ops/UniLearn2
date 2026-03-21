// controllers/mcqController.js
const MCQSet = require('../models/MCQSet');
const Resource = require('../models/Resource');
const { generateMCQs } = require('../services/geminiService');

// @desc  Generate MCQ set from a lecture range
// @route POST /api/mcqs/generate
// @access Private
const generateMCQSet = async (req, res) => {
  try {
    const { year, semester, moduleCode, lectureFrom, lectureTo, numQuestions } = req.body;

    if (!year || !semester || !moduleCode || !lectureFrom || !lectureTo) {
      return res.status(400).json({ message: 'year, semester, moduleCode, lectureFrom, lectureTo are required' });
    }

    // Fetch lecture PDFs in range
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

    const count = numQuestions ? Math.min(Number(numQuestions), 30) : 10;
    const mcqJson = await generateMCQs(moduleCode, lectureData, count);

    const questions = (mcqJson.questions || []).map((q) => ({
      q: q.q,
      options: q.options,
      answerIndex: q.answerIndex,
      explanation: q.explanation,
    }));

    const mcqSet = await MCQSet.create({
      user: req.user._id,
      year: Number(year),
      semester: Number(semester),
      moduleCode: moduleCode.toUpperCase(),
      lectureFrom: Number(lectureFrom),
      lectureTo: Number(lectureTo),
      questions,
      attempts: [],
      bestScore: 0,
    });

    res.status(201).json(mcqSet);
  } catch (error) {
    console.error('MCQ generation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get a single MCQ set (without answers for attempt UI)
// @route GET /api/mcqs/:id
// @access Private
const getMCQSet = async (req, res) => {
  try {
    const mcqSet = await MCQSet.findOne({ _id: req.params.id, user: req.user._id });
    if (!mcqSet) return res.status(404).json({ message: 'MCQ set not found' });
    res.json(mcqSet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all MCQ sets for logged-in user
// @route GET /api/mcqs
// @access Private
const getMCQSets = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.moduleCode) filter.moduleCode = req.query.moduleCode.toUpperCase();
    const sets = await MCQSet.find(filter).sort({ createdAt: -1 });
    res.json(sets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Submit an MCQ attempt
// @route POST /api/mcqs/:id/submit
// @access Private
// Body: { answers: [0, 2, 1, ...] }  (array of chosen option indices)
const submitAttempt = async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers must be an array of indices' });
    }

    const mcqSet = await MCQSet.findOne({ _id: req.params.id, user: req.user._id });
    if (!mcqSet) return res.status(404).json({ message: 'MCQ set not found' });

    let score = 0;
    const results = mcqSet.questions.map((q, i) => {
      const chosen = answers[i] !== undefined ? answers[i] : -1;
      const correct = chosen === q.answerIndex;
      if (correct) score++;
      return {
        q: q.q,
        chosen,
        correct,
        answerIndex: q.answerIndex,
        explanation: q.explanation,
      };
    });

    mcqSet.attempts.push({ score, total: mcqSet.questions.length, answers });
    if (score > mcqSet.bestScore) mcqSet.bestScore = score;
    await mcqSet.save();

    res.json({
      score,
      total: mcqSet.questions.length,
      percentage: Math.round((score / mcqSet.questions.length) * 100),
      results,
      bestScore: mcqSet.bestScore,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { generateMCQSet, getMCQSet, getMCQSets, submitAttempt };
