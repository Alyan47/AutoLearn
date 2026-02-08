import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  materialId: {
    type: String,
    required: true,
    index: true
  },
  materialTitle: {
    type: String,
    required: true
  },
  sessionType: {
    type: String,
    enum: ['reading', 'practice', 'quiz', 'review'],
    required: true
  },
  scheduledDay: {
    type: Number
  },
  duration: {
    planned: {
      type: Number, // minutes
      required: true
    },
    actual: {
      type: Number // minutes
    }
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  completed: {
    type: Boolean,
    default: false
  },
  topics: [{
    type: String
  }],
  notes: {
    type: String,
    maxlength: 2000
  },
  performance: {
    understood: {
      type: Number,
      min: 0,
      max: 5 // Self-rating 0-5
    },
    difficulty: {
      type: Number,
      min: 0,
      max: 5 // Self-rating 0-5
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
studySessionSchema.index({ userId: 1, createdAt: -1 });
studySessionSchema.index({ userId: 1, materialId: 1 });
studySessionSchema.index({ userId: 1, completed: 1 });

// Calculate actual duration when session ends
studySessionSchema.methods.completeSession = function() {
  if (this.startTime && this.endTime) {
    const durationMs = this.endTime - this.startTime;
    this.duration.actual = Math.round(durationMs / (1000 * 60)); // Convert to minutes
  } else if (!this.duration.actual) {
    // If no end time recorded, use planned duration
    this.duration.actual = this.duration.planned;
  }
  this.completed = true;
};

// Virtual for duration difference
studySessionSchema.virtual('durationDifference').get(function() {
  if (this.duration.actual && this.duration.planned) {
    return this.duration.actual - this.duration.planned;
  }
  return 0;
});

// Ensure virtuals are included in JSON
studySessionSchema.set('toJSON', { virtuals: true });
studySessionSchema.set('toObject', { virtuals: true });

const StudySession = mongoose.model('StudySession', studySessionSchema);

export default StudySession;