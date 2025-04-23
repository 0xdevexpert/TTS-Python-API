
import React from "react";
import TTSJobListItem from "./TTSJobListItem";
import TTSJobListHeader from "./TTSJobListHeader";
import TTSJobListEmpty from "./TTSJobListEmpty";
import { useToast } from "@/hooks/use-toast";
import { Job } from "../types/job";

interface TTSJobListProps {
  jobs: Job[];
  onFetchAudio: (jobId: string) => void;
  onRemoveJob: (jobId: string) => void;
}

const TTSJobList: React.FC<TTSJobListProps> = ({ 
  jobs, 
  onFetchAudio, 
  onRemoveJob 
}) => {
  const { toast } = useToast();

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
