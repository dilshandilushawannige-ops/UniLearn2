const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { evaluateBadges } = require('../services/badgeService');

const ALLOWED_TAGS = ['cn', 'dms', 'se', 'esd', 'dbms', 'os', 'networking', 'java', 'python', 'sql'];
const isAdmin = (user) => ['admin', 'moderator'].includes(user?.role);

const normalizeTags = (tags) =>
  [...new Set((Array.isArray(tags) ? tags : []).map((t) => String(t || '').trim().toLowerCase()).filter(Boolean))];

exports.createQuestion = asyncHandler(async (req, res) => {
  const { title, description, tags = [] } = req.body;
  const cleanedTags = normalizeTags(tags);

  if (cleanedTags.length > 5) throw new ApiError(400, 'Maximum 5 tags allowed');
  if (!cleanedTags.every((t) => ALLOWED_TAGS.includes(t))) throw new ApiError(400, 'Invalid tags');

  const question = await Question.create({
    title: String(title || '').trim(),
    description: String(description || '').trim(),
    tags: cleanedTags,
    user: req.user._id,
  });

  await User.findByIdAndUpdate(req.user._id, { $inc: { reputationScore: 2, 'activityStats.questionsAsked': 1 } });
  await evaluateBadges(req.user._id);
  res.status(201).json({ success: true, data: question });
});

exports.getQuestions = asyncHandler(async (req, res) => {
  const { search = '', tag = '', answered = '', sort = 'new' } = req.query;
  const query = { isHidden: false };

  if (tag) query.tags = String(tag).toLowerCase();
  if (answered === 'yes') query.isAnswered = true;
  if (answered === 'no') query.isAnswered = false;
  if (search.trim()) query.$text = { $search: search.trim() };

  const cursor = Question.find(query).populate('user', 'username reputationScore badges avatar');
  if (search.trim()) {
    cursor.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' }, createdAt: -1 });
  } else if (sort === 'votes') {
    cursor.sort({ voteScore: -1, createdAt: -1 });
  } else if (sort === 'views') {
    cursor.sort({ viewCount: -1, createdAt: -1 });
  } else {
    cursor.sort({ createdAt: -1 });
  }

  const questions = await cursor;
  res.json({ success: true, data: questions });
});

exports.getQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }, { new: true }).populate(
    'user',
    'username reputationScore badges avatar'
  );
  if (!question) throw new ApiError(404, 'Question not found');
  if (question.isHidden && !isAdmin(req.user)) throw new ApiError(404, 'Question not found');

  res.json({ success: true, data: question });
});

exports.updateQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw new ApiError(404, 'Question not found');
  if (question.user.toString() !== req.user._id.toString() && !isAdmin(req.user)) throw new ApiError(403, 'Forbidden');

  const { title, description, tags } = req.body;
  if (typeof title === 'string') question.title = title.trim();
  if (typeof description === 'string') question.description = description.trim();
  if (tags !== undefined) {
    const cleanedTags = normalizeTags(tags);
    if (cleanedTags.length > 5) throw new ApiError(400, 'Maximum 5 tags allowed');
    if (!cleanedTags.every((t) => ALLOWED_TAGS.includes(t))) throw new ApiError(400, 'Invalid tags');
    question.tags = cleanedTags;
  }

  await question.save();
  res.json({ success: true, data: question });
});

exports.deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw new ApiError(404, 'Question not found');
  if (question.user.toString() !== req.user._id.toString() && !isAdmin(req.user)) throw new ApiError(403, 'Forbidden');

  await Answer.deleteMany({ question: question._id });
  await question.deleteOne();
  res.json({ success: true, message: 'Question deleted' });
});

exports.voteQuestion = asyncHandler(async (req, res) => {
  const { type } = req.body;
  if (!['up', 'down'].includes(type)) throw new ApiError(400, 'Invalid vote type');

  const question = await Question.findById(req.params.id);
  if (!question) throw new ApiError(404, 'Question not found');
  if (question.user.toString() === req.user._id.toString()) throw new ApiError(400, 'Cannot vote own question');

  const userId = req.user._id;
  const hadUpvote = question.upvotes.some((id) => id.toString() === userId.toString());
  const hadDownvote = question.downvotes.some((id) => id.toString() === userId.toString());
  let repDelta = 0;
  let upvoteDelta = 0;

  if (type === 'up') {
    if (hadUpvote) {
      question.upvotes.pull(userId);
      repDelta -= 5;
      upvoteDelta -= 1;
    } else {
      question.upvotes.push(userId);
      repDelta += 5;
      upvoteDelta += 1;
      if (hadDownvote) question.downvotes.pull(userId);
    }
  } else if (hadDownvote) {
    question.downvotes.pull(userId);
    repDelta += 2;
  } else {
    question.downvotes.push(userId);
    repDelta -= 2;
    if (hadUpvote) {
      question.upvotes.pull(userId);
      repDelta -= 5;
      upvoteDelta -= 1;
    }
  }

  await question.save();
  await User.findByIdAndUpdate(question.user, { $inc: { reputationScore: repDelta, 'activityStats.upvotesReceived': upvoteDelta } });
  await User.findByIdAndUpdate(userId, {
    $push: { voteHistory: { targetType: 'question', targetId: question._id, voteType: type === 'up' ? 'upvote' : 'downvote' } },
  });
  await evaluateBadges(question.user);

  await question.populate('user', 'username reputationScore badges avatar');
  res.json({ success: true, data: question });
});

exports.getSimilarQuestions = asyncHandler(async (req, res) => {
  const title = String(req.query.title || '').trim();
  if (title.length < 10) return res.json({ success: true, data: [] });

  const data = await Question.find(
    { $text: { $search: title }, isHidden: false },
    { score: { $meta: 'textScore' }, title: 1, tags: 1, answerCount: 1, voteScore: 1, viewCount: 1 }
  )
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(5);

  res.json({ success: true, data });
});

exports.getTopContributors = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 10);

  const users = await User.find({ isActive: true })
    .select('username reputationScore badges activityStats avatar')
    .sort({ reputationScore: -1, 'activityStats.answersGiven': -1 })
    .lean();

  const top = users.slice(0, limit).map((u, idx) => ({
    rank: idx + 1,
    userId: u._id,
    username: u.username,
    avatar: u.avatar || '',
    reputationScore: u.reputationScore || 0,
    questionsAsked: u.activityStats?.questionsAsked || 0,
    answersGiven: u.activityStats?.answersGiven || 0,
    badges: u.badges || [],
  }));

  let myStats = null;
  if (req.user?._id) {
    const myIndex = users.findIndex((u) => u._id.toString() === req.user._id.toString());
    const my = myIndex >= 0 ? users[myIndex] : null;
    if (my) {
      myStats = {
        rank: myIndex + 1,
        userId: my._id,
        username: my.username,
        avatar: my.avatar || '',
        reputationScore: my.reputationScore || 0,
        questionsAsked: my.activityStats?.questionsAsked || 0,
        answersGiven: my.activityStats?.answersGiven || 0,
        badges: my.badges || [],
      };
    }
  }

  res.json({ success: true, data: { topContributors: top, myStats } });
});

