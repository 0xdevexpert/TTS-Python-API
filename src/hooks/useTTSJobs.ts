
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTtsAudio, deleteTtsAudio } from '../api/ttsApi';
import { useToast } from "@/hooks/use-toast";

export const useTTSJobs = () => {
  const [jobs, setJobs] = useState([]);
  const { toast } = useToast();

  const { data: existingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tts/jobs`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
    refetchInterval: 1000,
  });

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

  const removeJob = async (jobId) => {
    try {
      await deleteTtsAudio(jobId);
      toast({ title: "Job Deleted", description: "Audio file and job removed successfully." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: err?.message || "Could not delete job audio.",
      });
    }
  };

  return {
    jobs,
    setJobs,
    fetchAudioForJob,
    removeJob
  };
};
