const MCQSet = require('../models/MCQSet');
const ApiError = require('../utils/ApiError');

/**
 * Fetch random questions for a quiz battle from existing MCQ sets
 * @param {Number} year - Student's year
 * @param {Number} semester - Student's semester
 * @param {String} moduleCode - Module code
 * @param {Number} lectureStart - Starting lecture number
 * @param {Number} lectureEnd - Ending lecture number
 * @param {Number} count - Number of questions needed
 * @returns {Array} Array of question objects
 */
const fetchBattleQuestions = async (year, semester, moduleCode, lectureStart, lectureEnd, count) => {
  // Find MCQ sets matching the criteria
  const mcqSets = await MCQSet.find({
    year,
    semester,
    moduleCode: moduleCode.toUpperCase(),
    lectureFrom: { $gte: lectureStart },
    lectureTo: { $lte: lectureEnd },
  }).select('questions');

  if (!mcqSets || mcqSets.length === 0) {
    throw new ApiError(404, 'No MCQ sets found for the selected criteria');
  }

  // Collect all questions from matching sets
  const allQuestions = [];
  mcqSets.forEach((set) => {
    if (set.questions && set.questions.length > 0) {
      allQuestions.push(...set.questions);
    }
  });

  if (allQuestions.length === 0) {
    throw new ApiError(404, 'No questions available for the selected criteria');
  }

  // Shuffle and pick random questions
  const shuffled = allQuestions.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  if (selected.length < count) {
    console.warn(`Only ${selected.length} questions available, requested ${count}`);
  }

  // Return questions without exposing answer initially (we'll keep it server-side)
  return selected.map((q) => ({
    q: q.q,
    options: q.options,
    answerIndex: q.answerIndex,
    explanation: q.explanation,
  }));
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
