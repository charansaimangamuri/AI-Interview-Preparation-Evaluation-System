import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const generateQuestion = async (data) => {
  const response = await api.post('/interview/generate-question', data);
  return response.data;
};

export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio_file', audioBlob, 'recording.webm');
  const response = await api.post('/interview/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const evaluateAnswer = async (data) => {
  const response = await api.post('/evaluation/evaluate', data);
  return response.data;
};

export const probeOrEvaluateAnswer = async (data) => {
  const response = await api.post('/evaluation/probe-evaluate', data);
  return response.data;
};

export const extractJobRequirements = async (data) => {
  const response = await api.post('/resume/extract-job-requirements', data);
  return response.data;
};

export const calculateMatch = async (data) => {
  const response = await api.post('/matching/calculate', data);
  return response.data;
};

export const predictPerformance = async (data) => {
  const response = await api.post('/evaluation/predict-performance', data);
  return response.data;
};

export const generateStudyPlan = async (data) => {
  const response = await api.post('/evaluation/study-plan', data);
  return response.data;
};