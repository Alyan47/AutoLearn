import React, { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard({ userId }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, [userId, timeRange]);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/analytics/dashboard/${userId}?timeRange=${timeRange}`
      );
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data);
      } else {
        setError('Failed to load dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          <span>⚠️</span>
          <p>{error}</p>
          <button onClick={fetchDashboard}>Retry</button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { analytics, weakTopics, charts, recentActivity, activeSchedules } = dashboardData;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h2>📊 Your Learning Dashboard</h2>
        <div className="time-range-selector">
          <button 
            className={timeRange === '7' ? 'active' : ''}
            onClick={() => setTimeRange('7')}
          >
            7 Days
          </button>
          <button 
            className={timeRange === '30' ? 'active' : ''}
            onClick={() => setTimeRange('30')}
          >
            30 Days
          </button>
          <button 
            className={timeRange === '90' ? 'active' : ''}
            onClick={() => setTimeRange('90')}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card ">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <span className="stat-value">{analytics.totalStudyHours}h</span>
            <span className="stat-label">Total Study Time</span>
          </div>
        </div>

        
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">{analytics.completedSessions}</span>
            <span className="stat-label">Sessions Complete</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <span className="stat-value">{analytics.averageQuizScore}%</span>
            <span className="stat-label">Avg Quiz Score</span>
          </div>
        </div>

        <div className="stat-card ">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <span className="stat-value">{analytics.currentStreak}</span>
            <span className="stat-label">Day Streak</span>
            <span className="stat-subtext">Best: {analytics.longestStreak} days</span>
          </div>
        </div>
      </div>

      {/* Active Schedules */}
      {activeSchedules && activeSchedules.length > 0 && (
        <div className="section">
          <h3>📅 Active Study Plans</h3>
          <div className="schedules-list">
            {activeSchedules.map((schedule, idx) => (
              <div key={idx} className="schedule-progress-card">
                <div className="schedule-info">
                  <h4>Day {schedule.currentDay} of {schedule.totalDays}</h4>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${schedule.percentComplete}%` }}
                    />
                  </div>
                  <span className="progress-text">
                    {schedule.percentComplete}% Complete
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Time Chart */}
      {charts.studyTimeByDay && charts.studyTimeByDay.length > 0 && (
        <div className="section">
          <h3>📈 Study Time Trend</h3>
          <div className="chart-container">
            <div className="bar-chart">
              {charts.studyTimeByDay.map((day, idx) => {
                const maxHours = Math.max(...charts.studyTimeByDay.map(d => d.hours));
                const heightPercent = (day.hours / maxHours) * 100;
                
                return (
                  <div key={idx} className="bar-wrapper">
                    <div 
                      className="bar"
                      style={{ height: `${heightPercent}%` }}
                      title={`${day.hours}h on ${day.date}`}
                    >
                      <span className="bar-value">{day.hours}h</span>
                    </div>
                    <span className="bar-label">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Weak Topics */}
      {weakTopics && weakTopics.length > 0 && (
        <div className="section">
          <h3>🎯 Topics to Review</h3>
          <div className="weak-topics-list">
            {weakTopics.map((topic, idx) => (
              <div key={idx} className="topic-card">
                <div className="topic-header">
                  <span className="topic-name">{topic.topic}</span>
                  <span className={`topic-accuracy ${topic.accuracy < 50 ? 'low' : topic.accuracy < 75 ? 'medium' : 'high'}`}>
                    {topic.accuracy}%
                  </span>
                </div>
                <div className="topic-progress-bar">
                  <div 
                    className="topic-progress-fill"
                    style={{ 
                      width: `${topic.accuracy}%`,
                      backgroundColor: topic.accuracy < 50 ? '#f56565' : topic.accuracy < 75 ? '#ed8936' : '#48bb78'
                    }}
                  />
                </div>
                <span className="topic-questions">
                  {topic.questionsAsked} questions attempted
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz Scores Over Time */}
      {charts.quizScoresOverTime && charts.quizScoresOverTime.length > 0 && (
        <div className="section">
          <h3>📊 Quiz Performance</h3>
          <div className="chart-container">
            <div className="line-chart">
              {charts.quizScoresOverTime.map((quiz, idx) => {
                const x = (idx / (charts.quizScoresOverTime.length - 1)) * 100;
                const y = 100 - quiz.score;
                
                return (
                  <div
                    key={idx}
                    className="chart-point"
                    style={{
                      left: `${x}%`,
                      bottom: `${quiz.score}%`
                    }}
                    title={`${quiz.score}% - ${quiz.material}`}
                  >
                    <div className="point-dot" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity && (
        <div className="section">
          <h3>🕒 Recent Activity</h3>
          <div className="activity-list">
            {recentActivity.sessions.slice(0, 5).map((session, idx) => (
              <div key={idx} className="activity-item">
                <div className="activity-icon">
                  {session.sessionType === 'reading' && '📖'}
                  {session.sessionType === 'practice' && '✍️'}
                  {session.sessionType === 'quiz' && '🎯'}
                  {session.sessionType === 'review' && '🔄'}
                </div>
                <div className="activity-content">
                  <span className="activity-title">{session.materialTitle}</span>
                  <span className="activity-meta">
                    {session.sessionType} • {session.duration.actual || session.duration.planned} min
                  </span>
                </div>
                <span className="activity-time">
                  {new Date(session.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;