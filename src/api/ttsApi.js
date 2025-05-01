
import axios from 'axios';

export const MAX_CHARACTERS = 14000; // Maximum characters for TTS request
const API_KEY = '234234230948029348lskdj'; // API key for authentication
const API_BASE_URL = 'http://localhost:8000';

// Create an axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'api-key': API_KEY // Add API key to all requests
  }
});

// Convert text to speech
export const convertTextToSpeech = async (data) => {
  try {
    const response = await apiClient.post('/tts', data);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.message;
    throw new Error(`TTS conversion failed: ${message}`);
  }
};

// Fetch TTS audio for a job
export const fetchTtsAudio = async (jobId) => {
  try {
    const response = await apiClient.get(`/tts/audio/${jobId}`, {
      responseType: 'blob',
      headers: {
        'Accept': 'audio/mpeg',
        'api-key': API_KEY
      }
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.message;
    throw new Error(`Failed to fetch audio: ${message}`);
  }
};

// Delete TTS audio for a job
export const deleteTtsAudio = async (jobId) => {
  try {
    const response = await apiClient.delete(`/tts/audio/${jobId}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.message;
    throw new Error(`Failed to delete audio: ${message}`);
  }
};

// Fetch all TTS jobs
export const fetchTtsJobs = async () => {
  try {
    const response = await apiClient.get('/tts/jobs');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.message;
    throw new Error(`Failed to fetch jobs: ${message}`);
  }
};
