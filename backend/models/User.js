import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: () => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  name: {
    type: String,
    default: 'Anonymous User'
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true
  },
  preferences: {
    learningStyle: {
      type: String,
      enum: ['visual', 'reading', 'practice', 'balanced'],
      default: 'balanced'
    },
    defaultStudyHours: {
      type: Number,
      default: 2,
      min: 0.5,
      max: 12
    },
    defaultDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    }
  },
  stats: {
    totalStudyHours: {
      type: Number,
      default: 0
    },
    totalQuizzesTaken: {
      type: Number,
      default: 0
    },
    averageQuizScore: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastStudyDate: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update timestamps on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to update study streak
userSchema.methods.updateStreak = function() {
  const today = new Date().setHours(0, 0, 0, 0);
  const lastStudy = this.stats.lastStudyDate 
    ? new Date(this.stats.lastStudyDate).setHours(0, 0, 0, 0)
    : null;

  if (!lastStudy) {
    // First study session
    this.stats.currentStreak = 1;
  } else {
    const daysDiff = (today - lastStudy) / (1000 * 60 * 60 * 24);
    
    if (daysDiff === 1) {
      // Consecutive day - increment streak
      this.stats.currentStreak += 1;
    } else if (daysDiff === 0) {
      // Same day - no change
    } else {
      // Streak broken - reset
      this.stats.currentStreak = 1;
    }
  }

  // Update longest streak
  if (this.stats.currentStreak > this.stats.longestStreak) {
    this.stats.longestStreak = this.stats.currentStreak;
  }

  this.stats.lastStudyDate = new Date();
};

const User = mongoose.model('User', userSchema);

export default User;