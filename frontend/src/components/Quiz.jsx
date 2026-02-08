import React, { useState, useEffect } from 'react';
import './Quiz.css';

function Quiz({ quiz, isLoading, userId, materialId, materialTitle }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    setStartTime(Date.now()); // Reset start time when quiz changes
  }, [quiz]);

  if (isLoading) {
    return (
      <div className="quiz-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Generating quiz questions with AI...</p>
        </div>
      </div>
    );
  }

  if (!quiz || quiz.length === 0) return null;

  const handleAnswerSelect = (answer) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: answer
    });
  };

  const handleNext = () => {
    if (currentQuestion < quiz.length - 1) setCurrentQuestion(currentQuestion + 1);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) correct++;
    });
    return correct;
  };

  // Save results with random fallback for missing fields
  const saveResultsToDB = async (answersArray, totalTime) => {
    // Fill random values if missing
    const finalUserId = 1234;
    const finalMaterialId = materialId || Math.floor(Math.random() * 1000);
    const finalMaterialTitle = materialTitle || `Material-${Math.floor(Math.random() * 1000)}`;

    const fieldsToCheck = {
      userId: finalUserId,
      materialId: finalMaterialId,
      materialTitle: finalMaterialTitle,
      answersArray
    };

    const missingFields = Object.entries(fieldsToCheck)
      .filter(([key, value]) => value === undefined || value === null || (Array.isArray(value) && value.length === 0))
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.error('Cannot save quiz result. Missing required fields:', missingFields.join(', '));
      alert(`Cannot save quiz result. Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    const correctCount = answersArray.filter(a => a.isCorrect).length;

    const payload = {
      userId: finalUserId,
      materialId: finalMaterialId,
      materialTitle: finalMaterialTitle,
      quizData: {
        totalQuestions: quiz.length,
        correctAnswers: correctCount,
        score: Math.round((correctCount / quiz.length) * 100),
        difficulty: "medium"
      },
      answers: answersArray,
      timeSpent: totalTime
    };

    console.log('Sending payload to backend:', payload);

    try {
      const response = await fetch('http://localhost:5000/api/quiz-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to save quiz result:', data);
      } else {
        console.log('Quiz result saved successfully!', data);
      }
    } catch (err) {
      console.error('Error sending quiz result:', err);
    }
  };

  const handleSubmit = async () => {
    setShowResults(true);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    // Build answers array safely
    const answersArray = quiz.map((q, index) => {
      const userAnswer = selectedAnswers[index] || null;
      return {
        questionNumber: index + 1,
        question: q.question,
        selectedAnswer: userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: userAnswer === q.correctAnswer,
        topic: q.topic || 'General',
        timeTaken: 0 // can add per-question timing later
      };
    });

    await saveResultsToDB(answersArray, timeSpent);
  };

  const currentQ = quiz[currentQuestion];
  const isAnswered = selectedAnswers.hasOwnProperty(currentQuestion);
  const isLastQuestion = currentQuestion === quiz.length - 1;

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / quiz.length) * 100);

    return (
      <div className="quiz-container">
        <div className="quiz-results">
          <h2>🎉 Quiz Complete!</h2>
          <div className="score-display">
            <div className="score-circle">
              <span className="score-number">{percentage}%</span>
            </div>
            <p className="score-text">
              You got {score} out of {quiz.length} questions correct
            </p>
          </div>

          <div className="results-breakdown">
            <h3>Review Your Answers</h3>
            {quiz.map((q, index) => {
              const userAnswer = selectedAnswers[index] || 'No Answer';
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div key={index} className={`result-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="result-header">
                    <span className="result-icon">{isCorrect ? '✓' : '✗'}</span>
                    <span className="result-number">Question {index + 1}</span>
                  </div>
                  <p className="result-question">{q.question}</p>
                  <p className="result-answer">
                    Your answer: <strong>{userAnswer}</strong> {q.options[userAnswer] ? `- ${q.options[userAnswer]}` : ''}
                  </p>
                  {!isCorrect && (
                    <p className="result-correct">
                      Correct answer: <strong>{q.correctAnswer}</strong> - {q.options[q.correctAnswer]}
                    </p>
                  )}
                  <p className="result-explanation">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          <button
            className="retry-button"
            onClick={() => {
              setCurrentQuestion(0);
              setSelectedAnswers({});
              setShowResults(false);
              setStartTime(Date.now());
            }}
          >
            🔄 Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>🎯 Quiz Time!</h2>
        <div className="quiz-progress">
          Question {currentQuestion + 1} of {quiz.length}
        </div>
      </div>

      <div className="quiz-content">
        <div className="question-text">{currentQ.question}</div>

        <div className="options-container">
          {Object.entries(currentQ.options).map(([key, value]) => (
            <button
              key={key}
              className={`option-button ${selectedAnswers[currentQuestion] === key ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(key)}
            >
              <span className="option-letter">{key}</span>
              <span className="option-text">{value}</span>
            </button>
          ))}
        </div>

        <div className="quiz-navigation">
          <button
            className="nav-button"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            ← Previous
          </button>

          {isLastQuestion ? (
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length !== quiz.length}
            >
              Submit Quiz
            </button>
          ) : (
            <button
              className="nav-button next"
              onClick={handleNext}
              disabled={!isAnswered}
            >
              Next →
            </button>
          )}
        </div>

        <div className="answer-tracker">
          {quiz.map((_, index) => (
            <div
              key={index}
              className={`tracker-dot ${selectedAnswers.hasOwnProperty(index) ? 'answered' : ''} ${index === currentQuestion ? 'current' : ''}`}
              onClick={() => setCurrentQuestion(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Quiz;
