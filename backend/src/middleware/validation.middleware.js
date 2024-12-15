const { body, param, cookie, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { refreshSecret, options } = require('../config/jwt.config');

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
        .withMessage('Password must be at least 6 characters long');
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

  // Refresh token validation from cookie
  refreshTokenCookie: cookie('refreshToken')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required')
    .isJWT()
    .withMessage('Invalid refresh token format')
    .custom(async (value, { req }) => {
      try {
        // Verify the token structure and signature
        const decoded = jwt.verify(value, refreshSecret, options);
        
        // Check if token has required fields based on our token generation
        if (!decoded.id || !decoded.version === undefined) {
          throw new Error('Invalid token structure');
        }
        
        // Check if the decoded token corresponds to a user or admin
        const adminRoles = ['superadmin', 'contentmanager', 'moderator']; // Define valid admin roles
        if (adminRoles.includes(decoded.role)) {
          req.admin = decoded; // Store admin info
        } else {
          req.user = decoded; // Store user info
        }
        
        return true;
      } catch (error) {
        throw new Error('Invalid refresh token');
      }
    })
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

// Update refresh validation middleware to use cookie
const validateRefresh = [
  validations.refreshTokenCookie,
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