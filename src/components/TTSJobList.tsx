
import React, { useEffect, useState } from "react";
import TTSJobListItem from "./TTSJobListItem";
import TTSJobListHeader from "./TTSJobListHeader";
import TTSJobListEmpty from "./TTSJobListEmpty";
import { useWebSocket } from "../hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { Job } from "../types/job";

interface TTSJobListProps {
  jobs: Job[];
  onFetchAudio: (jobId: string) => void;
  onRemoveJob: (jobId: string) => void;
}

const TTSJobList: React.FC<TTSJobListProps> = ({ 
  jobs: initialJobs, 
  onFetchAudio, 
  onRemoveJob 
}) => {
  const [jobs, setJobs] = useState(initialJobs);
  const { toast } = useToast();

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useWebSocket((update) => {
    setJobs((currentJobs) =>
      currentJobs.map((job) =>
        job.jobId === update.job_id
          ? { ...job, status: update.status }
          : job
      )
    );

    if (update.status === 'completed') {
      toast({
        title: "Job Complete",
        description: `Audio for job ${update.job_id} is ready!`,
      });
    }
  });

  if (!jobs.length) return <TTSJobListEmpty />;

  return (
    <div className="mt-10">
      <TTSJobListHeader />
      <div className="space-y-4">
        {jobs.map(job => (
          <TTSJobListItem
            key={job.jobId}
            job={job}
            onFetchAudio={() => onFetchAudio(job.jobId)}
            onRemove={() => onRemoveJob(job.jobId)}
          />
        ))}
      </div>
    </div>
  );
};

export default TTSJobList;
