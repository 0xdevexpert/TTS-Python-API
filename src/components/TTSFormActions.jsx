
import React from 'react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from './LoadingSpinner';
import { Mic } from 'lucide-react';

const TTSFormActions = ({
  isSubmitting,
  formData
}) => (
  <Button
    type="submit"
    className="w-full"
    disabled={isSubmitting || !formData.text.trim()}
  >
    {isSubmitting ? (
      <>
        <LoadingSpinner size="small" />
        <span className="ml-2">Processing...</span>
      </>
    ) : (
      <>
        <Mic className="mr-2 h-4 w-4" />
        Convert to Speech
      </>
    )}
  </Button>
);

export default TTSFormActions;
