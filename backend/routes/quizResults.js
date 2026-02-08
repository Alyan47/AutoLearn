import express from 'express';
import QuizResult from '../models/QuizResult.js';

const router = express.Router();

// POST /api/quiz-results
router.post('/', async (req, res) => {
  try {
    const { userId, materialId, materialTitle, quizData, answers, timeSpent } = req.body;

    const missingFields = [];
    if (!userId) missingFields.push('userId');
    if (!materialId) missingFields.push('materialId');
    if (!materialTitle) missingFields.push('materialTitle');
    if (!quizData) missingFields.push('quizData');
    if (!answers) missingFields.push('answers');
    if (timeSpent == null) missingFields.push('timeSpent');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    const quizResult = new QuizResult({ userId, materialId, materialTitle, quizData, answers, timeSpent });
    await quizResult.save();

    res.json({ success: true, message: 'Quiz result saved successfully' });

  } catch (error) {
    console.error('Error saving quiz result:', error);
    res.status(500).json({ success: false, error: 'Failed to save quiz result', details: error.message });
  }
});

export default router;
