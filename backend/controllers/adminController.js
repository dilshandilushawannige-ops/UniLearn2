const LiveClass = require('../models/LiveClass');
const KuppiRequest = require('../models/KuppiRequest');
const ContentModerationItem = require('../models/ContentModerationItem');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isAdminUser } = require('../utils/admin');

const getDashboardStats = asyncHandler(async (req, res) => {
  if (!isAdminUser(req.user)) {
    throw new ApiError(403, 'Admin access required');
  }

  const now = new Date();

  const [
    totalLiveClasses,
    totalKuppiRequests,
    flaggedContentCount,
    suspendedUsersCount,
  ] = await Promise.all([
    LiveClass.countDocuments(),
    KuppiRequest.countDocuments(),
    ContentModerationItem.countDocuments({ status: { $in: ['flagged', 'auto_hidden'] } }),
    User.countDocuments({ suspendedUntil: { $gt: now } }),
  ]);

  res.json({
    totalLiveClasses,
    totalKuppiRequests,
    flaggedContentCount,
    suspendedUsersCount,
  });
});

module.exports = { getDashboardStats };