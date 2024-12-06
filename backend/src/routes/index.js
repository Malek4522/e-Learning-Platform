const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');

// API Routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

module.exports = router; 