
import os
from fastapi import FastAPI, HTTPException, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv
import asyncio
from queue_manager import JobManager, TTSRequest, AUDIO_DIR, JobStatus

load_dotenv()

MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "50"))
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")
MAX_TEXT_LENGTH = 14000  # Maximum character limit

app = FastAPI()

# Allow CORS from frontend (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

job_manager = JobManager(max_concurrent=MAX_CONCURRENT_REQUESTS, webhook_url=WEBHOOK_URL)

@app.on_event("startup")
async def startup_event():
    await job_manager.start()


class TTSRequestModel(BaseModel):
    text: str
    voice: str = "en-US-AriaNeural"
    pitch: str = "0"
    speed: str = "1"
    volume: str = "100"
    
    @validator('text')
    def validate_text_length(cls, v):
        if len(v) > MAX_TEXT_LENGTH:
            raise ValueError(f"Text exceeds maximum length of {MAX_TEXT_LENGTH} characters")
        if len(v.strip()) == 0:
            raise ValueError("Text cannot be empty")
        return v


class TTSResponseModel(BaseModel):
    job_id: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    message: str = ""


@app.post("/tts", response_model=TTSResponseModel)
async def tts_endpoint(request: TTSRequestModel):
    if not request.text or request.text.strip() == "":
        raise HTTPException(status_code=400, detail="Text is required")

    job_id = await job_manager.add_job(
        TTSRequest(
            text=request.text.strip(),
            voice=request.voice,
            pitch=request.pitch,
            speed=request.speed,
            volume=request.volume,
        )
    )
    return TTSResponseModel(job_id=job_id)


@app.get("/tts/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Check the status of a TTS job"""
    status = job_manager.get_job_status(job_id)
    if status is None:
        # Check if the audio file exists even if job is not in memory
        audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
        if os.path.exists(audio_path):
            return JobStatusResponse(job_id=job_id, status="completed", message="Audio is ready")
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
    return JobStatusResponse(
        job_id=job_id,
        status=status.value,
        message="Audio is being processed" if status == JobStatus.PROCESSING else "Audio is ready"
    )


@app.get("/tts/audio/{job_id}")
async def get_audio(job_id: str):
    """Serve the generated audio file"""
    audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail=f"Audio for job {job_id} not found or not ready yet")
    
    try:
        with open(audio_path, "rb") as f:
            audio_data = f.read()
        
        # Verify we have a complete file
        if not audio_data or len(audio_data) < 100:  # Very basic check
            raise HTTPException(status_code=422, detail="Audio file appears to be incomplete")
        
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error reading audio file: {str(e)}")


@app.delete("/tts/audio/{job_id}")
async def delete_audio(job_id: str, background_tasks: BackgroundTasks):
    """Delete the generated audio file"""
    audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail=f"Audio for job {job_id} not found")
    
    try:
        # Delete file immediately
        os.remove(audio_path)
        
        # Clean up job from manager in the background
        background_tasks.add_task(job_manager.cleanup_job, job_id)
        
        return {"message": f"Audio for job {job_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete audio: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers"""
    return {"status": "healthy", "jobs_in_queue": job_manager.get_queue_size()}
