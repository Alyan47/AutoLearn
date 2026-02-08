import express from 'express';
import OpenAI from 'openai';
import { extractTextFromPDF, cleanText } from '../utils/pdfParser.js';
import Schedule from '../models/Schedule.js';
import User from '../models/User.js';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// POST /api/schedule - Generate study schedule using Groq
router.post('/', async (req, res) => {
  try {
    const { 
      filePath, 
      availableHoursPerDay = 2,
      targetDate,
      difficulty = 'medium',
      learningStyle = 'balanced',
      userId = 'default_user',
      materialId,
      materialTitle,
      saveToDatabase = true
    } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Extract text from PDF
    const { text, numPages } = await extractTextFromPDF(filePath);
    const cleanedText = cleanText(text);

    const maxChars = 50000;
    const textForAnalysis = cleanedText.length > maxChars 
      ? cleanedText.substring(0, maxChars)
      : cleanedText;

    const daysAvailable = targetDate 
      ? Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24))
      : 14;

    // Calculate start date for schedule
    const startDate = new Date();
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    console.log(`📚 Generating schedule for ${numPages} pages, ${daysAvailable} days available...`);

    // Generate study schedule using Groq
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: "You are an expert learning scientist and study planner. You MUST return ONLY valid JSON with no markdown, no code blocks, no backticks, no explanatory text. Just pure JSON."
        },
        {
          role: "user",
          content: `Analyze this educational material and create an optimal study schedule.

**Material to Study:**
${textForAnalysis}

**Constraints:**
- Available study time: ${availableHoursPerDay} hours per day
- Days until deadline: ${daysAvailable} days
- Difficulty level: ${difficulty}
- Learning style: ${learningStyle}
- Number of pages: ${numPages}

**Requirements:**
1. Break content into logical daily sessions
2. Use spaced repetition principles
3. Include different session types: reading, practice, quiz, review
4. Each session should have duration in minutes
5. Provide specific topics for each session
6. Set priority levels (high, medium, low)

**Return this EXACT JSON structure (no markdown code blocks!):**

{
  "totalEstimatedHours": 24,
  "recommendedDaysNeeded": 12,
  "schedule": [
    {
      "day": 1,
      "date": "${formatDate(startDate)}",
      "sessions": [
        {
          "title": "Introduction to Core Concepts",
          "duration": 60,
          "type": "reading",
          "topics": ["Topic 1", "Topic 2"],
          "description": "Focus on understanding fundamentals",
          "priority": "high"
        }
      ],
      "dailyGoal": "Understand basic principles",
      "totalMinutes": 120
    }
  ],
  "studyTips": ["Tip 1", "Tip 2", "Tip 3"],
  "milestones": [
    {
      "day": 4,
      "milestone": "Complete fundamentals",
      "assessment": "Self-quiz on key concepts"
    }
  ]
}

**CRITICAL RULES:**
- Return ONLY the JSON object
- NO markdown code blocks (no \`\`\`json)
- NO backticks
- NO explanatory text before or after
- Each day must have "sessions" array with all required fields
- Session "type" must be: reading, practice, quiz, or review
- Session "priority" must be: high, medium, or low
- Dates in YYYY-MM-DD format
- Duration in minutes (number)

START YOUR RESPONSE WITH { AND END WITH }`
        }
      ]
    });

    const responseText = completion.choices[0].message.content.trim();

    // Parse JSON with robust error handling
    let scheduleData;
    try {
      // Remove any potential markdown code blocks
      let cleanJson = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .trim();
      
      // Find JSON object boundaries
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('No valid JSON object found in response');
      }
      
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      
      // Parse the JSON
      scheduleData = JSON.parse(cleanJson);
      
      // Validate structure
      if (!scheduleData.schedule || !Array.isArray(scheduleData.schedule)) {
        throw new Error('Invalid schedule structure: missing or invalid schedule array');
      }
      
      if (scheduleData.schedule.length === 0) {
        throw new Error('Schedule array is empty');
      }
      
      // Validate first day has required fields
      const firstDay = scheduleData.schedule[0];
      if (!firstDay.sessions || !Array.isArray(firstDay.sessions)) {
        throw new Error('Invalid day structure: missing sessions array');
      }
      
      // Add dates if missing and ensure proper structure
      scheduleData.schedule = scheduleData.schedule.map((day, index) => {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + index);
        
        return {
          ...day,
          date: day.date || formatDate(dayDate),
          day: day.day || (index + 1)
        };
      });
      
      console.log(`✅ Schedule parsed successfully: ${scheduleData.schedule.length} days`);
      
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('📄 Raw response:', responseText);
      console.error('📏 Response length:', responseText.length);
      
      return res.status(500).json({
        error: 'Failed to parse schedule from AI',
        details: parseError.message,
        rawResponse: responseText.substring(0, 500)
      });
    }

    // Save to database if requested
    let savedSchedule = null;

    if (saveToDatabase) {
      try {
        // Deactivate previous schedules for this material
        await Schedule.updateMany(
          { userId, materialId, active: true },
          { active: false }
        );

        savedSchedule = new Schedule({
          userId,
          materialId: materialId || `material_${Date.now()}`,
          materialTitle: materialTitle || "Untitled Material",
          totalEstimatedHours: scheduleData.totalEstimatedHours || 0,
          recommendedDaysNeeded: scheduleData.recommendedDaysNeeded || 0,
          schedule: scheduleData.schedule || [],
          studyTips: scheduleData.studyTips || [],
          milestones: scheduleData.milestones || [],
          settings: {
            availableHoursPerDay,
            targetDate: targetDate ? new Date(targetDate) : null,
            difficulty,
            learningStyle
          }
        });

        await savedSchedule.save();
        console.log(`✅ Schedule saved to database: ${savedSchedule._id}`);

        // Update user stats
        const user = await User.getOrCreate(userId);
        user.stats.totalMaterialsStudied += 1;
        await user.save();
        
      } catch (dbError) {
        console.error('❌ Database save error:', dbError);
        // Don't fail the request if DB save fails
        console.warn('⚠️  Schedule generated but not saved to database');
      }
    }

    res.json({
      success: true,
      schedule: scheduleData,
      scheduleId: savedSchedule?._id,
      metadata: {
        materialPages: numPages,
        textLength: cleanedText.length,
        requestedHoursPerDay: availableHoursPerDay,
        daysAvailable,
        difficulty,
        savedToDatabase: !!savedSchedule
      }
    });

  } catch (error) {
    console.error("❌ Schedule Generation Error:", error);
    res.status(500).json({
      error: "Failed to generate study schedule",
      details: error.message
    });
  }
});

