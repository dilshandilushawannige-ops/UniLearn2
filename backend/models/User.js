const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const activityStatsSchema = new mongoose.Schema(
  {
    questionsAsked: { type: Number, default: 0, min: 0 },
    answersGiven: { type: Number, default: 0, min: 0 },
    upvotesReceived: { type: Number, default: 0, min: 0 },
    acceptedAnswers: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const badgeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    awardedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const voteHistorySchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ['question', 'answer'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    voteType: { type: String, enum: ['upvote', 'downvote'], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: '' },
    currentYear: { type: Number, required: true, min: 1, max: 4 },
    currentSemester: { type: Number, required: true, min: 1, max: 2 },
    reputationScore: { type: Number, default: 0 },
    badges: { type: [badgeSchema], default: [] },
    activityStats: { type: activityStatsSchema, default: () => ({}) },
    voteHistory: { type: [voteHistorySchema], default: [] },
    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.checkAndAwardBadges = function () {
  const stats = this.activityStats || {};
  const existing = new Set((this.badges || []).map((b) => b.name));
  const awarded = [];

  const rules = [
    { name: 'First Question', ok: (s) => (s.questionsAsked || 0) >= 1 },
    { name: 'First Answer', ok: (s) => (s.answersGiven || 0) >= 1 },
    { name: 'Helpful', ok: (s) => (s.upvotesReceived || 0) >= 10 },
    { name: 'Accepted Pro', ok: (s) => (s.acceptedAnswers || 0) >= 3 },
    { name: 'Top Contributor', ok: (s) => (s.questionsAsked || 0) + (s.answersGiven || 0) >= 25 },
  ];

  for (const rule of rules) {
    if (!existing.has(rule.name) && rule.ok(stats)) {
      const badge = { name: rule.name, awardedAt: new Date() };
      this.badges.push(badge);
      awarded.push(badge);
    }
  }

  return awarded;
};

module.exports = mongoose.model('User', userSchema);
