
import asyncio
import uuid
import logging
import time
import os
from typing import Optional, Dict
from .models import JobStatus, TTSRequest, JobResult, JobInfo
from .tts_processor import process_tts_request, AUDIO_DIR
from .webhook_handler import send_webhook

logger = logging.getLogger(__name__)

class JobManager:
    def __init__(self, max_concurrent: int, webhook_url: str, auto_delete_delay: int = 300):
        self.max_concurrent = max_concurrent
        self.webhook_url = webhook_url
        self.auto_delete_delay = auto_delete_delay
        self.queue = asyncio.PriorityQueue()
        self.semaphore = asyncio.Semaphore(self.max_concurrent)
        self.running = False
        self.jobs: Dict[str, JobInfo] = {}
        self.cleanup_interval = 60  # Run cleanup every minute
        self.job_priority_threshold = 300
        
        # Start the manager automatically
        asyncio.create_task(self.start())

    async def start(self):
        if not self.running:
            self.running = True
            logger.info(f"Starting job manager with {self.max_concurrent} concurrent jobs")
            asyncio.create_task(self._worker())
            asyncio.create_task(self._cleanup_old_jobs())

    async def add_job(self, tts_request: TTSRequest) -> str:
        job_id = str(uuid.uuid4())
        job_info = JobInfo(job_id=job_id, request=tts_request)
        self.jobs[job_id] = job_info
        await self.queue.put((100, job_info))
        logger.info(f"Added job {job_id} to queue. Current queue size: {self.queue.qsize()}")
        return job_id

    def get_job_status(self, job_id: str) -> Optional[JobStatus]:
        job = self.jobs.get(job_id)
        return job.status if job else None

    def get_queue_size(self) -> int:
        return self.queue.qsize()

    async def _worker(self):
        logger.info("Worker started")
        while True:
            _, job_info = await self.queue.get()
            
            if job_info.job_id not in self.jobs:
                self.queue.task_done()
                continue
                
            if job_info.status == JobStatus.QUEUED and job_info.age > self.job_priority_threshold:
                await self.queue.put((50, job_info))
                self.queue.task_done()
                continue
                
            await self.semaphore.acquire()
            asyncio.create_task(self._process_job(job_info))
            self.queue.task_done()

    async def _process_job(self, job_info: JobInfo):
        job_info.start_time = time.time()
        job_info.status = JobStatus.PROCESSING

        try:
            logger.info(f"Processing job {job_info.job_id}")
            
            # Process the TTS request
            await process_tts_request(
                job_info.job_id,
                job_info.request.text,
                job_info.request.voice,
                job_info.request.pitch,
                job_info.request.speed,
                job_info.request.volume
            )
            
            job_info.status = JobStatus.COMPLETED
            
            # Send webhook notification immediately when audio is ready
            await send_webhook(self.webhook_url, JobResult(
                job_id=job_info.job_id,
                status="completed",
                message="Audio file is ready",
                processing_time=time.time() - job_info.start_time
            ))
            
            # Schedule auto-deletion
            asyncio.create_task(self._schedule_auto_delete(job_info.job_id))
            
            logger.info(f"Job {job_info.job_id} completed successfully.")
        except Exception as e:
            logger.error(f"Job {job_info.job_id} failed: {e}")
            job_info.status = JobStatus.FAILED
            await send_webhook(self.webhook_url, JobResult(
                job_id=job_info.job_id,
                status="failed",
                message=str(e)
            ))
        finally:
            job_info.end_time = time.time()
            self.semaphore.release()

    async def _schedule_auto_delete(self, job_id: str):
        """Schedule automatic deletion of the job and its audio file after the specified delay"""
        await asyncio.sleep(self.auto_delete_delay)
        
        try:
            # Delete audio file
            audio_path = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
            if os.path.exists(audio_path):
                os.remove(audio_path)
                logger.info(f"Auto-deleted audio file for job {job_id}")
            
            # Remove job from memory
            if job_id in self.jobs:
                del self.jobs[job_id]
                logger.info(f"Auto-deleted job {job_id} from memory")
                
            # Send webhook notification about deletion if configured
            if self.webhook_url:
                await send_webhook(self.webhook_url, JobResult(
                    job_id=job_id,
                    status="deleted",
                    message="Job and audio file automatically deleted after timeout"
                ))
        except Exception as e:
            logger.error(f"Error during auto-deletion of job {job_id}: {e}")

    async def _cleanup_old_jobs(self):
        while True:
            await asyncio.sleep(self.cleanup_interval)
            try:
                current_time = time.time()
                jobs_to_remove = [
                    job_id for job_id, job_info in self.jobs.items()
                    if job_info.status in (JobStatus.COMPLETED, JobStatus.FAILED) and 
                    job_info.end_time and 
                    current_time - job_info.end_time > 10800  # 3 hours
                ]
                
                for job_id in jobs_to_remove:
                    del self.jobs[job_id]
                
                if jobs_to_remove:
                    logger.info(f"Cleaned up {len(jobs_to_remove)} completed jobs from memory")
            except Exception as e:
                logger.error(f"Error in job cleanup: {e}")
    
    async def cleanup_job(self, job_id: str):
        if job_id in self.jobs:
            del self.jobs[job_id]
            logger.info(f"Removed job {job_id} from memory after deletion")

