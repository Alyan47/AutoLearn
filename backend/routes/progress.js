import express from 'express';
import User from '../models/User.js';
import StudySession from '../models/StudySession.js';
import QuizResult from '../models/QuizResult.js';
import Schedule from '../models/Schedule.js';

const router = express.Router();

// POST /api/progress/session/start - Start a study session
router.post('/session/start', async (req, res) => {
  try {
    const {
      userId,
      materialId,
      materialTitle,
      sessionType,
      scheduledDay,
      plannedDuration,
      topics
    } = req.body;

    const session = new StudySession({
      userId,
      materialId,
      materialTitle,
      sessionType,
      scheduledDay,
      duration: {
        planned: plannedDuration
      },
      startTime: new Date(),
      topics: topics || []
    });

    await session.save();

    res.json({
      success: true,
      session: {
        id: session._id,
        startTime: session.startTime,
        plannedDuration
      }
    });

  } catch (error) {
    console.error('Session start error:', error);
    res.status(500).json({
      error: 'Failed to start session',
      details: error.message
    });
  }
});

// POST /api/progress/session/complete - Complete a study session
router.post('/session/complete', async (req, res) => {
  try {
    const {
      sessionId,
      notes,
      performance
    } = req.body;

    const session = await StudySession.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.endTime = new Date();
    session.completeSession();
    
    if (notes) session.notes = notes;
    if (performance) session.performance = performance;

    await session.save();

    // Update user stats
    const user = await User.findOne({ userId: session.userId });
    if (user) {
      user.stats.totalStudyHours += (session.duration.actual || 0) / 60;
      user.updateStreak();
      await user.save();
    }

    // If this was part of a schedule, update schedule progress
    if (session.scheduledDay) {
      const schedule = await Schedule.findOne({
        userId: session.userId,
        materialId: session.materialId,
        active: true
      });
      
      if (schedule) {
        // Find session index in schedule
        const dayData = schedule.scheduleData.schedule.find(
          d => d.day === session.scheduledDay
        );
        if (dayData) {
          const sessionIndex = dayData.sessions.findIndex(
            s => s.type === session.sessionType
          );
          if (sessionIndex !== -1) {
            schedule.completeSession(session.scheduledDay, sessionIndex);
            await schedule.save();
          }
        }
      }
    }

    res.json({
      success: true,
      session: {
        id: session._id,
        duration: session.duration.actual,
        completed: session.completed
      }
    });

  } catch (error) {
    console.error('Session complete error:', error);
    res.status(500).json({
      error: 'Failed to complete session',
      details: error.message
    });
  }
});

// POST /api/progress/quiz/submit - Submit quiz results
router.post('/quiz/submit', async (req, res) => {
  try {
    const {
      userId,
      materialId,
      materialTitle,
      quizData,
      answers,
      timeSpent
    } = req.body;

    const quizResult = new QuizResult({
      userId,
      materialId,
      materialTitle,
      quizData,
      answers,
      timeSpent
    });

    await quizResult.save();

    // Update user stats
    const user = await User.findOne({ userId });
    if (user) {
      const totalQuizzes = user.stats.totalQuizzesTaken + 1;
      const currentAvg = user.stats.averageQuizScore || 0;
      const newAvg = (currentAvg * user.stats.totalQuizzesTaken + quizData.score) / totalQuizzes;
      
      user.stats.totalQuizzesTaken = totalQuizzes;
      user.stats.averageQuizScore = Math.round(newAvg);
      user.updateStreak();
      
      await user.save();
    }

    res.json({
      success: true,
      result: {
        id: quizResult._id,
        score: quizResult.quizData.score,
        weakTopics: quizResult.weakTopics
      }
    });

  } catch (error) {
    console.error('Quiz submit error:', error);
    res.status(500).json({
      error: 'Failed to submit quiz results',
      details: error.message
    });
  }
});

// POST /api/progress/schedule/save - Save a generated schedule
router.post('/schedule/save', async (req, res) => {
  try {
    const {
      userId,
      materialId,
      materialTitle,
      scheduleData,
      settings
    } = req.body;

    // Deactivate any existing active schedules for this material
    await Schedule.updateMany(
      { userId, materialId, active: true },
      { active: false }
    );

    const schedule = new Schedule({
      userId,
      materialId,
      materialTitle,
      scheduleData,
      settings
    });

    await schedule.save();

    res.json({
      success: true,
      schedule: {
        id: schedule._id,
        status: schedule.getCurrentStatus()
      }
    });

  } catch (error) {
    console.error('Schedule save error:', error);
    res.status(500).json({
      error: 'Failed to save schedule',
      details: error.message
    });
  }
});

// GET /api/progress/schedule/:userId - Get active schedules
router.get('/schedule/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const schedules = await Schedule.find({
      userId,
      active: true
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      schedules: schedules.map(s => ({
        id: s._id,
        materialTitle: s.materialTitle,
        status: s.getCurrentStatus(),
        startedAt: s.startedAt
      }))
    });

  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      error: 'Failed to fetch schedules',
      details: error.message
    });
  }
});

export default router;