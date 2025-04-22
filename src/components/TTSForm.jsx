
import React, { useState } from 'react';
import { convertTextToSpeech, fetchTtsAudio } from '../api/ttsApi';
import { Mic } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import TTSAudioPlayer from './TTSAudioPlayer';
import BackendStatusInfo from './BackendStatusInfo';
import TTSJobStatusAlert from './TTSJobStatusAlert';

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
  const [jobId, setJobId] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [fetchingAudio, setFetchingAudio] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSliderChange = (name, value) => {
    setFormData({ ...formData, [name]: value[0].toString() });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setJobId(null);
    setAudioUrl(null);

    try {
      const response = await convertTextToSpeech(formData);
      setJobId(response.job_id);
      toast({
        title: "Success!",
        description: `Job submitted successfully. Job ID: ${response.job_id}`,
      });
      setTimeout(() => fetchAudio(response.job_id), 2500);
    } catch (err) {
      console.error("TTS Request failed:", err);
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

  const fetchAudio = async (jid = jobId) => {
    if (!jid) return;
    setFetchingAudio(true);
    setError(null);
    setAudioUrl(null);
    try {
      const audioBlob = await fetchTtsAudio(jid);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      toast({
        title: "Audio Ready!",
        description: "You can now listen to your synthesized speech.",
      });
    } catch (err) {
      setError("The audio is not ready yet. Please try again in a moment.");
    } finally {
      setFetchingAudio(false);
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
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <TTSFormMainFields
            formData={formData}
            handleInputChange={handleInputChange}
            setFormData={setFormData}
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

          {jobId && (
            <TTSJobStatusAlert 
              jobId={jobId}
              fetchingAudio={fetchingAudio}
              audioUrl={audioUrl}
              onFetchAudio={fetchAudio}
            />
          )}

          <BackendStatusInfo />

          <TTSFormActions
            isSubmitting={isSubmitting}
            formData={formData}
          />
        </form>
      </CardContent>
    </Card>
  );
};

export default TTSForm;
