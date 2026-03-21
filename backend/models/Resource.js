const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 4 },
    semester: { type: Number, required: true, min: 1, max: 2 },
    moduleCode: { type: String, required: true, uppercase: true, trim: true },
    resourceType: {
      type: String,
      required: true,
      enum: ['lecture_pdf', 'short_note', 'past_paper', 'yt_link', 'other'],
    },
    lectureNo: { type: Number, default: null },
    lectureTitle: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    filePublicId: { type: String, default: '' },
    extractedText: { type: String, default: '' },
    ytLink: { type: String, default: '' },
  },
  { timestamps: true }
);

resourceSchema.index({ year: 1, semester: 1, moduleCode: 1, resourceType: 1 });

module.exports = mongoose.model('Resource', resourceSchema);
