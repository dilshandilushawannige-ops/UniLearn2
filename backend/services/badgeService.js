const User = require('../models/User');

const evaluateBadges = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return [];

  const newlyAwarded = user.checkAndAwardBadges();
  if (newlyAwarded.length) {
    await user.save();
  }
  return newlyAwarded;
};

module.exports = { evaluateBadges };

