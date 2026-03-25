const mongoose = require('mongoose');

const gameInviteSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    semester: { type: Number, required: true },
    moduleCode: { type: String, required: true, uppercase: true },
    lectureStart: { type: Number, required: true },
    lectureEnd: { type: Number, required: true },
    questionCount: { type: Number, required: true, default: 10 },
    timePerQuestion: { type: Number, required: true, default: 15 }, // seconds
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired', 'cancelled'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for efficient queries
gameInviteSchema.index({ toUser: 1, status: 1, createdAt: -1 });
gameInviteSchema.index({ fromUser: 1, status: 1, createdAt: -1 });
gameInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

module.exports = mongoose.model('GameInvite', gameInviteSchema);
