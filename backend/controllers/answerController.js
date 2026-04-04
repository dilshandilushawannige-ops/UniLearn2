const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { evaluateBadges } = require('../services/badgeService');

const isAdmin = (user) => ['admin', 'moderator'].includes(user?.role);

const computeVoteScore = (doc) => (doc.upvotes?.length || 0) - (doc.downvotes?.length || 0);

exports.createAnswer = asyncHandler(async (req, res) => {
  const { questionId, content } = req.body;
  const question = await Question.findById(questionId);
  if (!question) throw new ApiError(404, 'Question not found');

  const answer = await Answer.create({
    question: questionId,
    user: req.user._id,
    content: String(content || '').trim(),
  });

  await Question.findByIdAndUpdate(questionId, { $addToSet: { answers: answer._id }, $set: { isAnswered: true } });
  await User.findByIdAndUpdate(req.user._id, { $inc: { reputationScore: 5, 'activityStats.answersGiven': 1 } });
  const awardedBadges = await evaluateBadges(req.user._id);

  await answer.populate('user', 'username reputationScore badges avatar');
  res.status(201).json({ success: true, data: answer, awardedBadges });
});

exports.getAnswersForQuestion = asyncHandler(async (req, res) => {
  const { sort = 'top' } = req.query;
  const answers = await Answer.find({ question: req.params.questionId }).populate(
    'user',
    'username reputationScore badges avatar'
  );

  answers.forEach((a) => {
    a.voteScore = computeVoteScore(a);
  });

  if (sort === 'newest') {
    answers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'oldest') {
    answers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else {
    answers.sort((a, b) => b.voteScore - a.voteScore || new Date(b.createdAt) - new Date(a.createdAt));
  }

  let bookmarkSet = null;
  if (req.user?._id) {
    const u = await User.findById(req.user._id).select('bookmarkedAnswers').lean();
    bookmarkSet = new Set((u?.bookmarkedAnswers || []).map((id) => id.toString()));
  }

  const data = answers.map((a) => {
    const o = a.toObject ? a.toObject() : a;
    o.isBookmarked = bookmarkSet ? bookmarkSet.has(String(o._id)) : false;
    return o;
  });

  res.json({ success: true, data });
});

exports.voteAnswer = asyncHandler(async (req, res) => {
  const { type } = req.body;
  if (!['up', 'down'].includes(type)) throw new ApiError(400, 'Invalid vote type');

  const answer = await Answer.findById(req.params.id);
  if (!answer) throw new ApiError(404, 'Answer not found');
  if (answer.user.toString() === req.user._id.toString()) throw new ApiError(400, 'Cannot vote own answer');

  const userId = req.user._id;
  const hadUpvote = answer.upvotes.some((id) => id.toString() === userId.toString());
  const hadDownvote = answer.downvotes.some((id) => id.toString() === userId.toString());
  let repDelta = 0;
  let upvoteDelta = 0;

  if (type === 'up') {
    if (hadUpvote) {
      answer.upvotes.pull(userId);
      repDelta -= 10;
      upvoteDelta -= 1;
    } else {
      answer.upvotes.push(userId);
      repDelta += 10;
      upvoteDelta += 1;
      if (hadDownvote) answer.downvotes.pull(userId);
    }
  } else if (hadDownvote) {
    answer.downvotes.pull(userId);
    repDelta += 2;
  } else {
    answer.downvotes.push(userId);
    repDelta -= 2;
    if (hadUpvote) {
      answer.upvotes.pull(userId);
      repDelta -= 10;
      upvoteDelta -= 1;
    }
  }

  answer.markModified('upvotes');
  answer.markModified('downvotes');
  answer.voteScore = computeVoteScore(answer);
  await answer.save();
  await User.findByIdAndUpdate(answer.user, { $inc: { reputationScore: repDelta, 'activityStats.upvotesReceived': upvoteDelta } });
  await User.findByIdAndUpdate(userId, {
    $push: { voteHistory: { targetType: 'answer', targetId: answer._id, voteType: type === 'up' ? 'upvote' : 'downvote' } },
  });
  await evaluateBadges(answer.user);

  await answer.populate('user', 'username reputationScore badges avatar');
  res.json({ success: true, data: answer });
});

exports.acceptAnswer = asyncHandler(async (req, res) => {
  const answer = await Answer.findById(req.params.id);
  if (!answer) throw new ApiError(404, 'Answer not found');

  const question = await Question.findById(answer.question);
  if (!question) throw new ApiError(404, 'Question not found');
  if (question.user.toString() !== req.user._id.toString() && !isAdmin(req.user)) throw new ApiError(403, 'Forbidden');

  await Answer.updateMany({ question: question._id, isAccepted: true }, { $set: { isAccepted: false } });
  answer.isAccepted = true;
  await answer.save();

  question.acceptedAnswer = answer._id;
  question.isAnswered = true;
  await question.save();

  await User.findByIdAndUpdate(answer.user, { $inc: { reputationScore: 15, 'activityStats.acceptedAnswers': 1 } });
  await evaluateBadges(answer.user);

  res.json({ success: true, data: answer });
});

exports.updateAnswer = asyncHandler(async (req, res) => {
  const answer = await Answer.findById(req.params.id);
  if (!answer) throw new ApiError(404, 'Answer not found');
  if (answer.user.toString() !== req.user._id.toString() && !isAdmin(req.user)) throw new ApiError(403, 'Forbidden');

  const nextContent = String(req.body.content || '').trim();
  if (nextContent.length < 10) throw new ApiError(400, 'Answer must be at least 10 characters');

  answer.content = nextContent;
  await answer.save();
  await answer.populate('user', 'username reputationScore badges avatar');
  res.json({ success: true, data: answer });
});

exports.deleteAnswer = asyncHandler(async (req, res) => {
  const answer = await Answer.findById(req.params.id);
  if (!answer) throw new ApiError(404, 'Answer not found');
  if (answer.user.toString() !== req.user._id.toString() && !isAdmin(req.user)) throw new ApiError(403, 'Forbidden');

  const wasAccepted = answer.isAccepted;
  const questionId = answer.question;
  await User.updateMany({}, { $pull: { bookmarkedAnswers: answer._id } });
  await answer.deleteOne();

  const update = { $pull: { answers: answer._id } };
  if (wasAccepted) update.$set = { acceptedAnswer: null };
  await Question.findByIdAndUpdate(questionId, update);
  const question = await Question.findById(questionId);
  if (question) await question.save();

  res.json({ success: true, message: 'Answer deleted' });
});

exports.toggleBookmarkAnswer = asyncHandler(async (req, res) => {
  const answer = await Answer.findById(req.params.id).populate('question', 'isHidden');
  if (!answer) throw new ApiError(404, 'Answer not found');
  if (answer.question?.isHidden && !isAdmin(req.user)) throw new ApiError(404, 'Answer not found');

  const user = await User.findById(req.user._id);
  if (!Array.isArray(user.bookmarkedAnswers)) user.bookmarkedAnswers = [];
  const aid = answer._id;
  const had = user.bookmarkedAnswers.some((id) => id.toString() === aid.toString());
  let bookmarked;
  if (had) {
    user.bookmarkedAnswers.pull(aid);
    await Answer.updateOne({ _id: aid, bookmarkCount: { $gt: 0 } }, { $inc: { bookmarkCount: -1 } });
    bookmarked = false;
  } else {
    user.bookmarkedAnswers.addToSet(aid);
    await Answer.updateOne({ _id: aid }, { $inc: { bookmarkCount: 1 } });
    bookmarked = true;
  }
  await user.save();

  const fresh = await Answer.findById(aid).select('bookmarkCount').lean();
  res.json({ success: true, bookmarked, bookmarkCount: Math.max(0, fresh?.bookmarkCount || 0) });
});

exports.getMyBookmarkedAnswers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('bookmarkedAnswers').lean();
  const ids = user?.bookmarkedAnswers || [];
  if (!ids.length) return res.json({ success: true, data: [] });

  let answers = await Answer.find({ _id: { $in: ids } })
    .populate('user', 'username reputationScore badges avatar')
    .populate('question', 'title isHidden _id');

  answers = answers.filter((a) => a.question && !a.question.isHidden);

  const idOrder = new Map(ids.map((id, i) => [id.toString(), i]));
  answers.sort((a, b) => (idOrder.get(b._id.toString()) ?? -1) - (idOrder.get(a._id.toString()) ?? -1));

  answers.forEach((a) => {
    a.voteScore = computeVoteScore(a);
  });

  const data = answers.map((a) => {
    const o = a.toObject ? a.toObject() : a;
    o.isBookmarked = true;
    return o;
  });

  res.json({ success: true, data });
});

