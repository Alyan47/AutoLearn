import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const generateSummary = async (filePath) => {
  const response = await axios.post(`${API_BASE_URL}/summarize`, { filePath });
  return response.data;
};

export const generateQuiz = async (filePath, options = {}) => {
  const { numQuestions = 5, difficulty = 'medium' } = options;
  const response = await axios.post(`${API_BASE_URL}/quiz`, { filePath, numQuestions, difficulty });
  return response.data;
};

export const generateSchedule = async (filePath, options = {}) => {
  const { 
    availableHoursPerDay = 2,
    targetDate = null,
    difficulty = 'medium',
    learningStyle = 'balanced',
    userId
  } = options;

  const response = await axios.post(`${API_BASE_URL}/schedule`, {
    filePath,
    availableHoursPerDay,
    targetDate,
    difficulty,
    learningStyle,
    userId,
    materialId: 1,
    materialTitle: 'Material ' + Math.floor(Math.random() * 1000)
  });

  return response.data;
};

export const adjustSchedule = async (currentSchedule, adjustment) => {
  const response = await axios.post(`${API_BASE_URL}/schedule/adjust`, { currentSchedule, adjustment });
  return response.data;
};
