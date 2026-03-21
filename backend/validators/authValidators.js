const { body } = require('express-validator');

const sliitEmailRegex = /^[A-Za-z0-9._%+-]+@my\.sliit\.lk$/i;

const registerValidator = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .matches(sliitEmailRegex)
    .withMessage('Only SLIIT campus emails ending with @my.sliit.lk are allowed')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('currentYear')
    .notEmpty()
    .withMessage('Current year is required')
    .isInt({ min: 1, max: 4 })
    .withMessage('Current year must be between 1 and 4')
    .toInt(),

  body('currentSemester')
    .notEmpty()
    .withMessage('Current semester is required')
    .isInt({ min: 1, max: 2 })
    .withMessage('Current semester must be 1 or 2')
    .toInt(),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .matches(sliitEmailRegex)
    .withMessage('Only SLIIT campus emails ending with @my.sliit.lk are allowed')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

module.exports = {
  registerValidator,
  loginValidator,
};
