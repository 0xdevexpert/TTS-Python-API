
import React from 'react';

/**
 * Shows backend connection status and FastAPI startup instructions.
 */
const BackendStatusInfo = () => (
  <div className="bg-muted p-4 rounded-md mt-4">
    <h4 className="font-medium mb-2">Connection Status</h4>
    <p className="text-sm">
      Backend URL: {import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      Make sure your FastAPI backend is running with: <code>uvicorn main:app --reload --host 0.0.0.0</code>
    </p>
  </div>
);

export default BackendStatusInfo;
