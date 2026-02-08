import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: false,
    index: true
  },
  materialId: {
    type: String,
    required: false
  },
  materialTitle: {
    type: String,
    required: false
  },
  quizData: {
    totalQuestions: {
      type: Number,
      required: true
    },
    correctAnswers: {
      type: Number,
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true
    }
  },
  answers: [{
    questionNumber: Number,
    question: String,
    selectedAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean,
    topic: String,
    timeTaken: Number // seconds
  }],
  weakTopics: [{
    topic: String,
    questionsAsked: Number,
    questionsCorrect: Number,
    accuracy: Number // percentage
  }],
  timeSpent: {
    type: Number, // seconds
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for analytics queries
quizResultSchema.index({ userId: 1, completedAt: -1 });
quizResultSchema.index({ userId: 1, materialId: 1 });

// Calculate weak topics from answers
quizResultSchema.methods.calculateWeakTopics = function() {
  const topicStats = {};
  
  this.answers.forEach(answer => {
    const topic = answer.topic || 'General';
    
    if (!topicStats[topic]) {
      topicStats[topic] = {
        topic,
        questionsAsked: 0,
        questionsCorrect: 0
      };
    }
    
    topicStats[topic].questionsAsked++;
    if (answer.isCorrect) {
      topicStats[topic].questionsCorrect++;
    }
  });
  
  // Convert to array and calculate accuracy
  this.weakTopics = Object.values(topicStats).map(stat => ({
    ...stat,
    accuracy: Math.round((stat.questionsCorrect / stat.questionsAsked) * 100)
  })).sort((a, b) => a.accuracy - b.accuracy); // Sort by accuracy (weakest first)
};

// Pre-save hook to calculate weak topics
quizResultSchema.pre('save', function(next) {
  if (this.isNew && this.answers.length > 0) {
    this.calculateWeakTopics();
  }
  next();
});

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

export default QuizResult;