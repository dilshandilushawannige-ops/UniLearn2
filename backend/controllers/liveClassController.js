const LiveClass = require('../models/LiveClass');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isAdminUser } = require('../utils/admin');
const { createNotificationIfAbsent } = require('../services/notificationService');

const PLATFORM_SET = new Set(['zoom', 'google_meet', 'microsoft_teams']);

const ensureAdmin = (user) => {
  if (!isAdminUser(user)) {
    throw new ApiError(403, 'Admin access required');
  }
};

const normalizePlatform = (platform) => {
  if (!platform) return '';
  return String(platform).trim().toLowerCase();
};

const validateClassPayload = ({
  title,
  moduleCode,
  year,
  semester,
  classDateTime,
  platform,
  meetingLink,
}) => {
  if (!title || !moduleCode || !year || !semester || !classDateTime || !platform || !meetingLink) {
    throw new ApiError(400, 'title, moduleCode, year, semester, classDateTime, platform and meetingLink are required');
  }

  const parsedDate = new Date(classDateTime);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, 'Invalid classDateTime');
  }

  const normalizedPlatform = normalizePlatform(platform);
  if (!PLATFORM_SET.has(normalizedPlatform)) {
    throw new ApiError(400, 'platform must be one of: zoom, google_meet, microsoft_teams');
  }

  return {
    parsedDate,
    normalizedPlatform,
    normalizedModuleCode: String(moduleCode).toUpperCase(),
    normalizedYear: Number(year),
    normalizedSemester: Number(semester),
  };
};

const mapAttendanceForStudent = (attendance, userId) => {
  const row = attendance.find((item) => item.student.toString() === userId.toString());
  if (!row) {
    return {
      joinedAt: null,
      leftAt: null,
      durationMinutes: 0,
      attendanceStatus: 'absent',
      hasActiveSession: false,
    };
  }

  return {
    joinedAt: row.joinedAt,
    leftAt: row.leftAt,
    durationMinutes: row.durationMinutes,
    attendanceStatus: row.status,
    hasActiveSession: Boolean(row.joinedAt && !row.leftAt),
  };
};

// @desc Create live class
// @route POST /api/live-classes
// @access Private (Admin)
const createLiveClass = asyncHandler(async (req, res) => {
  ensureAdmin(req.user);

  const { title, description, moduleCode, year, semester, classDateTime, platform, meetingLink } = req.body;

  const { parsedDate, normalizedPlatform, normalizedModuleCode, normalizedYear, normalizedSemester } =
    validateClassPayload({ title, moduleCode, year, semester, classDateTime, platform, meetingLink });

  const newClass = await LiveClass.create({
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    moduleCode: normalizedModuleCode,
    year: normalizedYear,
    semester: normalizedSemester,
    classDateTime: parsedDate,
    platform: normalizedPlatform,
    meetingLink: String(meetingLink).trim(),
    createdBy: req.user._id,
  });

  res.status(201).json(newClass);
});

// @desc Update live class
// @route PUT /api/live-classes/:id
// @access Private (Admin)
const updateLiveClass = asyncHandler(async (req, res) => {
  ensureAdmin(req.user);

  const liveClass = await LiveClass.findById(req.params.id);
  if (!liveClass) throw new ApiError(404, 'Live class not found');

  const mergedPayload = {
    title: req.body.title ?? liveClass.title,
    moduleCode: req.body.moduleCode ?? liveClass.moduleCode,
    year: req.body.year ?? liveClass.year,
    semester: req.body.semester ?? liveClass.semester,
    classDateTime: req.body.classDateTime ?? liveClass.classDateTime,
    platform: req.body.platform ?? liveClass.platform,
    meetingLink: req.body.meetingLink ?? liveClass.meetingLink,
  };

  const { parsedDate, normalizedPlatform, normalizedModuleCode, normalizedYear, normalizedSemester } =
    validateClassPayload(mergedPayload);

  liveClass.title = String(mergedPayload.title).trim();
  liveClass.description = req.body.description !== undefined ? String(req.body.description || '').trim() : liveClass.description;
  liveClass.moduleCode = normalizedModuleCode;
  liveClass.year = normalizedYear;
  liveClass.semester = normalizedSemester;
  liveClass.classDateTime = parsedDate;
  liveClass.platform = normalizedPlatform;
  liveClass.meetingLink = String(mergedPayload.meetingLink).trim();

  const updated = await liveClass.save();
  res.json(updated);
});

// @desc Cancel a live class
// @route PATCH /api/live-classes/:id/cancel
// @access Private (Admin)
const cancelLiveClass = asyncHandler(async (req, res) => {
  ensureAdmin(req.user);

  const liveClass = await LiveClass.findById(req.params.id);
  if (!liveClass) throw new ApiError(404, 'Live class not found');

  liveClass.isCancelled = true;
  liveClass.cancelledAt = new Date();
  liveClass.cancelledReason = String(req.body?.reason || '').trim();

  const updated = await liveClass.save();

  const targetUsers = await User.find({
    currentYear: liveClass.year,
    currentSemester: liveClass.semester,
  }).select('_id email role');

  const notifyTasks = targetUsers
    .filter((user) => !isAdminUser(user))
    .map((student) =>
      createNotificationIfAbsent({
        user: student._id,
        group: 'cancelled_classes',
        category: 'class_cancelled',
        title: 'Class cancelled',
        message: `${liveClass.title} (${liveClass.moduleCode}) was cancelled by admin.`,
        relatedContentType: 'live_class',
        relatedContentId: liveClass._id.toString(),
        eventKey: `class-cancelled:${liveClass._id.toString()}`,
      })
    );

  await Promise.all(notifyTasks);

  res.json(updated);
});

