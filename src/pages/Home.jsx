
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
