
import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoadingSpinner from './LoadingSpinner';
import TTSAudioPlayer from './TTSAudioPlayer';

/**
 * Shows job status, fetch + play controls, and the audio player for the TTS job.
 *
 * @param {Object} props
 * @param {string} props.jobId
 * @param {boolean} props.fetchingAudio
 * @param {string|null} props.audioUrl
 * @param {Function} props.onFetchAudio
 */
const TTSJobStatusAlert = ({ jobId, fetchingAudio, audioUrl, onFetchAudio }) => (
  <Alert className="bg-secondary text-secondary-foreground border-secondary">
    <AlertTitle>Success</AlertTitle>
    <AlertDescription>
      <span className="font-medium">Job ID:</span> {jobId}
      <p className="mt-1 text-xs">Your text-to-speech conversion is being processed.</p>
      <div className="mt-2">
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={fetchingAudio}
          onClick={() => onFetchAudio(jobId)}
        >
          {fetchingAudio ? (
            <>
              <LoadingSpinner size="small" />
              <span className="ml-2">Fetching Audio...</span>
            </>
          ) : "Fetch & Play Audio"}
        </Button>
      </div>
      <TTSAudioPlayer audioUrl={audioUrl} />
    </AlertDescription>
  </Alert>
);

export default TTSJobStatusAlert;