// @desc Delete a live class
// @route DELETE /api/live-classes/:id
// @access Private (Admin)
const deleteLiveClass = asyncHandler(async (req, res) => {
  ensureAdmin(req.user);

  const liveClass = await LiveClass.findById(req.params.id);
  if (!liveClass) throw new ApiError(404, 'Live class not found');

  await liveClass.deleteOne();
  res.json({ message: 'Live class deleted successfully' });
});

// @desc List live classes
// @route GET /api/live-classes
// @access Private
const getLiveClasses = asyncHandler(async (req, res) => {
  const { year, semester, moduleCode } = req.query;
  const filter = {};

  if (year) filter.year = Number(year);
  if (semester) filter.semester = Number(semester);
  if (moduleCode) filter.moduleCode = String(moduleCode).toUpperCase();

  const classes = await LiveClass.find(filter)
    .populate('createdBy', 'username email role')
    .sort({ classDateTime: 1 });

  const mapped = classes.map((item) => {
    const plain = item.toObject();
    const studentAttendance = mapAttendanceForStudent(item.attendance || [], req.user._id);

    if (!isAdminUser(req.user)) {
      delete plain.attendance;
    }

    return {
      ...plain,
      ...studentAttendance,
    };
  });

  const visible = isAdminUser(req.user)
    ? mapped
    : mapped.filter((item) => !item?.moderation?.isHiddenFromStudents);

  res.json(visible);
});

// @desc Join class
// @route POST /api/live-classes/:id/join
// @access Private
const joinLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);
  if (!liveClass) throw new ApiError(404, 'Live class not found');
  if (liveClass.isCancelled) throw new ApiError(400, 'Cannot join a cancelled class');

  const now = new Date();
  const studentId = req.user._id.toString();
  const row = liveClass.attendance.find((entry) => entry.student.toString() === studentId);

  if (row && row.joinedAt && !row.leftAt) {
    return res.json({
      message: 'Already joined',
      meetingLink: liveClass.meetingLink,
      joinedAt: row.joinedAt,
    });
  }

  if (row) {
    row.joinedAt = now;
    row.leftAt = null;
    row.durationMinutes = 0;
    row.status = 'absent';
  } else {
    liveClass.attendance.push({
      student: req.user._id,
      joinedAt: now,
      leftAt: null,
      durationMinutes: 0,
      status: 'absent',
    });
  }

  await liveClass.save();
  res.json({
    message: 'Joined class successfully',
    meetingLink: liveClass.meetingLink,
    joinedAt: now,
  });
});

// @desc Leave class
// @route POST /api/live-classes/:id/leave
// @access Private
const leaveLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);
  if (!liveClass) throw new ApiError(404, 'Live class not found');

  const studentId = req.user._id.toString();
  const row = liveClass.attendance.find((entry) => entry.student.toString() === studentId);

  if (!row || !row.joinedAt) {
    throw new ApiError(400, 'Join class first before leaving');
  }

  if (row.leftAt) {
    return res.json({
      message: 'Class already left',
      joinedAt: row.joinedAt,
      leftAt: row.leftAt,
      durationMinutes: row.durationMinutes,
      attendanceStatus: row.status,
    });
  }

  const leftAt = new Date();
  const durationMs = Math.max(0, leftAt.getTime() - new Date(row.joinedAt).getTime());
  const durationMinutes = Math.floor(durationMs / 60000);
  const attendanceStatus = durationMinutes >= 20 ? 'present' : 'absent';

  row.leftAt = leftAt;
  row.durationMinutes = durationMinutes;
  row.status = attendanceStatus;

  await liveClass.save();

  res.json({
    message: 'Left class successfully',
    joinedAt: row.joinedAt,
    leftAt,
    durationMinutes,
    attendanceStatus,
  });
});

// @desc Full attendance for a class
// @route GET /api/live-classes/:id/attendance
// @access Private (Admin)
const getClassAttendance = asyncHandler(async (req, res) => {
  ensureAdmin(req.user);

  const liveClass = await LiveClass.findById(req.params.id)
    .populate('attendance.student', 'username email currentYear currentSemester role')
    .populate('createdBy', 'username email role');

  if (!liveClass) throw new ApiError(404, 'Live class not found');

  res.json({
    classId: liveClass._id,
    title: liveClass.title,
    moduleCode: liveClass.moduleCode,
    classDateTime: liveClass.classDateTime,
    platform: liveClass.platform,
    isCancelled: liveClass.isCancelled,
    attendance: liveClass.attendance,
  });
});

module.exports = {
  createLiveClass,
  updateLiveClass,
  cancelLiveClass,
  deleteLiveClass,
  getLiveClasses,
  joinLiveClass,
  leaveLiveClass,
  getClassAttendance,
};