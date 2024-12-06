const { body, param, validationResult } = require('express-validator');

// Validation chains
const validations = {
  // Email validation
  email: body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
    .escape(),

  // Password validation with optional registration rules
  password: (isRegistration = false) => {
    const chain = body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .escape();

    // Add extra validation rules for registration and reset password
    if (isRegistration) {
      chain
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain at least one special character');
    }

    return chain;
  },

  // Reset token validation
  resetToken: param('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-fA-F0-9]+$/)
    .escape(),

  // Refresh token validation
  refreshToken: body('refreshToken')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required')
    .isJWT()
    .withMessage('Invalid refresh token format')
    .isLength({ max: 1000 })
    .matches(/^[A-Za-z0-9-_\.]+$/)
    .escape()
};

// Validation result handler
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Create validation middleware arrays
const validateLogin = [
  validations.email,
  validations.password(),
  handleValidation
];

const validateRegistration = [
  validations.email,
  validations.password(true),
  handleValidation
];

const validateResetPassword = [
  validations.resetToken,
  validations.password(true),
  handleValidation
];

const validateForgotPassword = [
  validations.email,
  handleValidation
];

// Add refresh validation middleware
const validateRefresh = [
  validations.refreshToken,
  handleValidation
];

// Export validation middlewares
module.exports = {
  validateLogin,
  validateRegistration,
  validateResetPassword,
  validateForgotPassword,
  validateRefresh
}; 