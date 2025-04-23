
import React from 'react';
import { Mic } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TTSJobList from './TTSJobList';
import TTSFormMainFields from './TTSFormMainFields';
import TTSFormSliders from './TTSFormSliders';
import TTSFormActions from './TTSFormActions';
import { useTTSForm } from '../hooks/useTTSForm';
import { useTTSJobs } from '../hooks/useTTSJobs';
import { MAX_CHARACTERS } from '../api/ttsApi';

const TTSForm = () => {
  const {
    formData,
    setFormData,
    isSubmitting,
    error,
    characterCount,
    handleInputChange,
    handleSliderChange,
    handleSubmit
  } = useTTSForm();

  const {
    jobs,
    fetchAudioForJob,
    removeJob
  } = useTTSJobs();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mic className="h-6 w-6 text-primary" />
          <CardTitle>Text to Speech Converter</CardTitle>
        </div>
        <CardDescription>
          Enter your text and customize voice settings
          {characterCount > 0 && (
            <span className={`ml-1 ${characterCount > MAX_CHARACTERS ? 'text-destructive font-bold' : ''}`}>
              ({characterCount}/{MAX_CHARACTERS} characters)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <TTSFormMainFields
            formData={formData}
            handleInputChange={handleInputChange}
            setFormData={setFormData}
            maxChars={MAX_CHARACTERS}
          />
          <TTSFormSliders
            formData={formData}
            handleSliderChange={handleSliderChange}
          />

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TTSFormActions
            isSubmitting={isSubmitting}
            formData={formData}
            maxChars={MAX_CHARACTERS}
          />
        </form>
        <TTSJobList
          jobs={jobs}
          onFetchAudio={fetchAudioForJob}
          onRemoveJob={removeJob}
        />
      </CardContent>
    </Card>
  );
};

export default TTSForm;
