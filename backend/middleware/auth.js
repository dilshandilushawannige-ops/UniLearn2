const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isAdminUser } = require('../utils/admin');

const protect = asyncHandler(async (req, _res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    throw new ApiError(401, 'Not authorized, token invalid');
  }

  req.user = await User.findById(decoded.id).select('-password');
  if (!req.user) {
    throw new ApiError(401, 'User not found');
  }

  if (
    req.user.suspendedUntil &&
    new Date(req.user.suspendedUntil).getTime() > Date.now() &&
    !isAdminUser(req.user)
  ) {
    const until = new Date(req.user.suspendedUntil).toISOString();
    const reason = req.user.suspensionReason || 'Policy violation';
    throw new ApiError(403, `Account suspended until ${until}. Reason: ${reason}`);
  }

  next();
});

module.exports = { protect };
