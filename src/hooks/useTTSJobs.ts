
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTtsAudio, deleteTtsAudio } from '../api/ttsApi';
import { useToast } from "@/hooks/use-toast";
import { Job } from '../types/job';

export const useTTSJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const { toast } = useToast();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // Use more frequent polling since we removed WebSocket
  const { data: existingJobs, isError } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/tts/jobs`, {
        // Add mode: 'cors' to explicitly request CORS
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
    staleTime: 1000, // Consider data fresh for 1 second
    refetchInterval: 2000, // Poll every 2 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Update jobs state when we get new data
  useEffect(() => {
    if (existingJobs) {
      const processedJobs = existingJobs.map(job => ({
        jobId: job.job_id,
        status: job.status,
        text: job.text,
        fetchingAudio: false,
        audioUrl: null,
        error: null,
      }));
      setJobs(processedJobs);
    }
  }, [existingJobs]);

  // Show error toast if fetch fails
  useEffect(() => {
    if (isError) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to load job data. Will retry automatically.",
      });
    }
  }, [isError, toast]);

  const fetchAudioForJob = useCallback(async (jobId: string) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.jobId === jobId
          ? { ...job, fetchingAudio: true, error: null }
          : job
      )
    );

    try {
      // Add a delay to ensure backend has time to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
    } catch (err: any) {
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.jobId === jobId
            ? { ...job, audioUrl: null, fetchingAudio: false, error: err.message }
            : job
        )
      );
      toast({
        variant: "destructive",
        title: "Audio Not Ready",
        description: err.message || "The audio is not ready yet. Please try again in a moment.",
      });
    }
  }, [toast]);

  const removeJob = useCallback(async (jobId: string) => {
    try {
      await deleteTtsAudio(jobId);
      setJobs(prevJobs => prevJobs.filter(job => job.jobId !== jobId));
      toast({ title: "Job Deleted", description: "Audio file and job removed successfully." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: err?.message || "Could not delete job audio.",
      });
    }
  }, [toast]);

  return {
    jobs,
    setJobs,
    fetchAudioForJob,
    removeJob
  };
};
