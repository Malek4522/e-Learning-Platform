const Admin = require('../models/Admin');

module.exports = async (req, res, next) => {
    try {
        const adminId = req.user?.id;
        const admin = await Admin.findById(adminId);
        
        if (!admin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}; 