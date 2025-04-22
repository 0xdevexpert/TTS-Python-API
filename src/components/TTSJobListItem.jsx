
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import TTSAudioPlayer from "./TTSAudioPlayer";
import LoadingSpinner from "./LoadingSpinner";

const TTSJobListItem = ({ job, onFetchAudio, onRemove }) => (
  <Alert className="relative bg-secondary text-secondary-foreground border-secondary">
    <AlertTitle>
      <span className="font-medium">Job ID:</span> {job.jobId}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-3 right-3"
        onClick={onRemove}
        title="Remove job"
      >
        {/* Trash icon, fallback X if Lucide not available */}
        <svg width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 6h18M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m3 0v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
        </svg>
      </Button>
    </AlertTitle>
    <AlertDescription>
      <div className="flex flex-col gap-2">
        <div className="text-xs">{job.status === "ready" ? "Audio ready to play." : "Job processing or audio not fetched yet."}</div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={job.fetchingAudio}
            onClick={onFetchAudio}
          >
            {job.fetchingAudio ? (
              <>
                <LoadingSpinner size="small" />
                <span className="ml-2">Fetching Audio...</span>
              </>
            ) : "Fetch & Play Audio"}
          </Button>
        </div>
        {job.error &&
          <div className="text-red-500 text-xs">{job.error}</div>
        }
        <div>
          <TTSAudioPlayer audioUrl={job.audioUrl} />
        </div>
      </div>
    </AlertDescription>
  </Alert>
);

export default TTSJobListItem;
