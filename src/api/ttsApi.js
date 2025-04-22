
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const ttsApi = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add a timeout to prevent hanging requests
  timeout: 10000,
});

export const convertTextToSpeech = async (ttsData) => {
  try {
    const response = await ttsApi.post('/tts', ttsData);
    return response.data;
  } catch (error) {
    console.error('Error in TTS API:', error);
    
    // Create a more user-friendly error message
    let errorMessage = 'An error occurred while connecting to the TTS service';
    
    if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Cannot connect to the backend server. Please make sure the backend is running at ' + apiBaseUrl;
    } else if (error.response) {
      // Server responded with an error status
      errorMessage = error.response.data?.detail || `Server error: ${error.response.status}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'No response received from the server. Check if the backend is running.';
    }
    
    throw new Error(errorMessage);
  }
};

export default ttsApi;
