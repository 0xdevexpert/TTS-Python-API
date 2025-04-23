
import os
import json
from fastapi import FastAPI, HTTPException, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv
import asyncio
import datetime
from queue_manager import JobManager, TTSRequest, AUDIO_DIR, JobStatus

load_dotenv()

# Configuration from environment variables
MAX_CONCURRENT_REQUESTS = int(os.getenv('MAX_CONCURRENT_REQUESTS', '50'))
WEBHOOK_URL = os.getenv('WEBHOOK_URL', '')
MAX_TEXT_LENGTH = int(os.getenv('MAX_TEXT_LENGTH', '14000'))

# Initialize FastAPI with connection pooling
app = FastAPI(title="TTS API", 
              description="High-performance Text-to-Speech API",
              version="1.0.0")

# Allow CORS from frontend with optimized settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

# Initialize job manager with concurrency control
job_manager = JobManager(max_concurrent=MAX_CONCURRENT_REQUESTS, webhook_url=WEBHOOK_URL)

# File to store jobs data with optimized file operations
JOBS_FILE = "jobs_data.json"
JOBS_CACHE = {}
JOBS_CACHE_LAST_WRITE = 0
JOBS_WRITE_INTERVAL = 10  # seconds between writes for batching

def load_jobs():
    global JOBS_CACHE, JOBS_CACHE_LAST_WRITE
    
    # Use cached data if available and recent
    if JOBS_CACHE and (datetime.datetime.now().timestamp() - JOBS_CACHE_LAST_WRITE) < 60:
        return JOBS_CACHE.copy()
        
    if os.path.exists(JOBS_FILE):
        try:
            with open(JOBS_FILE, 'r') as f:
                JOBS_CACHE = json.load(f)
                JOBS_CACHE_LAST_WRITE = datetime.datetime.now().timestamp()
                return JOBS_CACHE.copy()
        except json.JSONDecodeError:
            # Handle corrupted file
            JOBS_CACHE = []
            return []
    return []

async def save_jobs_async(jobs):
    global JOBS_CACHE, JOBS_CACHE_LAST_WRITE
    
    # Update cache immediately
    JOBS_CACHE = jobs.copy()
    
    # Only write to disk periodically to reduce I/O
    now = datetime.datetime.now().timestamp()
    if now - JOBS_CACHE_LAST_WRITE > JOBS_WRITE_INTERVAL:
        try:
            with open(JOBS_FILE, 'w') as f:
                json.dump(jobs, f)
            JOBS_CACHE_LAST_WRITE = now
        except Exception as e:
            print(f"Error saving jobs: {e}")

# Initialize jobs data
if not os.path.exists(JOBS_FILE):
    with open(JOBS_FILE, 'w') as f:
        json.dump([], f)

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

@app.get("/tts/jobs")
async def get_all_jobs():
    """Get all jobs from storage with caching"""
    try:
        jobs = load_jobs()
        # Only check status for recent jobs to reduce overhead
        recent_jobs = [job for job in jobs if datetime.datetime.fromisoformat(job.get('created_at', '2000-01-01')).timestamp() > 
                      (datetime.datetime.now().timestamp() - 3600)]  # Last hour only
        
        for job in recent_jobs:
            status = job_manager.get_job_status(job['job_id'])
            if status:
                job['status'] = status.value
            # Check if audio file exists
            audio_path = os.path.join(AUDIO_DIR, f"{job['job_id']}.mp3")
            job['audio_exists'] = os.path.exists(audio_path)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tts", response_model=TTSResponseModel)
async def tts_endpoint(request: TTSRequestModel, background_tasks: BackgroundTasks):
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
    
    # Add job to persistent storage asynchronously
    jobs = load_jobs()
    job_data = {
        "job_id": job_id,
        "text": request.text[:100] + "..." if len(request.text) > 100 else request.text,
        "created_at": datetime.datetime.now().isoformat(),
        "status": "processing"
    }
    jobs.append(job_data)
    background_tasks.add_task(save_jobs_async, jobs)
    
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
    """Serve the generated audio file with caching headers"""
    audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail=f"Audio for job {job_id} not found or not ready yet")
    
    try:
        with open(audio_path, "rb") as f:
            audio_data = f.read()
        
        # Verify we have a complete file
        if not audio_data or len(audio_data) < 100:  # Very basic check
            raise HTTPException(status_code=422, detail="Audio file appears to be incomplete")
            
        response = Response(content=audio_data, media_type="audio/mpeg")
        # Add caching headers for frequent requests
        response.headers["Cache-Control"] = "public, max-age=86400"  # Cache for 24h
        response.headers["ETag"] = f'"{hash(job_id)}"'
        return response
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error reading audio file: {str(e)}")

@app.delete("/tts/audio/{job_id}")
async def delete_audio(job_id: str, background_tasks: BackgroundTasks):
    """Delete the generated audio file and remove from jobs list"""
    audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail=f"Audio for job {job_id} not found")
    
    try:
        # Remove file
        os.remove(audio_path)
        
        # Remove from jobs list asynchronously
        jobs = load_jobs()
        jobs = [job for job in jobs if job['job_id'] != job_id]
        background_tasks.add_task(save_jobs_async, jobs)
        
        # Clean up job from manager
        background_tasks.add_task(job_manager.cleanup_job, job_id)
        
        return {"message": f"Audio for job {job_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete audio: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers with system statistics"""
    return {
        "status": "healthy", 
        "jobs_in_queue": job_manager.get_queue_size(),
        "server_time": datetime.datetime.now().isoformat(),
        "memory_usage": {
            "jobs_cache_size": len(JOBS_CACHE)
        }
    }
