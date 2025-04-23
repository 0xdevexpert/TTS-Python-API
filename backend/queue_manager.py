
import asyncio
import uuid
import logging
import os
import enum
import time
from typing import Optional, Dict, Any, List
import aiohttp
import edge_tts
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Create a directory for storing audio files
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio_files")
os.makedirs(AUDIO_DIR, exist_ok=True)

class JobStatus(enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-AriaNeural"
    pitch: Optional[str] = "0"
    speed: Optional[str] = "1"
    volume: Optional[str] = "100"


class JobResult(BaseModel):
    job_id: str
    status: str  # "success" or "failure"
    message: Optional[str] = None
    processing_time: Optional[float] = None


class JobInfo:
    def __init__(self, job_id: str, request: TTSRequest):
        self.job_id = job_id
        self.request = request
        self.status = JobStatus.QUEUED
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.error_message: Optional[str] = None

    @property
    def processing_time(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None


class JobManager:
    def __init__(self, max_concurrent: int, webhook_url: str):
        self.max_concurrent = max_concurrent
        self.webhook_url = webhook_url
        self.queue = asyncio.Queue()
        self.semaphore = asyncio.Semaphore(self.max_concurrent)
        self.running = False
        self.jobs: Dict[str, JobInfo] = {}
        self.cleanup_interval = 3600  # 1 hour cleanup interval for completed jobs

    async def start(self):
        if not self.running:
            self.running = True
            asyncio.create_task(self._worker())
            asyncio.create_task(self._cleanup_old_jobs())

    async def add_job(self, tts_request: TTSRequest) -> str:
        job_id = str(uuid.uuid4())
        job_info = JobInfo(job_id=job_id, request=tts_request)
        self.jobs[job_id] = job_info
        await self.queue.put(job_info)
        return job_id

    def get_job_status(self, job_id: str) -> Optional[JobStatus]:
        job = self.jobs.get(job_id)
        return job.status if job else None

    def get_queue_size(self) -> int:
        return self.queue.qsize()

    async def _worker(self):
        while True:
            job_info = await self.queue.get()
            await self.semaphore.acquire()
            asyncio.create_task(self._process_job(job_info))

    async def _process_job(self, job_info: JobInfo):
        job_info.start_time = time.time()
        job_info.status = JobStatus.PROCESSING
        
        try:
            logger.info(f"Processing job {job_info.job_id}")
            await self._run_tts(job_info.request, job_info.job_id)
            job_info.status = JobStatus.COMPLETED
            result = JobResult(
                job_id=job_info.job_id, 
                status="success", 
                processing_time=job_info.processing_time
            )
        except Exception as e:
            logger.error(f"Job {job_info.job_id} failed: {e}")
            job_info.status = JobStatus.FAILED
            job_info.error_message = str(e)
            result = JobResult(
                job_id=job_info.job_id, 
                status="failure", 
                message=str(e),
                processing_time=job_info.processing_time
            )
        finally:
            job_info.end_time = time.time()
            await self._send_webhook(result)
            self.semaphore.release()

    async def _run_tts(self, tts_request: TTSRequest, job_id: str):
        # Generate output filename in the audio_files directory
        filename = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
        
        # Format parameters according to edge-tts expectations
        # For pitch: convert from our numeric format to +XHz/-XHz format
        pitch_value = "+0Hz" if tts_request.pitch == "0" else f"{tts_request.pitch}Hz"
        if not pitch_value.startswith("+") and not pitch_value.startswith("-"):
            pitch_value = f"+{pitch_value}"
            
        # For rate: convert our decimal format (e.g. 1.5) to percentage format (+50%)
        speed_percentage = int((float(tts_request.speed) - 1) * 100)
        rate_value = f"+{speed_percentage}%" if speed_percentage >= 0 else f"{speed_percentage}%"
        
        # For volume: convert from percentage to +X%/-X% format
        volume_percentage = int(float(tts_request.volume)) - 100
        volume_value = f"+{volume_percentage}%" if volume_percentage >= 0 else f"{volume_percentage}%"
        
        # Create the communicate object with direct parameters
        communicate = edge_tts.Communicate(
            text=tts_request.text,
            voice=tts_request.voice,
            rate=rate_value,
            volume=volume_value,
            pitch=pitch_value
        )
        
        # Save audio to file
        await communicate.save(filename)
        
        # Verify the file was created and has content
        if not os.path.exists(filename) or os.path.getsize(filename) == 0:
            raise Exception(f"Failed to generate audio file for job {job_id}")
        
        logger.info(f"Job {job_id}: TTS conversion saved to {filename}")

    async def _send_webhook(self, result: JobResult):
        if not self.webhook_url or self.webhook_url.startswith("https://your-webhook"):
            logger.info("No valid webhook URL configured; skipping notification")
            return
            
        async with aiohttp.ClientSession() as session:
            try:
                payload = {
                    "job_id": result.job_id,
                    "status": result.status,
                }
                if result.message:
                    payload["message"] = result.message
                if result.processing_time:
                    payload["processing_time_seconds"] = result.processing_time
                    
                async with session.post(self.webhook_url, json=payload) as resp:
                    if resp.status != 200:
                        logger.warning(f"Webhook post returned non-200 status {resp.status}")
                    else:
                        logger.info(f"Webhook notified for job {result.job_id}")
            except Exception as e:
                logger.error(f"Failed to send webhook for job {result.job_id}: {e}")

    async def _cleanup_old_jobs(self):
        """Periodically clean up old completed jobs from memory"""
        while True:
            await asyncio.sleep(self.cleanup_interval)
            try:
                current_time = time.time()
                jobs_to_remove = []
                
                for job_id, job_info in self.jobs.items():
                    # Remove completed/failed jobs older than 6 hours
                    if (job_info.status in (JobStatus.COMPLETED, JobStatus.FAILED) and 
                        job_info.end_time and 
                        current_time - job_info.end_time > 21600):  # 6 hours
                        jobs_to_remove.append(job_id)
                
                for job_id in jobs_to_remove:
                    del self.jobs[job_id]
                
                logger.info(f"Cleaned up {len(jobs_to_remove)} completed jobs from memory")
            except Exception as e:
                logger.error(f"Error in job cleanup: {e}")
    
    async def cleanup_job(self, job_id: str):
        """Remove a specific job from memory"""
        if job_id in self.jobs:
            del self.jobs[job_id]
            logger.info(f"Removed job {job_id} from memory after deletion")
