const mongoose = require('mongoose');

// ── Sub-schemas for per-day task tracking ────────────────────────────────────

const mcqSchema = new mongoose.Schema({
  q: { type: String, required: true },
  options: [String],
  answerIndex: { type: Number, required: true },
  explanation: { type: String, default: '' },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  readTask:   { completed: { type: Boolean, default: false }, completedAt: { type: Date, default: null } },
  reviewTask: { completed: { type: Boolean, default: false }, completedAt: { type: Date, default: null } },
  mcqTask: {
    unlocked:    { type: Boolean, default: false },
    completed:   { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    score:       { type: Number, default: null },
    mcqs:        { type: [mcqSchema], default: [] },
  },
  summaryTask: {
    unlocked:    { type: Boolean, default: false },
    completed:   { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    summaryText: { type: String, default: '' },
  },
}, { _id: false });

// Assigned content for each day (which lectures/topics belong to that day)
const assignedContentSchema = new mongoose.Schema({
  lectureNo:    { type: Number },
  title:        { type: String, default: '' },
  topics:       [String],
  contentText:  { type: String, default: '' }, // extracted text for AI
}, { _id: false });

const daySchema = new mongoose.Schema({
  dayNumber: { type: Number, required: true },
  date:      { type: String, default: '' },
  focus:     { type: String, default: '' },
  // status: locked | upcoming | in_progress | completed
  status:    { type: String, enum: ['locked', 'upcoming', 'in_progress', 'completed'], default: 'locked' },
  assignedContent: { type: [assignedContentSchema], default: [] },
  tasks:     { type: taskSchema, default: () => ({}) },
  // Legacy field kept for backward-compat
  completed: { type: Boolean, default: false },
}, { _id: false });

// ── Main study plan schema ────────────────────────────────────────────────────

const studyPlanSchema = new mongoose.Schema(
  {
    user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year:             { type: Number, required: true },
    semester:         { type: Number, required: true },
    moduleCode:       { type: String, required: true, uppercase: true },
    lectureFrom:      { type: Number, required: true },
    lectureTo:        { type: Number, required: true },
    examDate:         { type: Date, required: true },
    daysAvailable:    { type: Number, required: true },
    planJson:         { type: mongoose.Schema.Types.Mixed, required: true },
    days:             { type: [daySchema], default: [] },
    completionPercent: { type: Number, default: 0 },
    currentDayIndex:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
