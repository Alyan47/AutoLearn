import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
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
  totalEstimatedHours: {
    type: Number,
    default: 0
  },
  recommendedDaysNeeded: {
    type: Number,
    default: 0
  },
  schedule: [{
    day: Number,
    date: String,
    sessions: [{
      title: String,
      duration: Number,
      type: String,
      topics: [String],
      description: String,
      priority: String
    }],
    dailyGoal: String,
    totalMinutes: Number
  }],
  studyTips: [String],
  milestones: [{
    day: Number,
    milestone: String,
    assessment: String
  }],
  settings: {
    availableHoursPerDay: Number,
    targetDate: Date,
    difficulty: String,
    learningStyle: String
  },
  progress: {
    currentDay: {
      type: Number,
      default: 1
    },
    completedDays: [{
      type: Number
    }],
    completedSessions: [{
      day: Number,
      sessionIndex: Number,
      completedAt: Date
    }],
    percentComplete: {
      type: Number,
      default: 0
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
}, {
  timestamps: true
});

// Indexes for querying active schedules
scheduleSchema.index({ userId: 1, active: 1, createdAt: -1 });
scheduleSchema.index({ userId: 1, materialId: 1, active: 1 });

// Method to mark session as complete
scheduleSchema.methods.completeSession = function(day, sessionIndex) {
  // Add to completed sessions
  this.progress.completedSessions.push({
    day,
    sessionIndex,
    completedAt: new Date()
  });
  
  // Check if day is complete
  const dayData = this.schedule.find(d => d.day === day);
  if (dayData) {
    const totalSessions = dayData.sessions.length;
    const completedSessionsForDay = this.progress.completedSessions.filter(
      s => s.day === day
    ).length;
    
    // If all sessions for the day are complete, mark day as complete
    if (completedSessionsForDay >= totalSessions && 
        !this.progress.completedDays.includes(day)) {
      this.progress.completedDays.push(day);
      this.progress.currentDay = day + 1;
    }
  }
  
  // Calculate overall progress percentage
  const totalSessions = this.schedule.reduce(
    (sum, day) => sum + day.sessions.length, 0
  );
  this.progress.percentComplete = Math.round(
    (this.progress.completedSessions.length / totalSessions) * 100
  );
  
  // Mark schedule as completed if all days done
  if (this.progress.completedDays.length >= this.schedule.length) {
    this.completedAt = new Date();
    this.active = false;
  }
};

// Method to get current status
scheduleSchema.methods.getCurrentStatus = function() {
  const totalDays = this.schedule.length;
  const completedDays = this.progress.completedDays.length;
  const currentDayData = this.schedule.find(
    d => d.day === this.progress.currentDay
  );
  
  return {
    currentDay: this.progress.currentDay,
    totalDays,
    completedDays,
    percentComplete: this.progress.percentComplete,
    isComplete: !this.active && !!this.completedAt,
    nextSession: currentDayData?.sessions[0] || null,
    daysRemaining: totalDays - completedDays,
    totalSessions: this.schedule.reduce(
      (sum, day) => sum + day.sessions.length, 0
    ),
    completedSessions: this.progress.completedSessions.length
  };
};

// Virtual for days elapsed
scheduleSchema.virtual('daysElapsed').get(function() {
  if (!this.startedAt) return 0;
  const now = new Date();
  const diff = now - this.startedAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON
scheduleSchema.set('toJSON', { virtuals: true });
scheduleSchema.set('toObject', { virtuals: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;