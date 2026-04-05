const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const adminAuth = asyncHandler(async (req, _res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }

  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Admin access required');
  }

  next();
});

module.exports = { adminAuth };
