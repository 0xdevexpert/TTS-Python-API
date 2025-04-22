
import React from "react";
import TTSJobListItem from "./TTSJobListItem";

const TTSJobList = ({ jobs, onFetchAudio, onRemoveJob }) => {
  if (!jobs.length) return null;
  return (
    <div className="mt-10">
      <h2 className="font-semibold text-lg mb-3">Your Jobs</h2>
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
