
import os
import datetime
from fastapi import APIRouter, HTTPException, Response, BackgroundTasks
from models import TTSRequestModel, TTSResponseModel, JobStatusResponse
from storage import load_jobs
from job_management import JobManager, JobStatus, TTSRequest
from job_management.tts_processor import AUDIO_DIR

router = APIRouter()
job_manager = None

def initialize_router(manager: JobManager):
    global job_manager
    job_manager = manager

@router.get("/tts/jobs")
async def get_all_jobs():
    """Get all jobs by scanning the audio directory"""
    try:
        # Get completed jobs from audio files
        completed_jobs = load_jobs()
        
        # Get active jobs from job manager
        active_jobs = []
        if job_manager:
            for job_id, job_info in job_manager.jobs.items():
                # Skip if this job already has an audio file (would be in completed_jobs)
                audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
                if os.path.exists(audio_path):
                    continue
                    
                active_job = {
                    "job_id": job_id,
                    "status": job_info.status.value,
                    "created_at": datetime.datetime.fromtimestamp(job_info.created_at).isoformat(),
                    "audio_exists": False,
                    "text": job_info.request.text[:100] + "..." if len(job_info.request.text) > 100 else job_info.request.text
                }
                active_jobs.append(active_job)
        
        # Combine and sort all jobs by creation time (newest first)
        all_jobs = completed_jobs + active_jobs
        all_jobs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Limit to most recent jobs
        return all_jobs[:50]  # Return only the 50 most recent jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting jobs: {str(e)}")

@router.post("/tts", response_model=TTSResponseModel)
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

@router.get("/tts/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Check the status of a TTS job"""
    # First check if the audio file already exists
    audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
    if os.path.exists(audio_path):
        return JobStatusResponse(job_id=job_id, status="completed", message="Audio is ready")
    
    # If not, check the job in memory
    status = job_manager.get_job_status(job_id)
    if status is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
    return JobStatusResponse(
        job_id=job_id,
        status=status.value,
        message="Audio is being processed" if status == JobStatus.PROCESSING else "Audio is ready"
    )

@router.get("/tts/audio/{job_id}")
async def get_audio(job_id: str):
    """Serve the generated audio file with caching headers"""
    audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail=f"Audio for job {job_id} not found or not ready yet")
    
    try:
        with open(audio_path, "rb") as f:
            audio_data = f.read()
        
        if not audio_data or len(audio_data) < 100:
            raise HTTPException(status_code=422, detail="Audio file appears to be incomplete")
            
        response = Response(content=audio_data, media_type="audio/mpeg")
        response.headers["Cache-Control"] = "public, max-age=86400"
        response.headers["ETag"] = f'"{hash(job_id)}"'
        return response
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error reading audio file: {str(e)}")

@router.delete("/tts/audio/{job_id}")
async def delete_audio(job_id: str, background_tasks: BackgroundTasks):
    """Delete the generated audio file"""
    audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail=f"Audio for job {job_id} not found")
    
    try:
        os.remove(audio_path)
        
        # Also clean up from job manager if it exists there
        if job_id in job_manager.jobs:
            background_tasks.add_task(job_manager.cleanup_job, job_id)
        
        return {"message": f"Audio for job {job_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete audio: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint for load balancers with system statistics"""
    try:
        # Scan audio directory
        audio_files_count = 0
        if os.path.exists(AUDIO_DIR):
            audio_files = [f for f in os.listdir(AUDIO_DIR) if f.endswith('.mp3')]
            audio_files_count = len(audio_files)

        # Get active jobs in the queue
        active_jobs_size = job_manager.get_queue_size() if job_manager else 0

        return {
            "status": "healthy",
            "audio_files_count": audio_files_count,
            "active_jobs_size": active_jobs_size,
            "message": "System is operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "audio_files_count": 0,
            "active_jobs_size": 0,
            "message": f"Error: {str(e)}"
        }
