
import React, { useState } from 'react';
import { convertTextToSpeech, fetchTtsAudio, deleteTtsAudio, MAX_CHARACTERS } from '../api/ttsApi';
import { Mic } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import TTSJobList from './TTSJobList';

import TTSFormMainFields from './TTSFormMainFields';
import TTSFormSliders from './TTSFormSliders';
import TTSFormActions from './TTSFormActions';

const TTSForm = () => {
  const [formData, setFormData] = useState({
    text: '',
    voice: 'en-US-AriaNeural',
    pitch: '0',
    speed: '1',
    volume: '100',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const [characterCount, setCharacterCount] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Update character count for text field
    if (name === 'text') {
      setCharacterCount(value.length);
      
      // Show warning toast when approaching limit
      if (value.length > MAX_CHARACTERS * 0.9 && value.length <= MAX_CHARACTERS) {
        toast({
          title: "Warning",
          description: `Approaching character limit (${value.length}/${MAX_CHARACTERS})`,
          variant: "warning",
        });
      }
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleSliderChange = (name, value) => {
    setFormData({ ...formData, [name]: value[0].toString() });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Check character limit
    if (formData.text.length > MAX_CHARACTERS) {
      setError(`Text exceeds maximum limit of ${MAX_CHARACTERS} characters`);
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Character Limit Exceeded",
        description: `Please reduce your text to ${MAX_CHARACTERS} characters or less.`,
      });
      return;
    }

    try {
      const response = await convertTextToSpeech(formData);
      const newJob = {
        jobId: response.job_id,
        status: 'pending',
        fetchingAudio: false,
        audioUrl: null,
        error: null,
        text: formData.text.substring(0, 50) + (formData.text.length > 50 ? '...' : ''), // Store a preview of the text
      };
      setJobs(prevJobs => [newJob, ...prevJobs]);
      toast({
        title: "Success!",
        description: `Job submitted successfully. Job ID: ${response.job_id}`,
      });
    } catch (err) {
      setError(err.message || 'An error occurred while processing your request');
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: err.message || "Failed to connect to the TTS service",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Called by TTSJobListItem
  const fetchAudioForJob = async (jobId) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.jobId === jobId
          ? { ...job, fetchingAudio: true, error: null }
          : job
      )
    );

    try {
      const audioBlob = await fetchTtsAudio(jobId);
      const url = URL.createObjectURL(audioBlob);

      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.jobId === jobId
            ? { ...job, audioUrl: url, status: 'ready', fetchingAudio: false, error: null }
            : job
        )
      );
      toast({
        title: "Audio Ready!",
        description: "You can now listen to your synthesized speech.",
      });
    } catch (err) {
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.jobId === jobId
            ? { ...job, audioUrl: null, fetchingAudio: false, error: err.message || "The audio is not ready yet. Please try again in a moment." }
            : job
        )
      );
      toast({
        variant: "destructive",
        title: "Audio Not Ready",
        description: err.message || "The audio is not ready yet. Please try again in a moment.",
      });
    }
  };

  // Remove job from state + attempt backend delete
  const removeJob = async (jobId) => {
    try {
      await deleteTtsAudio(jobId);
      setJobs(prevJobs => prevJobs.filter(job => job.jobId !== jobId));
      toast({ title: "Job Deleted", description: "Audio file and job removed successfully." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: err?.message || "Could not delete job audio.",
      });
    }
  };

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
