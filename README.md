
# Vocal Craft Orchestrator - Text-to-Speech Frontend

This is the frontend application for the Vocal Craft Orchestrator, a text-to-speech conversion system built with React.

## Features

- Clean, responsive UI for text-to-speech conversion
- Form with customizable voice settings:
  - Text input
  - Voice selection
  - Pitch adjustment
  - Speed control
  - Volume control
- Real-time job ID display after submission
- Loading states and error handling

## Getting Started

### Prerequisites

- Node.js and npm installed
- Backend API running (FastAPI server)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables:
   - Create or modify `.env` file with(or API URL)

4. Start the development server:
   ```
   npm run dev
   ```

## Usage

1. Enter the text you want to convert to speech
2. (Optional) Customize voice settings:
   - Select a voice (e.g., "en-US-AriaNeural")
   - Adjust pitch (-10 to 10)
   - Modify speed (0.5x to 2x)
   - Set volume (0% to 100%)
3. Click "Convert to Speech" button
4. The system will display a Job ID when the request is submitted
5. The backend will process the request and notify webhook when complete

## Connecting to Backend

This frontend expects a backend API with a `/tts` endpoint that accepts:

```json
{
  "text": "Text to convert",
  "voice": "en-US-AriaNeural",
  "pitch": "0",
  "speed": "1",
  "volume": "100"
}
```

And returns a job ID:

```json
{
  "job_id": "unique-id-here"
}
```

## Technologies Used

- React
- Axios for API requests
- ShadcnUI components
- Tailwind CSS for styling
- Lucide React for icons

## Next Steps

- Add job history/status tracking
- Implement audio playback when conversion is complete
- Add favorite voices/presets functionality
