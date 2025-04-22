
import React from 'react';
import TTSForm from '../components/TTSForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink } from 'lucide-react';

const Home = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Vocal Craft Orchestrator</h1>
        <p className="text-muted-foreground mt-2">
          Convert your text to natural-sounding speech with customizable voice settings
        </p>
      </div>
      
      <Alert className="mb-6 bg-secondary border-secondary">
        <AlertTitle className="flex items-center gap-2">
          Backend Setup Required
          <ExternalLink className="h-4 w-4" />
        </AlertTitle>
        <AlertDescription>
          <p>
            To use this application, you need to have the FastAPI backend running on{' '}
            <span className="font-medium">{import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}</span>
          </p>
          
          <div className="mt-2">
            <p className="font-semibold">Start the backend server:</p>
            <pre className="bg-black text-white p-2 rounded mt-1 overflow-x-auto">
              cd backend<br />
              uvicorn main:app --reload
            </pre>
          </div>
          
          <p className="mt-2 text-sm">
            The backend processes text-to-speech requests with edge-tts and sends notifications to your webhook URL.
          </p>
        </AlertDescription>
      </Alert>
      
      <TTSForm />
      
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          This system uses edge-tts to convert text to speech with natural-sounding voices.
          <br />
          For best results, try different voices and settings.
        </p>
      </div>
    </div>
  );
};

export default Home;
