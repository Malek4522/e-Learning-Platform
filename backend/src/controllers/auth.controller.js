const jwt = require('jsonwebtoken');
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

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    secret,
    { expiresIn }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    refreshSecret,
    { expiresIn: refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

const authController = {
  // Register new student
  register: async (req, res) => {
    try {
      const { email, password } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Email already exists' 
        });
      }

      const user = new User({
        email,
        password,
        role: 'student'
      });

      await user.save();

      const { accessToken, refreshToken } = generateTokens(user);
      
      // Save refresh token
      await user.addRefreshToken(refreshToken, refreshExpiresIn);

      res.status(201).json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Register new teacher (admin only)
  registerTeacher: async (req, res) => {
    try {
      const { email, password, profile } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Email already exists' 
        });
      }

      const teacher = new User({
        email,
        password,
        role: 'teacher',
        profile
      });

      await teacher.save();

      res.status(201).json({
        message: 'Teacher registered successfully',
        teacher: {
          id: teacher._id,
          email: teacher.email,
          role: teacher.role,
          profile: teacher.profile
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // First try to find admin
      const admin = await Admin.findOne({ email }).select('+password');
      if (admin) {
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = generateTokens({
          id: admin._id,
          role: admin.role,
          isAdmin: true
        });

        res.json({
          accessToken,
          refreshToken,
          user: {
            id: admin._id,
            email: admin.email,
            role: admin.role,
            isAdmin: true
          }
        });
        return;
      }

      // If not admin, try regular user
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const { accessToken, refreshToken } = generateTokens(user);
      
      // Save refresh token
      await user.addRefreshToken(refreshToken, refreshExpiresIn);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Forgot Password
  forgotPassword: async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
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

  // Reset Password
  resetPassword: async (req, res) => {
    try {
      const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ 
          message: 'Invalid or expired reset token' 
        });
      }

      user.password = req.body.password;
      user.clearPasswordResetToken();
      await user.save();

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get current user
  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.id)
        .select('-password -resetPasswordToken -resetPasswordExpires -refreshTokens');
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Add refresh token endpoint
  refresh: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, refreshSecret);
      
      // Find user and check if refresh token exists
      const user = await User.findOne({
        _id: decoded.id,
        'refreshTokens.token': refreshToken,
        'refreshTokens.expiresAt': { $gt: new Date() }
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      // Generate new tokens
      const tokens = generateTokens(user);
      
      // Replace old refresh token
      await user.removeRefreshToken(refreshToken);
      await user.addRefreshToken(tokens.refreshToken, refreshExpiresIn);

      res.json({
        ...tokens,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }
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

      // Find user and remove refresh token
      const user = await User.findOne({
        'refreshTokens.token': refreshToken
      });

      if (user) {
        await user.removeRefreshToken(refreshToken);
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = authController; 