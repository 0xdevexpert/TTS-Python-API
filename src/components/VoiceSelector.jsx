
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Common edge-tts voices
const commonVoices = [
  { id: 'en-US-AriaNeural', name: 'Aria (US Female)' },
  { id: 'en-US-GuyNeural', name: 'Guy (US Male)' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (British Female)' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha (Australian Female)' },
  { id: 'en-IN-NeerjaNeural', name: 'Neerja (Indian Female)' },
  { id: 'fr-FR-DeniseNeural', name: 'Denise (French Female)' },
  { id: 'de-DE-KatjaNeural', name: 'Katja (German Female)' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira (Spanish Female)' },
  { id: 'ja-JP-NanamiNeural', name: 'Nanami (Japanese Female)' },
  { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (Chinese Female)' },
];

const VoiceSelector = ({ selectedVoice, onVoiceSelect }) => {
  return (
    <div className="mt-2">
      <div className="text-sm font-medium mb-2">Common Voices</div>
      <ScrollArea className="h-[120px] rounded-md border p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {commonVoices.map((voice) => (
            <Button
              key={voice.id}
              variant={selectedVoice === voice.id ? "secondary" : "outline"}
              size="sm"
              className="justify-start text-sm h-auto py-1.5"
              onClick={() => onVoiceSelect(voice.id)}
            >
              {voice.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default VoiceSelector;
