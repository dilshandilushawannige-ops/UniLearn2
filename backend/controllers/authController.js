const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// @desc  Register a new user
// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { username, email, password, currentYear, currentSemester } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'Email already registered');
  }

  const user = await User.create({
    username,
    email,
    password,
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
      currentYear: user.currentYear,
      currentSemester: user.currentSemester,
    },
  });
});

// @desc  Login user
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const match = await user.matchPassword(password);
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
      currentYear: user.currentYear,
      currentSemester: user.currentSemester,
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
    currentYear: user.currentYear,
    currentSemester: user.currentSemester,
  });
});

module.exports = { register, login, getMe };
