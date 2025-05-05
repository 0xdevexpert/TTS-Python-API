
import axios from 'axios';

export const MAX_CHARACTERS = 14000; // Maximum characters for TTS request
const API_KEY = '234234230948029348lskdj'; // API key for authentication
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = 45000; // 45 seconds timeout

// Create an axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'api-key': API_KEY // Add API key to all requests
  },
  timeout: API_TIMEOUT // Set a timeout for all requests
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  config => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
apiClient.interceptors.response.use(
  response => {
    console.log(`API Response: ${response.status} ${response.statusText}`);
    return response;
  },
  error => {
    // Extract the detailed error message if available
    let errorDetail = error.response?.data?.detail || {};
    
    // Handle the case when detail is a string (old format) or an object (new format)
    const errorMessage = typeof errorDetail === 'object' 
      ? errorDetail.message || error.message 
      : errorDetail || error.message;

    // Log the full error information
    console.error('API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: errorMessage,
      detail: errorDetail,
      trace: typeof errorDetail === 'object' ? errorDetail.traceback : null
    });

    // Create an enhanced error object to propagate details
    const enhancedError = new Error(errorMessage);
    enhancedError.statusCode = error.response?.status;
    enhancedError.detail = errorDetail;
    enhancedError.isAxiosError = true;

    return Promise.reject(enhancedError);
  }
);

// Convert text to speech
export const convertTextToSpeech = async (data) => {
  try {
    console.log(`Sending TTS request with ${data.text.length} characters`);
    const response = await apiClient.post('/tts', data);
    return response.data;
  } catch (error) {
    console.error('TTS conversion error:', error);
    
    // Enrich the error message with more details if available
    let errorMessage = "TTS conversion failed";
    if (error.statusCode === 503) {
      errorMessage = "Server is at capacity. Please try again in a moment.";
    } else if (error.statusCode === 400) {
      errorMessage = "Invalid request: " + (error.message || "Please check your inputs");
    } else {
      errorMessage = error.message || "Connection issue with TTS service";
    }
    
    throw new Error(errorMessage);
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
    console.error('Audio fetch error:', error);
    
    // Provide user-friendly error messages based on status code
    if (error.statusCode === 404) {
      throw new Error(`Audio not found or still processing. Please try again in a moment.`);
    } else if (error.statusCode === 422) {
      throw new Error(`Audio file is incomplete. Please regenerate the audio.`);
    }
    
    throw new Error(`Failed to fetch audio: ${error.message}`);
  }
};

// Delete TTS audio for a job
export const deleteTtsAudio = async (jobId) => {
  try {
    const response = await apiClient.delete(`/tts/audio/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('Delete audio error:', error);
    throw new Error(`Failed to delete audio: ${error.message}`);
  }
};

// Fetch all TTS jobs
export const fetchTtsJobs = async () => {
  try {
    const response = await apiClient.get('/tts/jobs');
    console.log(`Fetched ${response.data.length} jobs`);
    return response.data;
  } catch (error) {
    console.error('Fetch jobs error:', error);
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }
};

// Add a new utility function to check API health
export const checkApiHealth = async () => {
  try {
    const response = await apiClient.get('/health', { timeout: 5000 }); // Short timeout for health check
    return response.data;
  } catch (error) {
    console.error('API health check failed:', error);
    throw new Error(`API health check failed: ${error.message}`);
  }
};
