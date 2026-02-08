import express from 'express';
import Schedule from '../models/Schedule.js';

const router = express.Router();

// POST /api/schedule-progress/:id/start-session
router.post('/:id/start-session', async (req, res) => {
  try {
    const { id } = req.params;
    const { day, sessionIndex } = req.body;

    if (!day && !sessionIndex && day !== 0 && sessionIndex !== 0) {
      return res.status(400).json({ success: false, error: 'day and sessionIndex are required' });
    }

    const schedule = await Schedule.findById(id);
    if (!schedule) return res.status(404).json({ success: false, error: 'Schedule not found' });

    const alreadyStarted = schedule.progress.startedSessions.some(s => s.day === day && s.sessionIndex === sessionIndex);
    if (!alreadyStarted) {
      schedule.progress.startedSessions.push({ day, sessionIndex, startedAt: new Date() });
      await schedule.save();
    }

    res.json({ success: true, message: 'Session started', progress: schedule.progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to start session', details: err.message });
  }
});

export default router;
