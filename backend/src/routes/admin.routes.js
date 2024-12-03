const express = require('express');
const router = express.Router();
const { 
    getUsers,
    updateUser,
    deleteUser 
} = require('../controllers/admin.controller');
const adminMiddleware = require('../middleware/admin.middleware');

// Apply admin middleware to all routes
router.use(adminMiddleware);

router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router; 