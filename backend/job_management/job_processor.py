
import asyncio
import time
import logging
import datetime
from typing import Dict
from .models import JobStatus, JobInfo, JobResult
from .tts_processor import process_tts_request, AUDIO_DIR
from .webhook_handler import send_webhook
from .auto_deletion import AutoDeletionManager

logger = logging.getLogger(__name__)

class JobProcessor:
    def __init__(self, semaphore: asyncio.Semaphore, jobs: Dict[str, JobInfo], 
                 webhook_url: str, auto_deletion_manager: AutoDeletionManager):
        self.semaphore = semaphore
        self.jobs = jobs
        self.webhook_url = webhook_url
        self.auto_deletion_manager = auto_deletion_manager

    async def process_job(self, job_info: JobInfo):
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
            result = JobResult(
                job_id=job_info.job_id,
                status="completed",
                message="Audio file is ready",
                processing_time=time.time() - job_info.start_time,
                timestamp=datetime.datetime.now()
            )
            
            # Send webhook in a separate task to prevent blocking
            asyncio.create_task(send_webhook(self.webhook_url, result))
            
            # Schedule auto-deletion
            asyncio.create_task(self.auto_deletion_manager.schedule_auto_delete(job_info.job_id))
            
            logger.info(f"Job {job_info.job_id} completed successfully.")
        except Exception as e:
            logger.error(f"Job {job_info.job_id} failed: {e}")
            job_info.status = JobStatus.FAILED
            
            # Send failure notification
            result = JobResult(
                job_id=job_info.job_id,
                status="failed",
                message=str(e),
                timestamp=datetime.datetime.now()
            )
            
            # Send webhook in a separate task
            asyncio.create_task(send_webhook(self.webhook_url, result))
        finally:
            job_info.end_time = time.time()
            self.semaphore.release()
