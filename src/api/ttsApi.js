
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://tts.catacomb.fyi';
const MAX_TEXT_LENGTH = 14000; // Maximum character limit

const ttsApi = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Increased timeout for high traffic scenarios
});

export const convertTextToSpeech = async (ttsData) => {
  // Validate text length
  if (ttsData.text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds maximum limit of ${MAX_TEXT_LENGTH} characters`);
  }
  
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

// Improved fetch audio function with complete audio verification
export const fetchTtsAudio = async (jobId) => {
  try {
    // First check if the audio is ready
    const statusCheck = await ttsApi.get(`/tts/status/${jobId}`);
    if (statusCheck.data.status !== 'completed') {
      throw new Error('Audio processing is not complete yet');
    }
    
    // Get audio as blob (audio/mpeg or wav)
    const response = await ttsApi.get(`/tts/audio/${jobId}`, {
      responseType: 'blob',
    });
    
    // Verify we have a complete audio file
    if (!response.data || response.data.size === 0) {
      throw new Error('Received incomplete audio file');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching TTS audio:', error);
    if (error.response?.status === 404) {
      throw new Error('Audio file not found. The job may still be processing.');
    }
    throw new Error(error.message || 'Could not fetch audio from the server');
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

export const MAX_CHARACTERS = MAX_TEXT_LENGTH;

export default ttsApi;
