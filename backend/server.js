import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';

// Route imports
import uploadRouter from './routes/upload.js';
import summarizeRouter from './routes/summarize.js';
import quizRouter from './routes/quiz.js';
import scheduleRouter from './routes/schedule.js';
import analyticsRouter from './routes/analytics.js';
import progressRouter from './routes/progress.js';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/summarize', summarizeRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/progress', progressRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
    mongoDBConfigured: !!process.env.MONGODB_URI,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🤖 AutoLearn API - Phase 2B Complete',
    version: '2.0.0',
    features: [
      'PDF Upload & Processing',
      'AI-Powered Summaries',
      'Quiz Generation',
      'Study Schedule Planning',
      'Progress Tracking',
      'Analytics Dashboard',
      'MongoDB Persistence'
    ],
    endpoints: {
      upload: 'POST /api/upload',
      summarize: 'POST /api/summarize',
      quiz: 'POST /api/quiz',
      quizSubmit: 'POST /api/quiz/submit',
      schedule: 'POST /api/schedule',
      scheduleComplete: 'POST /api/schedule/session/complete',
      getSchedules: 'GET /api/schedule/:userId',
      dashboard: 'GET /api/analytics/dashboard/:userId',
      weakTopics: 'GET /api/analytics/weak-topics/:userId',
      sessionStart: 'POST /api/progress/session/start',
      sessionComplete: 'POST /api/progress/session/complete',
      health: 'GET /health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║                                                    ║');
  console.log('║      🤖  AutoLearn API - Phase 2B Complete  🚀     ║');
  console.log('║                                                    ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log('');
  console.log('📝 Available Endpoints:');
  console.log('   ├─ POST   /api/upload');
  console.log('   ├─ POST   /api/summarize');
  console.log('   ├─ POST   /api/quiz');
  console.log('   ├─ POST   /api/quiz/submit');
  console.log('   ├─ POST   /api/schedule');
  console.log('   ├─ POST   /api/schedule/session/complete');
  console.log('   ├─ GET    /api/schedule/:userId');
  console.log('   ├─ GET    /api/analytics/dashboard/:userId');
  console.log('   ├─ GET    /api/analytics/weak-topics/:userId');
  console.log('   ├─ POST   /api/progress/session/start');
  console.log('   ├─ POST   /api/progress/session/complete');
  console.log('   └─ GET    /health');
  console.log('');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  WARNING: ANTHROPIC_API_KEY not set');
  } else {
    console.log('✅ Anthropic API Key: Configured');
  }
  
  if (!process.env.MONGODB_URI) {
    console.log('⚠️  WARNING: MONGODB_URI not set');
  } else {
    console.log('✅ MongoDB URI: Configured');
  }
  
  console.log('');
  console.log('📚 Features:');
  console.log('   ✓ PDF Upload & Text Extraction');
  console.log('   ✓ AI Summarization (Claude Sonnet 4)');
  console.log('   ✓ Quiz Generation with Topics');
  console.log('   ✓ Study Schedule Planning');
  console.log('   ✓ Progress Tracking & Analytics');
  console.log('   ✓ MongoDB Data Persistence');
  console.log('   ✓ Study Streak Tracking');
  console.log('   ✓ Weak Topic Identification');
  console.log('');
  console.log('💡 Tip: Visit http://localhost:5000/health to check status');
  console.log('');
});

export default app;