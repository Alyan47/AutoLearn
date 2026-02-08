import express from 'express';
import User from '../models/User.js';
import StudySession from '../models/StudySession.js';
import QuizResult from '../models/QuizResult.js';
import Schedule from '../models/Schedule.js';

const router = express.Router();

// GET /api/analytics/dashboard - Get user dashboard data
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange = '30' } = req.query; // days

    // Get or create user
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId });
      await user.save();
    }

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Get study sessions in range
    const sessions = await StudySession.find({
      userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    // Get quiz results in range
    const quizResults = await QuizResult.find({
      userId,
      completedAt: { $gte: startDate }
    }).sort({ completedAt: -1 });

    // Get active schedules
    const activeSchedules = await Schedule.find({
      userId,
      active: true
    }).sort({ createdAt: -1 });

    // Calculate analytics
    const totalStudyTime = sessions.reduce((sum, s) => {
      return sum + (s.duration.actual || s.duration.planned || 0);
    }, 0);

    const completedSessions = sessions.filter(s => s.completed).length;
    
    const averageQuizScore = quizResults.length > 0
      ? quizResults.reduce((sum, q) => sum + q.quizData.score, 0) / quizResults.length
      : 0;

    // Get weak topics from recent quizzes
    const allWeakTopics = {};
    quizResults.forEach(result => {
      result.weakTopics.forEach(wt => {
        if (!allWeakTopics[wt.topic]) {
          allWeakTopics[wt.topic] = {
            topic: wt.topic,
            totalAsked: 0,
            totalCorrect: 0
          };
        }
        allWeakTopics[wt.topic].totalAsked += wt.questionsAsked;
        allWeakTopics[wt.topic].totalCorrect += wt.questionsCorrect;
      });
    });

    const weakTopics = Object.values(allWeakTopics)
      .map(t => ({
        topic: t.topic,
        accuracy: Math.round((t.totalCorrect / t.totalAsked) * 100),
        questionsAsked: t.totalAsked
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5); // Top 5 weakest

    // Study time by day for chart
    const studyTimeByDay = {};
    sessions.forEach(session => {
      const date = session.createdAt.toISOString().split('T')[0];
      studyTimeByDay[date] = (studyTimeByDay[date] || 0) + (session.duration.actual || session.duration.planned || 0);
    });

    // Quiz scores over time
    const quizScoresOverTime = quizResults.map(q => ({
      date: q.completedAt,
      score: q.quizData.score,
      material: q.materialTitle
    }));

    res.json({
      success: true,
      user: {
        userId: user.userId,
        stats: user.stats,
        preferences: user.preferences
      },
      analytics: {
        timeRange: parseInt(timeRange),
        totalStudyTime, // minutes
        totalStudyHours: Math.round(totalStudyTime / 60 * 10) / 10,
        completedSessions,
        totalQuizzes: quizResults.length,
        averageQuizScore: Math.round(averageQuizScore),
        currentStreak: user.stats.currentStreak,
        longestStreak: user.stats.longestStreak
      },
      weakTopics,
      activeSchedules: activeSchedules.map(s => s.getCurrentStatus()),
      charts: {
        studyTimeByDay: Object.entries(studyTimeByDay).map(([date, minutes]) => ({
          date,
          minutes,
          hours: Math.round(minutes / 60 * 10) / 10
        })),
        quizScoresOverTime
      },
      recentActivity: {
        sessions: sessions.slice(0, 10),
        quizzes: quizResults.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      details: error.message
    });
  }
});

// GET /api/analytics/weak-topics/:userId - Get detailed weak topics analysis
router.get('/weak-topics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const quizResults = await QuizResult.find({ userId })
      .sort({ completedAt: -1 })
      .limit(20); // Last 20 quizzes

    const topicAnalysis = {};

    quizResults.forEach(result => {
      result.answers.forEach(answer => {
        const topic = answer.topic || 'General';
        
        if (!topicAnalysis[topic]) {
          topicAnalysis[topic] = {
            topic,
            totalQuestions: 0,
            correctAnswers: 0,
            averageTimeTaken: 0,
            recentTrend: [],
            lastSeen: result.completedAt
          };
        }

        topicAnalysis[topic].totalQuestions++;
        if (answer.isCorrect) {
          topicAnalysis[topic].correctAnswers++;
        }
        topicAnalysis[topic].averageTimeTaken += answer.timeTaken || 0;
        topicAnalysis[topic].recentTrend.push({
          date: result.completedAt,
          correct: answer.isCorrect
        });
      });
    });

    const topics = Object.values(topicAnalysis).map(t => ({
      topic: t.topic,
      accuracy: Math.round((t.correctAnswers / t.totalQuestions) * 100),
      totalQuestions: t.totalQuestions,
      averageTimeTaken: Math.round(t.averageTimeTaken / t.totalQuestions),
      needsReview: t.correctAnswers / t.totalQuestions < 0.7,
      lastSeen: t.lastSeen,
      trend: t.recentTrend.slice(-5) // Last 5 attempts
    }));

    res.json({
      success: true,
      topics: topics.sort((a, b) => a.accuracy - b.accuracy)
    });

  } catch (error) {
    console.error('Weak topics error:', error);
    res.status(500).json({
      error: 'Failed to analyze weak topics',
      details: error.message
    });
  }
});

// GET /api/analytics/schedule-progress/:scheduleId - Get schedule progress
router.get('/schedule-progress/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await Schedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const status = schedule.getCurrentStatus();
    
    // Get study sessions related to this schedule
    const sessions = await StudySession.find({
      userId: schedule.userId,
      materialId: schedule.materialId
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      schedule: {
        id: schedule._id,
        materialTitle: schedule.materialTitle,
        status,
        progress: schedule.progress,
        settings: schedule.settings,
        startedAt: schedule.startedAt,
        completedAt: schedule.completedAt
      },
      sessions
    });

  } catch (error) {
    console.error('Schedule progress error:', error);
    res.status(500).json({
      error: 'Failed to fetch schedule progress',
      details: error.message
    });
  }
});

export default router;