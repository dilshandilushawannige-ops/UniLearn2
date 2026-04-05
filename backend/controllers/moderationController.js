const ContentModerationItem = require('../models/ContentModerationItem');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isAdminUser } = require('../utils/admin');
const {
  buildModerationStatus,
  getTargetForContent,
  applyModerationToTarget,
  clearModerationFromTarget,
  deleteTargetContent,
} = require('../services/moderationService');

const VALID_REASONS = new Set(['inappropriate_content', 'spam', 'incorrect_information', 'other']);

const ensureAdmin = (user) => {
  if (!isAdminUser(user)) throw new ApiError(403, 'Admin access required');
};

// @desc Submit content report
// @route POST /api/moderation/reports
// @access Private
const submitReport = asyncHandler(async (req, res) => {
  const { contentType, contentId, reason, otherText, title, submittedByUserId } = req.body;

  if (!contentType || !contentId || !reason) {
    throw new ApiError(400, 'contentType, contentId and reason are required');
  }
  if (!VALID_REASONS.has(reason)) {
    throw new ApiError(400, 'Invalid report reason');
  }
  if (reason === 'other' && !String(otherText || '').trim()) {
    throw new ApiError(400, 'otherText is required when reason is other');
  }

  const target = await getTargetForContent(contentType, contentId, { title, submittedByUserId });
  if (!target) {
    throw new ApiError(404, 'Content item not found');
  }

  let item = await ContentModerationItem.findOne({ contentType, contentId: String(contentId) });
  if (!item) {
    item = await ContentModerationItem.create({
      contentType,
      contentId: String(contentId),
      title: target.title,
      submittedBy: target.submittedBy || null,
      reports: [],
      reportCount: 0,
      status: 'normal',
      isHiddenFromStudents: false,
    });
  }

  const alreadyReported = item.reports.some((entry) => entry.user.toString() === req.user._id.toString());
  if (alreadyReported) {
    throw new ApiError(409, 'You have already reported this content');
  }

  item.reports.push({
    user: req.user._id,
    reason,
    otherText: reason === 'other' ? String(otherText).trim() : '',
    createdAt: new Date(),
  });
  item.reportCount = item.reports.length;

  const moderationState = buildModerationStatus(item.reportCount);
  item.status = moderationState.status;
  item.isHiddenFromStudents = moderationState.isHiddenFromStudents;
  await item.save();

  await applyModerationToTarget(contentType, target.doc, {
    reportCount: item.reportCount,
    status: item.status,
    isHiddenFromStudents: item.isHiddenFromStudents,
  });

  res.status(201).json({
    message: 'Report submitted successfully',
    reportCount: item.reportCount,
    status: item.status,
    isHiddenFromStudents: item.isHiddenFromStudents,
  });
});

// @desc Admin moderation table
// @route GET /api/moderation/items
// @access Private (Admin)
const getModerationItems = asyncHandler(async (req, res) => {
  ensureAdmin(req.user);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Number(req.query.limit) || 4);
  const search = String(req.query.search || '').trim();

  const filter = { reportCount: { $gt: 0 } };
  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  const total = await ContentModerationItem.countDocuments(filter);
  const items = await ContentModerationItem.find(filter)
    .populate('submittedBy', 'username email suspendedUntil suspensionReason')
    .sort({ reportCount: -1, updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

// @desc Restore moderated content
// @route POST /api/moderation/items/:id/restore
// @access Private (Admin)
const restoreContent = asyncHandler(async (req, res) => {
  ensureAdmin(req.user);

  const item = await ContentModerationItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Moderation item not found');

  item.reports = [];
  item.reportCount = 0;
  item.status = 'normal';
  item.isHiddenFromStudents = false;
  await item.save();

  await clearModerationFromTarget(item.contentType, item.contentId);

  res.json({ message: 'Content restored and moderation reset' });
});

// @desc Delete moderated content permanently
// @route DELETE /api/moderation/items/:id/content
// @access Private (Admin)
const deleteModeratedContent = asyncHandler(async (req, res) => {
  ensureAdmin(req.user);

  const item = await ContentModerationItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Moderation item not found');

  await deleteTargetContent(item.contentType, item.contentId);
  await item.deleteOne();

  res.json({ message: 'Content permanently deleted' });
});

// @desc Suspend a user
// @route POST /api/moderation/users/:id/suspend
// @access Private (Admin)
const suspendUser = asyncHandler(async (req, res) => {
  ensureAdmin(req.user);

  const { days, reason } = req.body;
  const parsedDays = Number(days);
  if (!parsedDays || parsedDays < 1) {
    throw new ApiError(400, 'days must be at least 1');
  }
  if (!reason || !String(reason).trim()) {
    throw new ApiError(400, 'reason is required');
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) throw new ApiError(404, 'User not found');

  targetUser.suspendedUntil = new Date(Date.now() + parsedDays * 24 * 60 * 60 * 1000);
  targetUser.suspensionReason = String(reason).trim();
  await targetUser.save();

  res.json({
    message: 'User suspended successfully',
    suspendedUntil: targetUser.suspendedUntil,
    suspensionReason: targetUser.suspensionReason,
  });
});

// @desc Unsuspend user
// @route POST /api/moderation/users/:id/unsuspend
// @access Private (Admin)
const unsuspendUser = asyncHandler(async (req, res) => {
  ensureAdmin(req.user);

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) throw new ApiError(404, 'User not found');

  targetUser.suspendedUntil = null;
  targetUser.suspensionReason = '';
  await targetUser.save();

  res.json({ message: 'User unsuspended successfully' });
});

module.exports = {
  submitReport,
  getModerationItems,
  restoreContent,
  deleteModeratedContent,
  suspendUser,
  unsuspendUser,
};