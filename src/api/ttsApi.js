import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const ttsApi = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const convertTextToSpeech = async (ttsData) => {
  try {
    const response = await ttsApi.post('/tts', ttsData);
    return response.data;
  } catch (error) {
    console.error('Error in TTS API:', error);
    let errorMessage = 'An error occurred while connecting to the TTS service';
    if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Cannot connect to the backend server. Please make sure the backend is running at ' + apiBaseUrl;
    } else if (error.response) {
      errorMessage = error.response.data?.detail || `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No response received from the server. Check if the backend is running.';
    }
    throw new Error(errorMessage);
  }
};

// Fetch audio for a given job ID (assumes FastAPI serves /tts/audio/{job_id})
export const fetchTtsAudio = async (jobId) => {
  try {
    // Get audio as blob (audio/mpeg or wav)
    const response = await ttsApi.get(`/tts/audio/${jobId}`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching TTS audio:', error);
    throw new Error('Could not fetch audio from the server');
  }
};

export const deleteTtsAudio = async (jobId) => {
  try {
    const response = await ttsApi.delete(`/tts/audio/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting TTS audio:', error);
    throw new Error('Could not delete audio from the server');
  }
};

export default ttsApi;
