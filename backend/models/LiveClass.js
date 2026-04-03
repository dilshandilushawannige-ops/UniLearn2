const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'absent',
    },
  },
  { _id: false }
);

const liveClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    moduleCode: { type: String, required: true, uppercase: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 4 },
    semester: { type: Number, required: true, min: 1, max: 2 },
    classDateTime: { type: Date, required: true },
    platform: {
      type: String,
      required: true,
      enum: ['zoom', 'google_meet', 'microsoft_teams'],
    },
    meetingLink: { type: String, required: true, trim: true },
    isCancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    cancelledReason: { type: String, default: '', trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attendance: {
      type: [attendanceSchema],
      default: [],
    },
    moderation: {
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

liveClassSchema.index({ year: 1, semester: 1, classDateTime: 1 });
liveClassSchema.index({ moduleCode: 1, classDateTime: 1 });

module.exports = mongoose.model('LiveClass', liveClassSchema);