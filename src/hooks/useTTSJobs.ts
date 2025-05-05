
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTtsAudio, deleteTtsAudio, fetchTtsJobs, checkApiHealth } from '../api/ttsApi';
import { useToast } from "@/hooks/use-toast";
import { Job } from '../types/job';

export const useTTSJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const { toast } = useToast();
  const [lastError, setLastError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');

  // Check API health on component mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkApiHealth();
        setServerStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy');
        setIsOffline(false);
      } catch (error) {
        setServerStatus('unhealthy');
        setIsOffline(true);
        console.error('Health check failed:', error);
      }
    };
    
    checkHealth();
    const healthInterval = setInterval(checkHealth, 30000); // Check every 30 seconds
    
    return () => clearInterval(healthInterval);
  }, []);

  // Use more frequent polling since we removed WebSocket
  const { data: existingJobs, isError, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      try {
        const result = await fetchTtsJobs();
        setIsOffline(false);
        return result;
      } catch (error: any) {
        console.error('Failed to fetch jobs:', error);
        const errorMessage = error?.message || "Network error";
        setLastError(errorMessage);
        
        // Extract more details from the enhanced error
        const errorDetail = error?.detail ? 
          (typeof error.detail === 'object' ? JSON.stringify(error.detail) : error.detail) : 
          '';
        
        console.error('Fetch jobs error details:', {
          message: errorMessage,
          detail: errorDetail,
          statusCode: error?.statusCode
        });
        
        // Check if it's a network error and set offline status
        if (errorMessage.includes("Network Error") || error?.statusCode === undefined) {
          setIsOffline(true);
          setServerStatus('unhealthy');
        }
        
        throw error;
      }
    },
    staleTime: 1000, // Consider data fresh for 1 second
    refetchInterval: isOffline ? 5000 : 2000, // Poll more frequently when online
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Update jobs state when we get new data
  useEffect(() => {
    if (existingJobs && Array.isArray(existingJobs)) {
      const processedJobs = existingJobs.map((job: any) => ({
        jobId: job.job_id,
        status: job.status,
        text: job.text || "Text to speech job", // Fallback if text is not available
        fetchingAudio: false,
        audioUrl: null,
        error: null,
      }));
      setJobs(processedJobs);
    }
  }, [existingJobs]);

  // Show error toast if fetch fails, but only once per error message
  useEffect(() => {
    if (isError && error && !isOffline) {
      const errorMessage = (error as Error).message;
      if (errorMessage !== lastError) {
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: errorMessage || "Failed to load job data. Will retry automatically.",
        });
        setLastError(errorMessage);
      }
    }
  }, [isError, error, toast, lastError, isOffline]);

  // Show toast when connection is restored after being offline
  useEffect(() => {
    if (!isError && lastError && isOffline) {
      toast({
        title: "Connection Restored",
        description: "Successfully reconnected to the server.",
      });
      setLastError(null);
      setIsOffline(false);
    }
  }, [isError, isOffline, lastError, toast]);

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
      // Extract more detailed error information
      const errorMessage = err?.message || "Unknown error fetching audio";
      const errorDetail = err?.detail ? 
        (typeof err.detail === 'object' ? JSON.stringify(err.detail) : err.detail) : 
        '';
      
      console.error('Audio fetch error details:', {
        message: errorMessage,
        detail: errorDetail,
        statusCode: err?.statusCode
      });
      
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.jobId === jobId
            ? { ...job, audioUrl: null, fetchingAudio: false, error: errorMessage }
            : job
        )
      );
      toast({
        variant: "destructive",
        title: "Audio Not Ready",
        description: errorMessage || "The audio is not ready yet. Please try again in a moment.",
      });
    }
  }, [toast]);

  const removeJob = useCallback(async (jobId: string) => {
    try {
      await deleteTtsAudio(jobId);
      setJobs(prevJobs => prevJobs.filter(job => job.jobId !== jobId));
      toast({ title: "Job Deleted", description: "Audio file and job removed successfully." });
    } catch (err: any) {
      // Extract more detailed error information
      const errorMessage = err?.message || "Unknown error deleting job";
      const errorDetail = err?.detail ? 
        (typeof err.detail === 'object' ? JSON.stringify(err.detail) : err.detail) : 
        '';
      
      console.error('Job delete error details:', {
        message: errorMessage,
        detail: errorDetail,
        statusCode: err?.statusCode
      });
      
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: errorMessage || "Could not delete job audio.",
      });
    }
  }, [toast]);

  return {
    jobs,
    setJobs,
    fetchAudioForJob,
    removeJob,
    isOffline,
    serverStatus
  };
};
