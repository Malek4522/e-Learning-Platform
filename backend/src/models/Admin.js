const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const ms = require('ms');

// Define the main admin schema
const adminSchema = new mongoose.Schema({
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
    enum: ['superadmin', 'contentmanager', 'moderator'], // Add more roles as needed
    default: 'superadmin'
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
adminSchema.index({ email: 1 });

// Hash password before saving
adminSchema.pre('save', async function(next) {
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
adminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to create a password reset token
adminSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
  return resetToken;
};

// Method to clear a password reset token
adminSchema.methods.clearPasswordResetToken = function() {
  this.resetPasswordToken = undefined;
  this.resetPasswordExpires = undefined;
};

// Add method to save refresh token
adminSchema.methods.addRefreshToken = function(refreshToken, expiresIn) {
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
adminSchema.methods.removeRefreshToken = function(refreshToken) {
  this.refreshTokens = this.refreshTokens.filter(token => 
    token.token !== refreshToken
  );
  return this.save();
};

// Create and export the model
const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin; 