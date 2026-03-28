const Resource = require('../models/Resource');
const ApiError = require('../utils/ApiError');
const { generateMCQs } = require('./geminiService');

/**
 * Generate AI-based questions for a quiz battle from uploaded lecture PDFs
 * @param {Number} year - Student's year
 * @param {Number} semester - Student's semester
 * @param {String} moduleCode - Module code
 * @param {Number} lectureStart - Starting lecture number
 * @param {Number} lectureEnd - Ending lecture number
 * @param {Number} count - Number of questions needed
 * @returns {Array} Array of question objects
 */
const fetchBattleQuestions = async (year, semester, moduleCode, lectureStart, lectureEnd, count) => {
  // Fetch lecture PDFs in the specified range
  const lectures = await Resource.find({
    year: Number(year),
    semester: Number(semester),
    moduleCode: moduleCode.toUpperCase(),
    resourceType: 'lecture_pdf',
    lectureNo: { $gte: Number(lectureStart), $lte: Number(lectureEnd) },
  }).sort({ lectureNo: 1 });

  if (lectures.length === 0) {
    throw new ApiError(404, 'No lecture PDFs found for the selected range. Please upload lecture PDFs first.');
  }

  // Prepare lecture data for AI generation
  const lectureData = lectures.map((l) => ({
    lectureNo: l.lectureNo,
    lectureTitle: l.lectureTitle || '',
    text: l.extractedText || '',
  }));

  // Generate MCQs using AI
  const mcqJson = await generateMCQs(moduleCode, lectureData, count);

  // Format questions for battle
  const questions = (mcqJson.questions || []).map((q) => ({
    q: q.q,
    options: q.options,
    answerIndex: q.answerIndex,
    explanation: q.explanation,
  }));

  if (questions.length === 0) {
    throw new ApiError(500, 'Failed to generate questions. Please try again.');
  }

  return questions;
};

/**
 * Calculate score for a player based on their answers
 * @param {Array} answers - Player's answers
 * @param {Array} questions - Battle questions
 * @returns {Number} Total score
 */
const calculateScore = (answers, questions) => {
  let score = 0;
  answers.forEach((answer) => {
    if (answer.isCorrect) {
      score += 1;
    }
  });
  return score;
};

module.exports = {
  fetchBattleQuestions,
  calculateScore,
};
