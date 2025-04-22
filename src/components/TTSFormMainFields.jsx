
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import VoiceSelector from './VoiceSelector';

const TTSFormMainFields = ({
  formData,
  handleInputChange,
  setFormData
}) => (
  <>
    <div className="space-y-2">
      <Label htmlFor="text">Text to convert</Label>
      <Textarea
        id="text"
        name="text"
        value={formData.text}
        onChange={handleInputChange}
        placeholder="Type or paste your text here..."
        className="min-h-[120px]"
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="voice">Voice</Label>
      <Input
        id="voice"
        name="voice"
        value={formData.voice}
        onChange={handleInputChange}
        placeholder="e.g., en-US-AriaNeural"
      />
      <VoiceSelector
        selectedVoice={formData.voice}
        onVoiceSelect={(voice) => setFormData((prev) => ({ ...prev, voice }))}
      />
    </div>
  </>
);

export default TTSFormMainFields;
