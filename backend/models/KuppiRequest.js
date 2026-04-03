const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    meetingLink: { type: String, required: true, trim: true },
    scheduledTime: { type: Date, required: true },
    label: { type: String, default: 'Student Hosted Session', trim: true },
    createdAt: { type: Date, default: Date.now },
    reports: { type: [reportSchema], default: [] },
  },
  { _id: false }
);

const kuppiRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: { type: String, required: true, trim: true },
    moduleCode: { type: String, required: true, uppercase: true, trim: true },
    preferredDateTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    decisionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decisionAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '', trim: true },
    session: { type: sessionSchema, default: null },
    sessionModeration: {
      reportCount: { type: Number, default: 0, min: 0 },
      status: {
        type: String,
        enum: ['normal', 'flagged', 'auto_hidden'],
        default: 'normal',
      },
      isHiddenFromStudents: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

kuppiRequestSchema.index({ student: 1, createdAt: -1 });
kuppiRequestSchema.index({ status: 1, preferredDateTime: 1 });

module.exports = mongoose.model('KuppiRequest', kuppiRequestSchema);