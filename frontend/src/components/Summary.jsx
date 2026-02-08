import React from 'react';
import './Summary.css';

function Summary({ summary, isLoading }) {
  if (isLoading) {
    return (
      <div className="summary-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Generating summary with AI...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // Split summary into sections for better formatting
  const formatSummary = (text) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Check if line is a header (starts with number followed by period or is in bold)
      if (line.match(/^\d+\.|^#{1,3}\s|^\*\*.*\*\*$/)) {
        return <h3 key={index} className="summary-heading">{line.replace(/[#*]/g, '')}</h3>;
      }
      // Check if line is a bullet point
      if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        return <li key={index} className="summary-bullet">{line.replace(/^[-•]\s*/, '')}</li>;
      }
      // Regular paragraph
      if (line.trim()) {
        return <p key={index} className="summary-text">{line}</p>;
      }
      return null;
    });
  };

  return (
    <div className="summary-container">
      <div className="summary-header">
        <h2>📝 Summary</h2>
        <button 
          className="copy-button"
          onClick={() => navigator.clipboard.writeText(summary)}
        >
          📋 Copy
        </button>
      </div>
      <div className="summary-content">
        {formatSummary(summary)}
      </div>
    </div>
  );
}

export default Summary;