const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const ms = require('ms');

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
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    required: true,
    enum: ['student', 'teacher'],
    default: 'student',
    immutable: true
  },
  profile: {
    type: profileSchema,
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  refreshTokens: [{
    token: String,
    expiresAt: Date
  }]
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Create indexes
userSchema.index({ email: 1 });

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

// Method to create a password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
  return resetToken;
};

// Method to clear a password reset token
userSchema.methods.clearPasswordResetToken = function() {
  this.resetPasswordToken = undefined;
  this.resetPasswordExpires = undefined;
};

// Add method to save refresh token
userSchema.methods.addRefreshToken = function(refreshToken, expiresIn) {
  const expiresAt = new Date(Date.now() + ms(expiresIn));
  
  // Remove expired tokens
  this.refreshTokens = this.refreshTokens.filter(token => 
    token.expiresAt > new Date()
  );
  
  this.refreshTokens.push({
    token: refreshToken,
    expiresAt
  });
  
  return this.save();
};

// Add method to remove refresh token
userSchema.methods.removeRefreshToken = function(refreshToken) {
  this.refreshTokens = this.refreshTokens.filter(token => 
    token.token !== refreshToken
  );
  return this.save();
};

// Add method to create email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.emailVerificationExpires = Date.now() + 24 * 3600000; // 24 hours
  
  return verificationToken;
};

// Add method to verify email
userSchema.methods.verifyEmail = function() {
  this.isEmailVerified = true;
  this.emailVerificationToken = undefined;
  this.emailVerificationExpires = undefined;
  return this.save();
};

// Create and export the model
const User = mongoose.model('User', userSchema);
module.exports = User; 