const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const message = errors
    .array()
    .map((err) => err.msg)
    .join(', ');

  return next(new ApiError(400, message));
};

module.exports = validate;
