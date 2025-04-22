import React, { useState } from 'react';
import { convertTextToSpeech, fetchTtsAudio } from '../api/ttsApi';
import { Mic, SlidersVertical, Volume2 } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import VoiceSelector from './VoiceSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import TTSAudioPlayer from './TTSAudioPlayer';
import BackendStatusInfo from './BackendStatusInfo';
import TTSJobStatusAlert from './TTSJobStatusAlert';

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
      // Try to auto-fetch audio after a short delay (optional: backend-dependent)
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
          <div className="space-y-2">
            <Label htmlFor="text">Text to convert</Label>
            <Textarea
              id="text"
              name="text"
              value={formData.text}
              onChange={handleInputChange}
              placeholder="Type or paste your text here..."
              className="min-h-[120px]"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voice">Voice</Label>
            <Input
              id="voice"
              name="voice"
              value={formData.voice}
              onChange={handleInputChange}
              placeholder="e.g., en-US-AriaNeural"
            />
            <VoiceSelector 
              selectedVoice={formData.voice} 
              onVoiceSelect={(voice) => setFormData({ ...formData, voice })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pitch">Pitch</Label>
                <span className="text-sm text-muted-foreground">{formData.pitch}</span>
              </div>
              <div className="flex items-center gap-2">
                <SlidersVertical className="h-4 w-4" />
                <Slider
                  id="pitch"
                  name="pitch"
                  value={[parseFloat(formData.pitch)]}
                  min={-10}
                  max={10}
                  step={1}
                  onValueChange={(value) => handleSliderChange('pitch', value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="speed">Speed</Label>
                <span className="text-sm text-muted-foreground">{formData.speed}x</span>
              </div>
              <div className="flex items-center gap-2">
                <SlidersVertical className="h-4 w-4" />
                <Slider
                  id="speed"
                  name="speed"
                  value={[parseFloat(formData.speed)]}
                  min={0.5}
                  max={2}
                  step={0.1}
                  onValueChange={(value) => handleSliderChange('speed', value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="volume">Volume</Label>
                <span className="text-sm text-muted-foreground">{formData.volume}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <Slider
                  id="volume"
                  name="volume"
                  value={[parseInt(formData.volume)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => handleSliderChange('volume', value)}
                />
              </div>
            </div>
          </div>

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

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !formData.text.trim()}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="small" />
                <span className="ml-2">Processing...</span>
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Convert to Speech
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TTSForm;
