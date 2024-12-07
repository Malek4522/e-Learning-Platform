const { sign } = require('jsonwebtoken');
const User = require('../models/User');
const { sendResetPasswordEmail } = require('../services/email.service');
const { 
  secret, 
  expiresIn, 
  refreshSecret, 
  refreshExpiresIn 
} = require('../config/jwt.config');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

const generateTokens = (user) => {
  const accessToken = sign(
    { 
      id: user._id, 
      role: user.role,
      email: user.email 
    },
    secret,
    { expiresIn }
  );

  const refreshToken = sign(
    { id: user._id },
    refreshSecret,
    { expiresIn: refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

const authenticateAdmin = async (email, password) => {
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin) return null;

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) return null;

  const { accessToken, refreshToken } = generateTokens({
    _id: admin._id,
    role: admin.role,
    email: admin.email
  });
  
  // Save refresh token
  await admin.addRefreshToken(refreshToken, refreshExpiresIn);

  return {
    accessToken,
    refreshToken,
    admin: {
      id: admin._id,
      email: admin.email,
      role: admin.role
    }
  };
};

const authenticateUser = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) return null;

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return null;

  const { accessToken, refreshToken } = generateTokens({
    _id: user._id,
    role: user.role,
    email: user.email
  });
  
  // Save refresh token
  await user.addRefreshToken(refreshToken, refreshExpiresIn);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      role: user.role
    }
  };
};

const authController = {
  // Register new student
  register: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Create new user
      const user = new User({
        email,
        password,
        role: 'student'
      });

      await user.save();

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Login - simplified since validation is handled by middleware
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Try admin authentication first
      const adminAuth = await authenticateAdmin(email, password);
      if (adminAuth) {
        return res.json(adminAuth);
      }

      // Try user authentication
      const userAuth = await authenticateUser(email, password);
      if (userAuth) {
        return res.json(userAuth);
      }

      return res.status(401).json({ message: 'Invalid credentials' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Forgot Password - simplified
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const resetToken = user.createPasswordResetToken();
      await user.save();

      await sendResetPasswordEmail(user.email, resetToken);

      res.json({ message: 'Password reset email sent' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Reset Password - simplified
  resetPassword: async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      user.password = password;
      user.clearPasswordResetToken();
      await user.save();

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Refresh token - simplified
  refresh: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      const id = req.admin ? req.admin.id : req.user.id;

      let entity;
      if (req.admin) {
        entity = await Admin.findOne({
          _id: id,
          'refreshTokens.token': refreshToken,
          'refreshTokens.expiresAt': { $gt: new Date() }
        });
      } else {
        entity = await User.findOne({
          _id: id,
          'refreshTokens.token': refreshToken,
          'refreshTokens.expiresAt': { $gt: new Date() }
        });
      }

      if (!entity) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      const tokens = generateTokens(entity);
      
      await entity.removeRefreshToken(refreshToken);
      await entity.addRefreshToken(tokens.refreshToken, refreshExpiresIn);

      res.json({
        ...tokens,
        [entity instanceof Admin ? 'admin' : 'user']: {
          id: entity._id,
          email: entity.email,
          role: entity.role
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get current user
  getCurrentUser: async (req, res) => {
    try {
      let entity;
      if (req.admin) {
        entity = await Admin.findById(req.admin.id)
          .select('-password -resetPasswordToken -resetPasswordExpires -refreshTokens');
      } else {
        entity = await User.findById(req.user.id)
          .select('-password -resetPasswordToken -resetPasswordExpires -refreshTokens');
      }
      res.json(entity);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Add logout endpoint
  logout: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }

      // Try to find and remove refresh token from user
      const user = await User.findOne({
        'refreshTokens.token': refreshToken
      });

      if (user) {
        await user.removeRefreshToken(refreshToken);
      } else {
        // If not found in users, try admins
        const admin = await Admin.findOne({
          'refreshTokens.token': refreshToken
        });
        
        if (admin) {
          await admin.removeRefreshToken(refreshToken);
        }
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = authController; 