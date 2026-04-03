const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { inferRoleForEmail } = require('../utils/admin');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// @desc  Register a new user
// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { username, email, password, currentYear, currentSemester } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(400, 'Email is required');
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ApiError(409, 'Email already registered');
  }

  const user = await User.create({
    username,
    email: normalizedEmail,
    password,
    role: inferRoleForEmail(normalizedEmail),
    currentYear,
    currentSemester,
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token: generateToken(user._id),
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.role === 'admin',
      currentYear: user.currentYear,
      currentSemester: user.currentSemester,
      suspendedUntil: user.suspendedUntil,
      suspensionReason: user.suspensionReason,
    },
  });
});

// @desc  Login user
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Guard against malformed legacy records with missing/invalid password hash.
  if (!user.password || typeof user.password !== 'string') {
    throw new ApiError(401, 'Invalid credentials');
  }

  let match = false;
  try {
    match = await user.matchPassword(password);
  } catch (_err) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!match) {
    throw new ApiError(401, 'Invalid credentials');
  }

  res.json({
    success: true,
    message: 'Login successful',
    token: generateToken(user._id),
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.role === 'admin',
      currentYear: user.currentYear,
      currentSemester: user.currentSemester,
      suspendedUntil: user.suspendedUntil,
      suspensionReason: user.suspensionReason,
    },
  });
});

// @desc  Get current user profile
// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    isAdmin: user.role === 'admin',
    currentYear: user.currentYear,
    currentSemester: user.currentSemester,
    suspendedUntil: user.suspendedUntil,
    suspensionReason: user.suspensionReason,
  });
});

module.exports = { register, login, getMe };
