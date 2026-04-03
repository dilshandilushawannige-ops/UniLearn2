const Resource = require('../models/Resource');
const LiveClass = require('../models/LiveClass');
const KuppiRequest = require('../models/KuppiRequest');

const MODERATION_STATUS = {
  NORMAL: 'normal',
  FLAGGED: 'flagged',
  AUTO_HIDDEN: 'auto_hidden',
};

const buildModerationStatus = (reportCount) => {
  if (reportCount >= 10) {
    return { status: MODERATION_STATUS.AUTO_HIDDEN, isHiddenFromStudents: true };
  }
  if (reportCount >= 5) {
    return { status: MODERATION_STATUS.FLAGGED, isHiddenFromStudents: false };
  }
  return { status: MODERATION_STATUS.NORMAL, isHiddenFromStudents: false };
};

const getTargetForContent = async (contentType, contentId, fallback = {}) => {
  if (contentType === 'resource') {
    const doc = await Resource.findById(contentId).populate('uploader', 'username email');
    if (!doc) return null;
    return {
      doc,
      title: doc.title,
      submittedBy: doc.uploader?._id || doc.uploader || null,
    };
  }

  if (contentType === 'live_class') {
    const doc = await LiveClass.findById(contentId).populate('createdBy', 'username email');
    if (!doc) return null;
    return {
      doc,
      title: doc.title,
      submittedBy: doc.createdBy?._id || doc.createdBy || null,
    };
  }

  if (contentType === 'kuppi_session') {
    const doc = await KuppiRequest.findById(contentId).populate('student', 'username email');
    if (!doc || !doc.session) return null;
    return {
      doc,
      title: `${doc.topic} (Student Hosted Session)`,
      submittedBy: doc.student?._id || doc.student || null,
    };
  }

  if (contentType === 'comment') {
    return {
      doc: null,
      title: fallback.title ? String(fallback.title).trim() : `Comment ${contentId}`,
      submittedBy: fallback.submittedByUserId || null,
    };
  }

  return null;
};

const applyModerationToTarget = async (contentType, targetDoc, moderationState) => {
  if (!targetDoc) return;

  if (contentType === 'resource') {
    targetDoc.moderation = {
      reportCount: moderationState.reportCount,
      status: moderationState.status,
      isHiddenFromStudents: moderationState.isHiddenFromStudents,
    };
    await targetDoc.save();
    return;
  }

  if (contentType === 'live_class') {
    targetDoc.moderation = {
      reportCount: moderationState.reportCount,
      status: moderationState.status,
      isHiddenFromStudents: moderationState.isHiddenFromStudents,
    };
    await targetDoc.save();
    return;
  }

  if (contentType === 'kuppi_session') {
    targetDoc.sessionModeration = {
      reportCount: moderationState.reportCount,
      status: moderationState.status,
      isHiddenFromStudents: moderationState.isHiddenFromStudents,
    };
    await targetDoc.save();
  }
};

const clearModerationFromTarget = async (contentType, contentId) => {
  const target = await getTargetForContent(contentType, contentId, {});
  if (!target || !target.doc) return;

  const resetState = {
    reportCount: 0,
    status: MODERATION_STATUS.NORMAL,
    isHiddenFromStudents: false,
  };

  await applyModerationToTarget(contentType, target.doc, resetState);
};

const deleteTargetContent = async (contentType, contentId) => {
  if (contentType === 'resource') {
    await Resource.findByIdAndDelete(contentId);
    return;
  }
  if (contentType === 'live_class') {
    await LiveClass.findByIdAndDelete(contentId);
    return;
  }
  if (contentType === 'kuppi_session') {
    await KuppiRequest.findByIdAndDelete(contentId);
    return;
  }
  // comment has no dedicated model in current codebase
};

module.exports = {
  MODERATION_STATUS,
  buildModerationStatus,
  getTargetForContent,
  applyModerationToTarget,
  clearModerationFromTarget,
  deleteTargetContent,
};