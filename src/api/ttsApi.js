
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const ttsApi = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const convertTextToSpeech = async (ttsData) => {
  try {
    const response = await ttsApi.post('/tts', ttsData);
    return response.data;
  } catch (error) {
    console.error('Error in TTS API:', error);
    throw error;
  }
};

export default ttsApi;
