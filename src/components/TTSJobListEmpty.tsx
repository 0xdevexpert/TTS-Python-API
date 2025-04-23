
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';

const TTSJobListEmpty = () => {
  return (
    <Alert className="bg-secondary/30 border-secondary/50">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        <AlertDescription className="text-sm text-center">
          No jobs yet. Your TTS conversions will appear here once submitted.
        </AlertDescription>
      </div>
    </Alert>
  );
};

export default TTSJobListEmpty;
