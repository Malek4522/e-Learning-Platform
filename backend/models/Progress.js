const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the sub-schemas for lessons completion
const LessonCompletionSchema = new Schema({
    chapter_id: {
        type: Schema.Types.ObjectId,
        required: true
    },
    lesson_index: {
        type: Number,
        required: true
    },
    content_completed: {
        type: Boolean,
        default: false
    },
    quiz_score: {
        type: Number,
        min: 0,
        max: 100
    },
    completed_at: {
        type: Date,
        default: Date.now
    }
});

// Main Progress Schema
const ProgressSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course_id: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    lessons_completed: [LessonCompletionSchema],
    percentage_completed: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// Method to calculate and update percentage completed
ProgressSchema.methods.calculatePercentage = async function() {
    try {
        // Populate the course to get total chapters and their lessons
        const course = await mongoose.model('Course').findById(this.course_id);
        if (!course) return;

        // Calculate total number of lessons (content + quiz pairs)
        const totalLessons = course.chapters.reduce((sum, chapter) => 
            sum + chapter.lessons.length, 0) * 2; // multiply by 2 because each lesson has content and quiz

        if (totalLessons === 0) {
            this.percentage_completed = 0;
            return;
        }

        // Calculate completed items (content views + quizzes completed)
        const completedItems = this.lessons_completed.reduce((sum, lesson) => {
            let itemCount = 0;
            if (lesson.content_completed) itemCount++;
            if (lesson.quiz_score !== undefined) itemCount++;
            return sum + itemCount;
        }, 0);

        this.percentage_completed = Math.round((completedItems / totalLessons) * 100);
    } catch (error) {
        console.error('Error calculating percentage:', error);
    }
};

// Middleware to auto-calculate percentage before saving
ProgressSchema.pre('save', async function(next) {
    await this.calculatePercentage();
    next();
});

// Create indexes for efficient querying
ProgressSchema.index({ user_id: 1 });
ProgressSchema.index({ course_id: 1 });
ProgressSchema.index({ user_id: 1, course_id: 1 }, { unique: true });

const Progress = mongoose.model('Progress', ProgressSchema);

module.exports = Progress; 