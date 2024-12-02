const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authMiddleware, roleCheck } = require('../middleware/auth.middleware');

// Get all teachers
router.get('/teachers', 
  authMiddleware,
  roleCheck(['admin']),
  async (req, res) => {
    try {
      const teachers = await User.find({ role: 'teacher' })
        .select('-password -resetPasswordToken -resetPasswordExpires');
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Update teacher status/info
router.patch('/teachers/:id',
  authMiddleware,
  roleCheck(['admin']),
  [
    body('profile.first_name').optional().notEmpty(),
    body('profile.last_name').optional().notEmpty(),
    body('profile.bio').optional().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const teacher = await User.findOne({ 
        _id: req.params.id,
        role: 'teacher'
      });

      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      // Update allowed fields
      if (req.body.profile) {
        teacher.profile = {
          ...teacher.profile,
          ...req.body.profile
        };
      }

      await teacher.save();

      res.json({
        message: 'Teacher updated successfully',
        teacher: {
          id: teacher._id,
          email: teacher.email,
          profile: teacher.profile
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete teacher
router.delete('/teachers/:id',
  authMiddleware,
  roleCheck(['admin']),
  async (req, res) => {
    try {
      const teacher = await User.findOneAndDelete({ 
        _id: req.params.id,
        role: 'teacher'
      });

      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router; 