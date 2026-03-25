const GameInvite = require('../models/GameInvite');
const QuizBattle = require('../models/QuizBattle');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { fetchBattleQuestions } = require('../services/gameService');

/**
 * @desc    Get online students (same year/semester)
 * @route   GET /api/games/online-students
 * @access  Private
 */
const getOnlineStudents = asyncHandler(async (req, res) => {
  const { year, semester } = req.user;
  
  // Get online user IDs from socket service (passed via query or from socket manager)
  // For now, we'll return all students from same year/semester
  // The actual online filtering happens on frontend via socket presence
  const students = await User.find({
    currentYear: year,
    currentSemester: semester,
    _id: { $ne: req.user._id }, // Exclude self
  }).select('username email currentYear currentSemester');

  res.json({ students });
});

/**
 * @desc    Create a game invite
 * @route   POST /api/games/invite
 * @access  Private
 */
const createInvite = asyncHandler(async (req, res) => {
  const { toUserId, moduleCode, lectureStart, lectureEnd, questionCount, timePerQuestion } = req.body;

  // Validation
  if (!toUserId || !moduleCode || !lectureStart || !lectureEnd) {
    throw new ApiError(400, 'Missing required fields');
  }

  // Check if target user exists and is in same year/semester
  const targetUser = await User.findById(toUserId);
  if (!targetUser) {
    throw new ApiError(404, 'Target user not found');
  }

  if (
    targetUser.currentYear !== req.user.currentYear ||
    targetUser.currentSemester !== req.user.currentSemester
  ) {
    throw new ApiError(403, 'Can only invite students from same year and semester');
  }

  // Check for existing pending invite to same user
  const existingInvite = await GameInvite.findOne({
    fromUser: req.user._id,
    toUser: toUserId,
    status: 'pending',
  });

  if (existingInvite) {
    throw new ApiError(400, 'You already have a pending invite to this user');
  }

  // Create invite with 30 second expiry
  const invite = await GameInvite.create({
    fromUser: req.user._id,
    toUser: toUserId,
    year: req.user.currentYear,
    semester: req.user.currentSemester,
    moduleCode: moduleCode.toUpperCase(),
    lectureStart,
    lectureEnd,
    questionCount: questionCount || 10,
    timePerQuestion: timePerQuestion || 15,
    expiresAt: new Date(Date.now() + 30 * 1000), // 30 seconds
  });

  const populatedInvite = await GameInvite.findById(invite._id)
    .populate('fromUser', 'username email')
    .populate('toUser', 'username email');

  res.status(201).json({ invite: populatedInvite });
});

/**
 * @desc    Get active invitations for current user
 * @route   GET /api/games/invites
 * @access  Private
 */
const getInvites = asyncHandler(async (req, res) => {
  const invites = await GameInvite.find({
    $or: [{ fromUser: req.user._id }, { toUser: req.user._id }],
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .populate('fromUser', 'username email')
    .populate('toUser', 'username email')
    .sort('-createdAt');

  res.json({ invites });
});

/**
 * @desc    Respond to an invite (accept/reject)
 * @route   POST /api/games/invites/:id/respond
 * @access  Private
 */
const respondToInvite = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'accept' or 'reject'

  const invite = await GameInvite.findById(id).populate('fromUser toUser');

  if (!invite) {
    throw new ApiError(404, 'Invite not found');
  }

  // Verify user is the recipient
  if (invite.toUser._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to respond to this invite');
  }

  // Check if still pending and not expired
  if (invite.status !== 'pending') {
    throw new ApiError(400, 'Invite is no longer pending');
  }

  if (new Date() > invite.expiresAt) {
    invite.status = 'expired';
    await invite.save();
    throw new ApiError(400, 'Invite has expired');
  }

  if (action === 'accept') {
    invite.status = 'accepted';
    invite.respondedAt = new Date();
    await invite.save();

    // Create quiz battle
    const questions = await fetchBattleQuestions(
      invite.year,
      invite.semester,
      invite.moduleCode,
      invite.lectureStart,
      invite.lectureEnd,
      invite.questionCount
    );

    const battle = await QuizBattle.create({
      player1: invite.fromUser._id,
      player2: invite.toUser._id,
      year: invite.year,
      semester: invite.semester,
      moduleCode: invite.moduleCode,
      lectureStart: invite.lectureStart,
      lectureEnd: invite.lectureEnd,
      questionCount: invite.questionCount,
      timePerQuestion: invite.timePerQuestion,
      questions,
      status: 'waiting',
    });

    res.json({ invite, battle });
  } else if (action === 'reject') {
    invite.status = 'rejected';
    invite.respondedAt = new Date();
    await invite.save();

    res.json({ invite });
  } else {
    throw new ApiError(400, 'Invalid action. Use "accept" or "reject"');
  }
});

/**
 * @desc    Get battle details
 * @route   GET /api/games/battles/:id
 * @access  Private
 */
const getBattle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const battle = await QuizBattle.findById(id)
    .populate('player1', 'username email')
    .populate('player2', 'username email')
    .populate('winner', 'username email');

  if (!battle) {
    throw new ApiError(404, 'Battle not found');
  }

  // Verify user is a participant
  const isParticipant =
    battle.player1._id.toString() === req.user._id.toString() ||
    battle.player2._id.toString() === req.user._id.toString();

  if (!isParticipant) {
    throw new ApiError(403, 'Not authorized to view this battle');
  }

  res.json({ battle });
});

/**
 * @desc    Get battle history for current user
 * @route   GET /api/games/history
 * @access  Private
 */
const getBattleHistory = asyncHandler(async (req, res) => {
  const battles = await QuizBattle.find({
    $or: [{ player1: req.user._id }, { player2: req.user._id }],
    status: 'finished',
  })
    .populate('player1', 'username email')
    .populate('player2', 'username email')
    .populate('winner', 'username email')
    .sort('-finishedAt')
    .limit(20);

  res.json({ battles });
});

/**
 * @desc    Get user game stats
 * @route   GET /api/games/stats
 * @access  Private
 */
const getGameStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const totalBattles = await QuizBattle.countDocuments({
    $or: [{ player1: userId }, { player2: userId }],
    status: 'finished',
  });

  const wins = await QuizBattle.countDocuments({
    winner: userId,
    status: 'finished',
  });

  const draws = await QuizBattle.countDocuments({
    $or: [{ player1: userId }, { player2: userId }],
    status: 'finished',
    winner: null,
  });

  const losses = totalBattles - wins - draws;
  const winRate = totalBattles > 0 ? ((wins / totalBattles) * 100).toFixed(1) : 0;

  res.json({
    stats: {
      totalBattles,
      wins,
      losses,
      draws,
      winRate: parseFloat(winRate),
    },
  });
});

module.exports = {
  getOnlineStudents,
  createInvite,
  getInvites,
  respondToInvite,
  getBattle,
  getBattleHistory,
  getGameStats,
};
