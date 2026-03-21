const mongoose = require('mongoose');

const daySchema = new mongoose.Schema({
  day: Number,
  date: String,
  topics: [String],
  completed: { type: Boolean, default: false },
});

const studyPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    semester: { type: Number, required: true },
    moduleCode: { type: String, required: true, uppercase: true },
    lectureFrom: { type: Number, required: true },
    lectureTo: { type: Number, required: true },
    examDate: { type: Date, required: true },
    daysAvailable: { type: Number, required: true },
    planJson: { type: mongoose.Schema.Types.Mixed, required: true }, // full AI JSON
    days: [daySchema], // structured days for progress tracking
    completionPercent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
