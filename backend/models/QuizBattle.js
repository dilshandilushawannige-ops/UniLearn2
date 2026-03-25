const mongoose = require('mongoose');

const battleQuestionSchema = new mongoose.Schema({
  q: String,
  options: [String],
  answerIndex: Number,
  explanation: String,
});

const playerAnswerSchema = new mongoose.Schema({
  questionIndex: Number,
  selectedAnswer: Number, // -1 for unanswered/timeout
  isCorrect: Boolean,
  answeredAt: Date,
  timeSpent: Number, // milliseconds
});

const quizBattleSchema = new mongoose.Schema(
  {
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    semester: { type: Number, required: true },
    moduleCode: { type: String, required: true, uppercase: true },
    lectureStart: { type: Number, required: true },
    lectureEnd: { type: Number, required: true },
    questionCount: { type: Number, required: true },
    timePerQuestion: { type: Number, required: true }, // seconds
    
    // Store the actual questions for this battle
    questions: [battleQuestionSchema],
    
    currentQuestionIndex: { type: Number, default: 0 },
    
    // Track answers for both players
    player1Answers: [playerAnswerSchema],
    player2Answers: [playerAnswerSchema],
    
    player1Score: { type: Number, default: 0 },
    player2Score: { type: Number, default: 0 },
    
    status: {
      type: String,
      enum: ['waiting', 'active', 'finished', 'abandoned'],
      default: 'waiting',
    },
    
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for draw
    
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for efficient queries
quizBattleSchema.index({ player1: 1, status: 1, createdAt: -1 });
quizBattleSchema.index({ player2: 1, status: 1, createdAt: -1 });
quizBattleSchema.index({ status: 1, createdAt: -1 });

// Virtual for determining if it's a draw
quizBattleSchema.virtual('isDraw').get(function () {
  return this.status === 'finished' && !this.winner;
});

module.exports = mongoose.model('QuizBattle', quizBattleSchema);
