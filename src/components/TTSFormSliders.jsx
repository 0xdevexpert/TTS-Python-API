
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { SlidersVertical, Volume2 } from 'lucide-react';

const TTSFormSliders = ({ formData, handleSliderChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="pitch">Pitch</Label>
        <span className="text-sm text-muted-foreground">{formData.pitch}</span>
      </div>
      <div className="flex items-center gap-2">
        <SlidersVertical className="h-4 w-4" />
        <Slider
          id="pitch"
          name="pitch"
          value={[parseFloat(formData.pitch)]}
          min={-10}
          max={10}
          step={1}
          onValueChange={(value) => handleSliderChange('pitch', value)}
        />
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="speed">Speed</Label>
        <span className="text-sm text-muted-foreground">{formData.speed}x</span>
      </div>
      <div className="flex items-center gap-2">
        <SlidersVertical className="h-4 w-4" />
        <Slider
          id="speed"
          name="speed"
          value={[parseFloat(formData.speed)]}
          min={0.5}
          max={2}
          step={0.1}
          onValueChange={(value) => handleSliderChange('speed', value)}
        />
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="volume">Volume</Label>
        <span className="text-sm text-muted-foreground">{formData.volume}%</span>
      </div>
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4" />
        <Slider
          id="volume"
          name="volume"
          value={[parseInt(formData.volume)]}
          min={0}
          max={100}
          step={1}
          onValueChange={(value) => handleSliderChange('volume', value)}
        />
      </div>
    </div>
  </div>
);

export default TTSFormSliders;
