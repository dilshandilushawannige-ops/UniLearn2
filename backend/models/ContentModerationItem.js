const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: ['inappropriate_content', 'spam', 'incorrect_information', 'other'],
    },
    otherText: { type: String, default: '', trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const contentModerationItemSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      required: true,
      enum: ['resource', 'comment', 'kuppi_session', 'live_class'],
    },
    contentId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reports: { type: [reportSchema], default: [] },
    reportCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['normal', 'flagged', 'auto_hidden'],
      default: 'normal',
    },
    isHiddenFromStudents: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contentModerationItemSchema.index({ contentType: 1, contentId: 1 }, { unique: true });
contentModerationItemSchema.index({ status: 1, reportCount: -1, updatedAt: -1 });

module.exports = mongoose.model('ContentModerationItem', contentModerationItemSchema);