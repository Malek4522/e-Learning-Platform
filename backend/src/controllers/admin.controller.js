const User = require('../models/User');
const Course = require('../models/Course');
const Forum = require('../models/Forum');
const Progress = require('../models/Progress');
const mongoose = require('mongoose');

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};
exports.getUserByIdentifier = async (req, res) => {
    try {
        const { identifier } = req.params;
        
        // Check if identifier is a valid MongoDB ObjectId (for ID search)
        const isValidObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
        
        let query;
        if (isValidObjectId) {
            query = { _id: identifier };
        } else if (identifier.includes('@')) {
            query = { email: identifier };
        } else {
            return res.status(400).json({ message: 'Invalid identifier. Must be an ID or email.' });
        }

        const user = await User.findOne(query);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error finding user' });
    }
};


exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id, 
            req.body,
            { new: true }
        );
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Delete user's courses if they are a teacher
            await Course.deleteMany({ teacher_id: userId }).session(session);

            // 2. Remove user from enrolled courses
            await Course.updateMany(
                { students_enrolled: userId },
                { $pull: { students_enrolled: userId } }
            ).session(session);

            // 3. Delete user's reviews from all courses
            await Course.updateMany(
                { 'reviews.user_id': userId },
                { $pull: { reviews: { user_id: userId } } }
            ).session(session);

            // 4. Handle Forums
            // 4.1 Delete user's posts
            await Forum.updateMany(
                {},
                { $pull: { posts: { author_id: userId } } }
            ).session(session);

            // 4.2 Delete user's comments
            await Forum.updateMany(
                {},
                { 
                    $pull: { 
                        'posts.$[].comments': { author_id: userId }
                    }
                }
            ).session(session);

            // 4.3 Remove user's likes from posts and comments
            await Forum.updateMany(
                {},
                { 
                    $pull: { 
                        'posts.$[].likes': userId,
                        'posts.$[].comments.$[].likes': userId
                    }
                }
            ).session(session);

            // 5. Delete user's progress records
            await Progress.deleteMany({ user_id: userId }).session(session);

            // 6. Finally delete the user
            const deletedUser = await User.findByIdAndDelete(userId).session(session);

            if (!deletedUser) {
                throw new Error('User not found');
            }

            // Commit the transaction
            await session.commitTransaction();
            res.json({ 
                message: 'User and all related data deleted successfully',
                deletedUser
            });

        } catch (error) {
            // If anything fails, abort the transaction
            await session.abortTransaction();
            throw error;
        } finally {
            // End the session
            session.endSession();
        }

    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(error.message === 'User not found' ? 404 : 500).json({ 
            message: error.message || 'Error deleting user and related data'
        });
    }
}; 