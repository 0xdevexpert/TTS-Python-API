import os
import datetime
from fastapi import APIRouter, HTTPException, Response, BackgroundTasks
from models import TTSRequestModel, TTSResponseModel, JobStatusResponse
from storage import load_jobs, save_jobs_async
from job_management import JobManager, JobStatus, TTSRequest
from job_management.tts_processor import AUDIO_DIR

router = APIRouter()
job_manager = None

def initialize_router(manager: JobManager):
    global job_manager
    job_manager = manager

@router.get("/tts/jobs")
async def get_all_jobs():
    """Get all jobs from storage with caching"""
    try:
        jobs = load_jobs()
        recent_jobs = [job for job in jobs if datetime.datetime.fromisoformat(job.get('created_at', '2000-01-01')).timestamp() > 
                      (datetime.datetime.now().timestamp() - 3600)]  # Last hour only
        
        for job in recent_jobs:
            status = job_manager.get_job_status(job['job_id'])
            if status:
                job['status'] = status.value
            audio_path = os.path.join(AUDIO_DIR, f"{job['job_id']}.mp3")
            job['audio_exists'] = os.path.exists(audio_path)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tts", response_model=TTSResponseModel)
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

@router.get("/tts/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Check the status of a TTS job"""
    status = job_manager.get_job_status(job_id)
    if status is None:
        audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
        if os.path.exists(audio_path):
            return JobStatusResponse(job_id=job_id, status="completed", message="Audio is ready")
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
    """Delete the generated audio file and remove from jobs list"""
    audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail=f"Audio for job {job_id} not found")
    
    try:
        os.remove(audio_path)
        
        jobs = load_jobs()
        jobs = [job for job in jobs if job['job_id'] != job_id]
        background_tasks.add_task(save_jobs_async, jobs)
        
        background_tasks.add_task(job_manager.cleanup_job, job_id)
        
        return {"message": f"Audio for job {job_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete audio: {str(e)}")

@router.get("/health")
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
