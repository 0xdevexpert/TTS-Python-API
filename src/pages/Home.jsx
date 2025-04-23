
import React from 'react';
import TTSForm from '../components/TTSForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink } from 'lucide-react';
import { MAX_CHARACTERS } from '../api/ttsApi';

const Home = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Vocal Craft Orchestrator</h1>
        <p className="text-muted-foreground mt-2">
          Convert your text to natural-sounding speech with customizable voice settings
        </p>
      </div>
      
      <Alert className="mb-6 bg-secondary/30">
        <AlertTitle className="flex items-center">
          <ExternalLink className="h-4 w-4 mr-2" />
          System Capabilities
        </AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside text-sm space-y-1 mt-1">
            <li>Maximum {MAX_CHARACTERS} characters per conversion</li>
            <li>High-quality neural voice synthesis</li>
            <li>Adjustable pitch, speed, and volume</li>
            <li>Optimized for high traffic - handles up to 1000 users/hour</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      <TTSForm />
    </div>
  );
};

export default Home;
