const express = require('express');
const authController = require('../controllers/auth.controller');
const { 
  validateRegistration, 
  validateLogin,
  validateResetPassword,
  validateForgotPassword,
  validateRefresh 
} = require('../middleware/validation.middleware');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Authentication routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authMiddleware, authController.logout);

// Password management
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/reset-password/:token', validateResetPassword, authController.resetPassword);

// Token management 
router.post('/refresh', validateRefresh, authController.refresh);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router; 