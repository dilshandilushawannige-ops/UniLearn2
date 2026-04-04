const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, minlength: 10 },
    isAccepted: { type: Boolean, default: false },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    voteScore: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

answerSchema.pre('save', function preSave(next) {
  this.voteScore = (this.upvotes || []).length - (this.downvotes || []).length;
  next();
});

answerSchema.index({ question: 1, createdAt: -1 });
answerSchema.index({ voteScore: -1 });

module.exports = mongoose.model('Answer', answerSchema);

