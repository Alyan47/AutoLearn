import React, { useState, useEffect } from 'react';
import './Schedule.css';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Schedule({ schedule, isLoading, onAdjust, userId, materialId, materialTitle, filePath }) {
  const [expandedDay, setExpandedDay] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  /**
   * Auto-save schedule to backend (match Mongoose schema)
   */
  const saveScheduleToDB = async (scheduleData) => {
    if (!scheduleData) return console.error('No schedule data to save');
    
    try {
      const payload = {
        userId: userId || '12345',
        materialId: materialId || '445',
        materialTitle: materialTitle || 'Random Material',
        filePath, 
        scheduleData: {               // ✅ nest under scheduleData
          totalEstimatedHours: scheduleData.totalEstimatedHours || 0,
          recommendedDaysNeeded: scheduleData.recommendedDaysNeeded || 0,
          schedule: scheduleData.schedule || [],
          studyTips: scheduleData.studyTips || [],
          milestones: scheduleData.milestones || []
        },
        settings: {                   // ✅ match settings object in schema
          availableHoursPerDay: 3,
          targetDate: scheduleData.targetDate || new Date(),
          difficulty: scheduleData.difficulty || 'medium',
          learningStyle: scheduleData.learningStyle || 'balanced'
        }
      };

      const response = await axios.post(`${API_BASE_URL}/schedule`, payload);
      console.log('Schedule saved successfully:', response.data);
    } catch (error) {
      console.error('Error saving schedule:', error.response?.data || error.message);
    }
  };

  useEffect(() => {
    if (schedule) saveScheduleToDB(schedule);
  }, [schedule]);

  if (isLoading) {
    return (
      <div className="schedule-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Creating your personalized study schedule...</p>
          <p className="loading-subtext">Analyzing content and optimizing learning path</p>
        </div>
      </div>
    );
  }

  if (!schedule) return null;

  const { schedule: days, studyTips, milestones, totalEstimatedHours } = schedule;

  const toggleDay = (dayNum) => setExpandedDay(expandedDay === dayNum ? null : dayNum);

  const getTypeIcon = (type) => {
    const icons = { reading: '📖', practice: '✍️', quiz: '🎯', review: '🔄' };
    return icons[type] || '📚';
  };

  const getPriorityColor = (priority) => {
    const colors = { high: '#f56565', medium: '#ed8936', low: '#48bb78' };
    return colors[priority] || '#718096';
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`;
  };

  const totalDays = days.length;
  const completionPercentage = 0;

  return (
    <div className="schedule-container">
      {/* Header Stats */}
      <div className="schedule-header">
        <div className="header-content">
          <h2>📅 Your Study Schedule</h2>
          <button className="settings-button" onClick={() => setShowSettings(!showSettings)}>⚙️ Adjust</button>
        </div>
        
        <div className="schedule-stats">
          <div className="stat-card"><span className="stat-label">Total Time</span><span className="stat-value">{totalEstimatedHours}h</span></div>
          <div className="stat-card"><span className="stat-label">Duration</span><span className="stat-value">{totalDays} days</span></div>
          <div className="stat-card"><span className="stat-label">Progress</span><span className="stat-value">{completionPercentage}%</span></div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <h3>Adjust Schedule</h3>
          <div className="settings-options">
            <button onClick={() => { onAdjust('more-time'); saveScheduleToDB(schedule); }}>Need More Time</button>
            <button onClick={() => { onAdjust('faster-pace'); saveScheduleToDB(schedule); }}>Faster Pace</button>
            <button onClick={() => { onAdjust('more-practice'); saveScheduleToDB(schedule); }}>More Practice Sessions</button>
          </div>
        </div>
      )}

      {/* Timeline View */}
      <div className="schedule-timeline">
        {days.map((day) => {
          const isExpanded = expandedDay === day.day;
          const milestone = milestones?.find(m => m.day === day.day);

          return (
            <div key={day.day} className={`day-card ${isExpanded ? 'expanded' : ''}`}>
              <div className="day-header" onClick={() => toggleDay(day.day)}>
                <div className="day-info">
                  <span className="day-number">Day {day.day}</span>
                  <span className="day-date">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="day-summary">
                  <span className="session-count">{day.sessions.length} sessions</span>
                  <span className="day-duration">{formatDuration(day.totalMinutes)}</span>
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {milestone && <div className="milestone-badge">🏆 Milestone: {milestone.milestone}</div>}
              <div className="day-goal"><strong>Goal:</strong> {day.dailyGoal}</div>

              {isExpanded && (
                <div className="day-sessions">
                  {day.sessions.map((session, idx) => (
                    <div key={idx} className="session-card">
                      <div className="session-header">
                        <span className="session-icon">{getTypeIcon(session.type)}</span>
                        <span className="session-title">{session.title}</span>
                        <span className="session-priority" style={{ backgroundColor: getPriorityColor(session.priority) }}>{session.priority}</span>
                      </div>

                      <div className="session-details">
                        <p className="session-description">{session.description}</p>
                        <div className="session-topics">
                          <strong>Topics:</strong>
                          <div className="topic-tags">{session.topics.map((topic, i) => <span key={i} className="topic-tag">{topic}</span>)}</div>
                        </div>
                        <div className="session-meta">
                          <span className="session-duration">⏱️ {formatDuration(session.duration)}</span>
                          <span className="session-type">{session.type}</span>
                        </div>
                      </div>

                      <div className="session-actions">
                        <button className="action-button start">Start Session</button>
                        <button className="action-button complete">Mark Complete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Study Tips */}
      {studyTips && studyTips.length > 0 && (
        <div className="study-tips">
          <h3>💡 Study Tips</h3>
          <ul>{studyTips.map((tip, index) => <li key={index}>{tip}</li>)}</ul>
        </div>
      )}

      {/* Milestones */}
      {milestones && milestones.length > 0 && (
        <div className="milestones-section">
          <h3>🎯 Learning Milestones</h3>
          <div className="milestones-grid">
            {milestones.map((m, i) => (
              <div key={i} className="milestone-card">
                <div className="milestone-day">Day {m.day}</div>
                <div className="milestone-title">{m.milestone}</div>
                <div className="milestone-assessment">{m.assessment}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;
