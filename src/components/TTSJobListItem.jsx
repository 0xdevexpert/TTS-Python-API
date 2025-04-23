
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import TTSAudioPlayer from "./TTSAudioPlayer";
import LoadingSpinner from "./LoadingSpinner";
import { Loader, CheckCircle } from "lucide-react";

const TTSJobListItem = ({ job, onFetchAudio, onRemove }) => {
  // Determine if the fetch button should be disabled
  const isButtonDisabled = job.fetchingAudio || job.status === 'processing' || job.status !== 'completed';

  return (
    <Alert className="relative bg-secondary text-secondary-foreground border-secondary">
      <AlertTitle className="flex items-center gap-2">
        <span className="font-medium">Job ID:</span> {job.jobId}
        {job.status === 'processing' && (
          <Loader className="h-4 w-4 animate-spin" />
        )}
        {job.status === 'completed' && !job.audioUrl && (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-3 right-3"
          onClick={onRemove}
          title="Remove job"
        >
          <svg width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 6h18M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m3 0v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
          </svg>
        </Button>
      </AlertTitle>
      <AlertDescription>
        <div className="flex flex-col gap-2">
          <div className="text-xs">
            {job.status === "processing" 
              ? "Processing audio..." 
              : job.status === "completed" 
                ? "Audio ready to fetch."
                : job.status === "ready"
                  ? "Audio ready to play."
                  : "Job processing or audio not fetched yet."}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isButtonDisabled}
              onClick={onFetchAudio}
            >
              {job.fetchingAudio ? (
                <>
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Fetching Audio...</span>
                </>
              ) : job.audioUrl ? "Play Audio" : "Fetch & Play Audio"}
            </Button>
          </div>
          {job.error && (
            <div className="text-red-500 text-xs mt-1">{job.error}</div>
          )}
          <div>
            {job.audioUrl && <TTSAudioPlayer audioUrl={job.audioUrl} />}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default TTSJobListItem;
