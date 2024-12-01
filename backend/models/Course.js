const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Quiz Question Schema
const questionSchema = new Schema({
  question_text: {
    type: String,
    required: [true, 'Question text is required']
  },
  options: {
    type: [String],
    required: [true, 'Options are required'],
    validate: [arr => arr.length >= 2, 'At least 2 options are required']
  },
  correct_answer_index: {
    type: Number,
    required: [true, 'Correct answer index is required'],
    validate: {
      validator: function(v) {
        return v >= 0 && v < this.options.length;
      },
      message: 'Correct answer index must be valid'
    }
  },
  explanation: {
    type: String,
    required: [true, 'Explanation is required']
  },
  image_url: String
});

// Quiz Schema
const quizSchema = new Schema({
  quiz_title: {
    type: String,
    required: [true, 'Quiz title is required']
  },
  questions: {
    type: [questionSchema],
    required: true,
    validate: [arr => arr.length >= 1, 'At least one question is required']
  }
});

// Document Schema
const documentSchema = new Schema({
  doc_url: {
    type: String,
    required: [true, 'Document URL is required']
  },
  description: {
    type: String,
    required: [true, 'Document description is required']
  }
});

// Video Schema
const videoSchema = new Schema({
  video_url: {
    type: String,
    required: [true, 'Video URL is required']
  },
  description: {
    type: String,
    required: [true, 'Video description is required']
  }
});

// Content Schema
const contentSchema = new Schema({
  video: videoSchema,
  document: documentSchema
}, {
  validate: [
    {
      validator: function(content) {
        return content.video || content.document;
      },
      message: 'Content must contain either a video, document, or both'
    }
  ]
});

// Chapter Schema
const chapterSchema = new Schema({
  chapter_title: {
    type: String,
    required: [true, 'Chapter title is required']
  },
  lessons: {
    type: [{
      content: {
        type: contentSchema,
        required: true
      },
      quiz: {
        type: quizSchema,
        required: true
      }
    }],
    required: true,
    validate: [arr => arr.length >= 1, 'At least one lesson is required']
  }
});

// Review Schema
const reviewSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: String,
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Main Course Schema
const courseSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  categories: {
    type: [String],
    required: true,
    validate: [arr => arr.length > 0, 'At least one category is required']
  },
  teacher_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students_enrolled: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  chapters: {
    type: [chapterSchema],
    required: true,
    validate: [arr => arr.length > 0, 'At least one chapter is required']
  },
  reviews: [reviewSchema]
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
courseSchema.index({ teacher_id: 1 });
courseSchema.index({ categories: 1 });
courseSchema.index({ 'reviews.user_id': 1 });
courseSchema.index({ title: 'text', description: 'text' }); // Text index for search
courseSchema.index({ price: 1 }); // Index for price
courseSchema.index({ created_at: 1 }); // Index for created_at

// Virtual for average rating
courseSchema.virtual('averageRating').get(function() {
  if (this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((total, review) => total + review.rating, 0);
  return (sum / this.reviews.length).toFixed(1);
});

// Methods
courseSchema.methods.enrollStudent = async function(studentId) {
  if (this.students_enrolled.includes(studentId)) {
    throw new Error('Student already enrolled');
  }
  this.students_enrolled.push(studentId);
  return this.save();
};

courseSchema.methods.addReview = async function(userId, rating, comment = null) {
  const existingReview = this.reviews.find(review => 
    review.user_id.toString() === userId.toString()
  );
  
  if (existingReview) {
    throw new Error('User has already reviewed this course');
  }

  const review = {
    user_id: userId,
    rating
  };

  if (comment) {
    review.comment = comment;
  }

  this.reviews.push(review);
  
  return this.save();
};

// Create and export the model
const Course = mongoose.model('Course', courseSchema);
module.exports = Course; 