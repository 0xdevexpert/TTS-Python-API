
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { convertTextToSpeech, MAX_CHARACTERS } from '../api/ttsApi';
import { useToast } from "@/hooks/use-toast";

export const useTTSForm = () => {
  const [formData, setFormData] = useState({
    text: '',
    voice: 'en-US-AriaNeural',
    pitch: '0',
    speed: '1',
    volume: '100',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [characterCount, setCharacterCount] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'text') {
      setCharacterCount(value.length);
      
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
      queryClient.invalidateQueries(['jobs']);
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

  return {
    formData,
    setFormData,
    isSubmitting,
    error,
    characterCount,
    handleInputChange,
    handleSliderChange,
    handleSubmit
  };
};
