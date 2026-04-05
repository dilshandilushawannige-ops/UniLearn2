const KuppiRequest = require('../models/KuppiRequest');
const LiveClass = require('../models/LiveClass');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isAdminUser } = require('../utils/admin');
const { createNotificationIfAbsent } = require('../services/notificationService');

const ensureFutureDate = (value, fieldName) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
  if (parsed.getTime() <= Date.now()) {
    throw new ApiError(400, `${fieldName} must be a future date and time`);
  }
  return parsed;
};

const ensureValidUrl = (value, fieldName) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required`);
  }

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ApiError(400, `${fieldName} must be a valid URL`);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, `${fieldName} must be a valid URL`);
  }

  return normalized;
};

const inferPlatformFromLink = (meetingLink) => {
  const normalized = String(meetingLink || '').toLowerCase();
  if (normalized.includes('meet.google.com')) return 'google_meet';
  if (normalized.includes('teams.microsoft.com')) return 'microsoft_teams';
  return 'zoom';
};

const sanitizeRequest = (item, viewer) => {
  const plain = item.toObject();
  if (isAdminUser(viewer)) return plain;

  const isOwner = plain.student && plain.student._id && plain.student._id.toString() === viewer._id.toString();
  if (isOwner) return plain;

  return {
    _id: plain._id,
    topic: plain.topic,
    moduleCode: plain.moduleCode,
    preferredDateTime: plain.preferredDateTime,
    status: plain.status,
    session: plain.status === 'approved' ? plain.session : null,
    sessionModeration: plain.sessionModeration,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    student: plain.student ? { username: plain.student.username } : null,
  };
};

// @desc Create kuppi request
// @route POST /api/kuppi-requests
// @access Private (Student)
const createKuppiRequest = asyncHandler(async (req, res) => {
  if (isAdminUser(req.user)) {
    throw new ApiError(403, 'Admins cannot submit kuppi requests');
  }

  const { topic, moduleCode, preferredDateTime } = req.body;
  if (!topic || !moduleCode || !preferredDateTime) {
    throw new ApiError(400, 'topic, moduleCode and preferredDateTime are required');
  }

  const parsedPreferredDateTime = ensureFutureDate(preferredDateTime, 'preferredDateTime');

  const request = await KuppiRequest.create({
    student: req.user._id,
    topic: String(topic).trim(),
    moduleCode: String(moduleCode).toUpperCase(),
    preferredDateTime: parsedPreferredDateTime,
    status: 'pending',
  });

  const populated = await KuppiRequest.findById(request._id).populate('student', 'username email');
  res.status(201).json(populated);
});

// @desc List kuppi requests
// @route GET /api/kuppi-requests
// @access Private
const getKuppiRequests = asyncHandler(async (req, res) => {
  const { moduleCode, status } = req.query;
  const filter = {};

  if (moduleCode) filter.moduleCode = String(moduleCode).toUpperCase();
  if (status) filter.status = status;

  let queryFilter = filter;
  if (!isAdminUser(req.user)) {
    queryFilter = {
      ...filter,
      $or: [{ student: req.user._id }, { status: 'approved' }],
    };
  }

  const requests = await KuppiRequest.find(queryFilter)
    .populate('student', 'username email')
    .populate('decisionBy', 'username email')
    .populate('session.reports.reportedBy', 'username email')
    .sort({ createdAt: -1 });

  let mapped = requests.map((item) => sanitizeRequest(item, req.user));
  if (!isAdminUser(req.user)) {
    mapped = mapped.filter((item) => !item?.sessionModeration?.isHiddenFromStudents);
  }

  res.json(mapped);
});

// @desc Approve or reject kuppi request
// @route PATCH /api/kuppi-requests/:id/status
// @access Private (Admin)
const updateKuppiStatus = asyncHandler(async (req, res) => {
  if (!isAdminUser(req.user)) {
    throw new ApiError(403, 'Admin access required');
  }

  const { status, rejectionReason } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw new ApiError(400, 'status must be approved or rejected');
  }

  const request = await KuppiRequest.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Kuppi request not found');

  request.status = status;
  request.decisionBy = req.user._id;
  request.decisionAt = new Date();
  request.rejectionReason = status === 'rejected' ? String(rejectionReason || '').trim() : '';

  if (status === 'rejected') {
    request.session = null;
  }

  await request.save();

  await createNotificationIfAbsent({
    user: request.student,
    group: 'kuppi_updates',
    category: status === 'approved' ? 'kuppi_approved' : 'kuppi_rejected',
    title: status === 'approved' ? 'Kuppi request approved' : 'Kuppi request rejected',
    message:
      status === 'approved'
        ? `Your kuppi request for ${request.topic} has been approved.`
        : `Your kuppi request for ${request.topic} has been rejected.`,
    relatedContentType: 'kuppi_request',
    relatedContentId: request._id.toString(),
    eventKey: `kuppi-status:${request._id.toString()}:${status}:${new Date(request.decisionAt).getTime()}`,
  });

  const populated = await KuppiRequest.findById(request._id)
    .populate('student', 'username email')
    .populate('decisionBy', 'username email');

  res.json(populated);
});

// @desc Create student-hosted session after approval
// @route POST /api/kuppi-requests/:id/session
// @access Private (Owner student)
const createStudentSession = asyncHandler(async (req, res) => {
  const request = await KuppiRequest.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Kuppi request not found');

  const isOwner = request.student.toString() === req.user._id.toString();
  if (!isOwner) throw new ApiError(403, 'Only the request owner can create the session');
  if (request.status !== 'approved') throw new ApiError(400, 'Only approved requests can create sessions');
  if (request.session) throw new ApiError(400, 'Session already created for this request');

  const { meetingLink, scheduledTime } = req.body;
  if (!meetingLink || !scheduledTime) {
    throw new ApiError(400, 'meetingLink and scheduledTime are required');
  }

  const validatedMeetingLink = ensureValidUrl(meetingLink, 'meetingLink');
  const parsedScheduledTime = ensureFutureDate(scheduledTime, 'scheduledTime');

  request.session = {
    meetingLink: validatedMeetingLink,
    scheduledTime: parsedScheduledTime,
    label: 'Student Hosted Session',
    reports: request.session?.reports || [],
  };

  await request.save();

  const populated = await KuppiRequest.findById(request._id)
    .populate('student', 'username email')
    .populate('session.reports.reportedBy', 'username email');

  res.json(populated);
});

// @desc Create student-hosted session from approved request (admin)
// @route POST /api/kuppi/sessions
// @access Private (Admin)
const createAdminHostedSession = asyncHandler(async (req, res) => {
  if (!isAdminUser(req.user)) {
    throw new ApiError(403, 'Admin access required');
  }

  const { requestId, meetingLink, scheduledAt } = req.body;
  if (!requestId || !meetingLink || !scheduledAt) {
    throw new ApiError(400, 'requestId, meetingLink and scheduledAt are required');
  }

  const request = await KuppiRequest.findById(requestId).populate('student', 'username email currentYear currentSemester');
  if (!request) throw new ApiError(404, 'Kuppi request not found');
  if (request.status !== 'approved') throw new ApiError(400, 'Only approved requests can create sessions');
  if (request.session) throw new ApiError(400, 'Session already created for this request');

  const validatedMeetingLink = ensureValidUrl(meetingLink, 'meetingLink');
  const parsedScheduledAt = ensureFutureDate(scheduledAt, 'scheduledAt');

  const classYear = Number(request.student?.currentYear);
  const classSemester = Number(request.student?.currentSemester);
  const normalizedYear = Number.isInteger(classYear) && classYear >= 1 && classYear <= 4 ? classYear : 1;
  const normalizedSemester = Number.isInteger(classSemester) && classSemester >= 1 && classSemester <= 2 ? classSemester : 1;

  await LiveClass.create({
    title: 'Student Hosted Session',
    description: `${request.topic} • Hosted for ${request.student?.username || 'Student'}`,
    moduleCode: request.moduleCode,
    year: normalizedYear,
    semester: normalizedSemester,
    classDateTime: parsedScheduledAt,
    platform: inferPlatformFromLink(validatedMeetingLink),
    meetingLink: validatedMeetingLink,
    createdBy: req.user._id,
  });

  request.session = {
    meetingLink: validatedMeetingLink,
    scheduledTime: parsedScheduledAt,
    label: 'Student Hosted Session',
    reports: [],
  };

  await request.save();

  const populated = await KuppiRequest.findById(request._id)
    .populate('student', 'username email')
    .populate('decisionBy', 'username email')
    .populate('session.reports.reportedBy', 'username email');

  res.status(201).json(populated);
});

// @desc Report a kuppi session
// @route POST /api/kuppi-requests/:id/report
// @access Private
const reportKuppiSession = asyncHandler(async (req, res) => {
  const request = await KuppiRequest.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Kuppi request not found');
  if (!request.session) throw new ApiError(400, 'Session has not been created yet');

  const { reason } = req.body;
  if (!reason || !String(reason).trim()) {
    throw new ApiError(400, 'reason is required');
  }

  request.session.reports.push({
    reportedBy: req.user._id,
    reason: String(reason).trim(),
    createdAt: new Date(),
  });

  await request.save();

  const populated = await KuppiRequest.findById(request._id)
    .populate('student', 'username email')
    .populate('session.reports.reportedBy', 'username email');

  res.json(populated);
});

module.exports = {
  createKuppiRequest,
  getKuppiRequests,
  updateKuppiStatus,
  createStudentSession,
  createAdminHostedSession,
  reportKuppiSession,
};