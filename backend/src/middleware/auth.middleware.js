const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (['superadmin', 'contentmanager', 'moderator'].includes(decoded.role)) {
            // Verify admin exists in database
            const admin = await Admin.findById(decoded.id);
            if (!admin) {
                return res.status(401).json({ message: 'Invalid admin account' });
            }
            req.admin = decoded;
        } else if (['student', 'teacher'].includes(decoded.role)) {
            // Verify user exists in database
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'Invalid or inactive user account' });
            }
            req.user = decoded;
        } else {
            return res.status(401).json({ message: 'Invalid user role' });
        }
        
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
}; 