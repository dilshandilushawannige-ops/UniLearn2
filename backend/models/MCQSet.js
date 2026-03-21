const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  q: String,
  options: [String],
  answerIndex: Number,
  explanation: String,
});

const attemptSchema = new mongoose.Schema({
  score: Number,
  total: Number,
  answers: [Number], // user's chosen indices
  attemptedAt: { type: Date, default: Date.now },
});

const mcqSetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    semester: { type: Number, required: true },
    moduleCode: { type: String, required: true, uppercase: true },
    lectureFrom: { type: Number, required: true },
    lectureTo: { type: Number, required: true },
    questions: [questionSchema],
    attempts: [attemptSchema],
    bestScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MCQSet', mcqSetSchema);
