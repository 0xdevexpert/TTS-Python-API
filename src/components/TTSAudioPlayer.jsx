
import React from 'react';

/**
 * Audio player for TTS (Text-to-Speech) synthesized audio.
 *
 * @param {Object} props 
 * @param {string|null} props.audioUrl - The URL of the audio file to play.
 */
const TTSAudioPlayer = ({ audioUrl }) => {
  if (!audioUrl) return null;
  return (
    <div className="mt-4">
      <audio controls src={audioUrl} className="w-full">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

export default TTSAudioPlayer;
