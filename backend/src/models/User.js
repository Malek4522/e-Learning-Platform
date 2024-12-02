const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the profile schema as a sub-document
const profileSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  last_name: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  profile_picture: {
    type: String,
    default: 'default-profile.png' // You can set a default profile picture
  }
});

// Define the main user schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  role: {
    type: String,
    required: true,
    enum: ['student', 'teacher'],
    default: 'student'
  },
  profile: {
    type: profileSchema,
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Create indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to update balance
userSchema.methods.updateBalance = async function(amount) {
  const newBalance = this.balance + amount;
  if (newBalance < 0) {
    throw new Error('Insufficient balance');
  }
  this.balance = newBalance;
  return this.save();
};

// Create and export the model
const User = mongoose.model('User', userSchema);
module.exports = User; 