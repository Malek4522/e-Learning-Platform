const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authMiddleware, roleCheck } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

// Register
router.post('/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
  ],
  validateRequest,
  authController.register
);

// Register teacher (admin only)
router.post('/register-teacher',
  authMiddleware,
  roleCheck(['admin']),
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('profile.first_name').notEmpty(),
    body('profile.last_name').notEmpty(),
  ],
  validateRequest,
  authController.registerTeacher
);

// Login
router.post('/login',
  [
    body('email').isEmail(),
    body('password').exists()
  ],
  validateRequest,
  authController.login
);

// Forgot Password
router.post('/forgot-password',
  [body('email').isEmail()],
  validateRequest,
  authController.forgotPassword
);

// Reset Password
router.post('/reset-password/:token',
  [body('password').isLength({ min: 6 })],
  validateRequest,
  authController.resetPassword
);

// Get current user
router.get('/me', 
  authMiddleware, 
  authController.getCurrentUser
);

// Add these new routes to your existing routes
router.post('/refresh',
  [body('refreshToken').notEmpty()],
  validateRequest,
  authController.refresh
);

router.post('/logout',
  [body('refreshToken').notEmpty()],
  validateRequest,
  authController.logout
);

module.exports = router; 