import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Summary from './components/Summary';
import Quiz from './components/Quiz';
import Schedule from './components/Schedule';
import Dashboard from './components/Dashboard';
import { uploadFile, generateSummary, generateQuiz, generateSchedule, adjustSchedule } from './services/api';
import './App.css';

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');

  const userId = "12345"; // temporary

  // File upload
  const handleFileUpload = async (file) => {
    try {
      setError(null);
      setActiveTab('upload');
      
      const uploadResponse = await uploadFile(file);
      setUploadedFile(uploadResponse);
      
      setActiveTab('summary');
      setIsLoadingSummary(true);
      
      const summaryResponse = await generateSummary(uploadResponse.filePath);
      setSummary(summaryResponse.summary);
      setIsLoadingSummary(false);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process file');
      setIsLoadingSummary(false);
      console.error('Upload error:', err);
    }
  };

  // Quiz generation
  const handleGenerateQuiz = async () => {
    if (!uploadedFile) return;
    
    try {
      setError(null);
      setActiveTab('quiz');
      setIsLoadingQuiz(true);
      
      const quizResponse = await generateQuiz(uploadedFile.filePath, {
        numQuestions: 5,
        difficulty: 'medium'
      });
      
      setQuiz(quizResponse.quiz);
      setIsLoadingQuiz(false);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz');
      setIsLoadingQuiz(false);
      console.error('Quiz generation error:', err);
    }
  };

  // Schedule generation
  const handleGenerateSchedule = async () => {
    if (!uploadedFile) return;
    
    try {
      setError(null);
      setActiveTab('schedule');
      setIsLoadingSchedule(true);
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);

      const scheduleResponse = await generateSchedule(uploadedFile.filePath, {
        availableHoursPerDay: 2,
        targetDate: targetDate.toISOString().split('T')[0],
        difficulty: 'medium',
        learningStyle: 'balanced',
        userId
      });
      
      setSchedule(scheduleResponse.schedule);
      setIsLoadingSchedule(false);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate schedule');
      setIsLoadingSchedule(false);
      console.error('Schedule generation error:', err);
    }
  };

  // Adjust schedule
  const handleAdjustSchedule = async (adjustmentType) => {
    if (!schedule) return;
    
    try {
      setError(null);
      setIsLoadingSchedule(true);
      
      const adjustments = {
        'more-time': 'I need more time per day - extend the schedule to reduce daily workload',
        'faster-pace': 'I want to finish faster - compress the schedule to fewer days',
        'more-practice': 'Add more practice and review sessions throughout the schedule'
      };
      
      const adjustedResponse = await adjustSchedule(
        schedule,
        adjustments[adjustmentType] || adjustmentType
      );
      
      setSchedule(adjustedResponse.schedule);
      setIsLoadingSchedule(false);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to adjust schedule');
      setIsLoadingSchedule(false);
      console.error('Schedule adjustment error:', err);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🤖 AutoLearn</h1>
          <p className="tagline">Your AI-Powered Study Assistant</p>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            {error}
            <button className="error-close" onClick={() => setError(null)}>×</button>
          </div>
        )}

        {!uploadedFile ? (
          <div className="upload-section">
            <FileUpload onFileUploaded={handleFileUpload} />
          </div>
        ) : (
          <>
            <div className="tabs">
              <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
              <button className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>📝 Summary</button>
              <button className={`tab ${activeTab === 'quiz' ? 'active' : ''}`} onClick={() => { setActiveTab('quiz'); if (!quiz && !isLoadingQuiz) handleGenerateQuiz(); }}>🎯 Quiz</button>
              <button className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => { setActiveTab('schedule'); if (!schedule && !isLoadingSchedule) handleGenerateSchedule(); }}>📅 Schedule</button>
            </div>

            <div className="content-area">
              {activeTab === 'dashboard' && <Dashboard userId={userId} />}
              {activeTab === 'summary' && <Summary summary={summary} isLoading={isLoadingSummary} />}
              {activeTab === 'quiz' && <Quiz quiz={quiz} isLoading={isLoadingQuiz} />}
              {activeTab === 'schedule' && (
                <Schedule 
                  schedule={schedule} 
                  isLoading={isLoadingSchedule}
                  onAdjust={handleAdjustSchedule}
                  userId={userId}
                  materialId={uploadedFile?.id}
                  materialTitle={uploadedFile?.fileName}
                  filePath={uploadedFile?.filePath}
                />
              )}
            </div>

            <div className="action-bar">
              <button className="secondary-button" onClick={() => {
                setUploadedFile(null);
                setSummary(null);
                setQuiz(null);
                setSchedule(null);
                setActiveTab('upload');
              }}>
                📄 Upload New File
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Claude AI •✨</p>
      </footer>
    </div>
  );
}

export default App;