// POST /api/schedule/session/complete - Mark a session as complete
router.post('/session/complete', async (req, res) => {
  try {
    const { scheduleId, day, sessionIndex } = req.body;

    if (!scheduleId || day === undefined || sessionIndex === undefined) {
      return res.status(400).json({ 
        error: 'Schedule ID, day, and session index are required' 
      });
    }

    const schedule = await Schedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    schedule.completeSession(day, sessionIndex);
    await schedule.save();

    console.log(`✅ Session completed - Day ${day}, Session ${sessionIndex}`);

    res.json({
      success: true,
      status: schedule.getCurrentStatus()
    });

  } catch (error) {
    console.error('Session complete error:', error);
    res.status(500).json({
      error: 'Failed to mark session as complete',
      details: error.message
    });
  }
});

// GET /api/schedule/:userId - Get active schedules for a user
router.get('/:userId', async (req, res) => {
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
        startedAt: s.startedAt,
        settings: s.settings
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

// GET /api/schedule/detail/:scheduleId - Get full schedule details
router.get('/detail/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await Schedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({
      success: true,
      schedule: {
        id: schedule._id,
        materialTitle: schedule.materialTitle,
        totalEstimatedHours: schedule.totalEstimatedHours,
        recommendedDaysNeeded: schedule.recommendedDaysNeeded,
        schedule: schedule.schedule,
        studyTips: schedule.studyTips,
        milestones: schedule.milestones,
        status: schedule.getCurrentStatus(),
        progress: schedule.progress,
        settings: schedule.settings,
        startedAt: schedule.startedAt,
        completedAt: schedule.completedAt
      }
    });

  } catch (error) {
    console.error('Get schedule detail error:', error);
    res.status(500).json({
      error: 'Failed to fetch schedule details',
      details: error.message
    });
  }
});

export default router;