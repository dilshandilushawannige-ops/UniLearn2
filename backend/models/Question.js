const mongoose = require('mongoose');

const ALLOWED_TAGS = ['cn', 'dms', 'se', 'esd', 'dbms', 'os', 'networking', 'java', 'python', 'sql'];

const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true, maxlength: 300, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 200 },
    description: { type: String, required: true, minlength: 20 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, enum: ALLOWED_TAGS }],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length <= 5;
        },
        message: 'Max 5 tags allowed',
      },
    },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    voteScore: { type: Number, default: 0 },
    answers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Answer' }],
    acceptedAnswer: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', default: null },
    answerCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    reports: { type: [reportSchema], default: [] },
    reportCount: { type: Number, default: 0 },
    isHidden: { type: Boolean, default: false },
    bookmarkCount: { type: Number, default: 0 },
    isAnswered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

questionSchema.pre('save', function preSave(next) {
  this.voteScore = (this.upvotes || []).length - (this.downvotes || []).length;
  this.answerCount = (this.answers || []).length;
  this.reportCount = (this.reports || []).length;
  if (this.reportCount >= 5) this.isHidden = true;
  this.isAnswered = !!this.acceptedAnswer || this.answerCount > 0;
  next();
});

questionSchema.index({ title: 'text', description: 'text', tags: 'text' });
questionSchema.index({ tags: 1 });
questionSchema.index({ voteScore: -1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ isAnswered: 1 });

module.exports = mongoose.model('Question', questionSchema);

