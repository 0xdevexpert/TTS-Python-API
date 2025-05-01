
import asyncio
import uuid
import logging
import time
from typing import Optional, Dict
from .models import JobStatus, TTSRequest, JobInfo
from .job_processor import JobProcessor
from .auto_deletion import AutoDeletionManager, AUDIO_DIR
import os

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
        self.job_priority_threshold = 300
        
        # Ensure audio directory exists
        os.makedirs(AUDIO_DIR, exist_ok=True)
        
        # Initialize auto deletion manager
        self.auto_deletion_manager = AutoDeletionManager(
            auto_delete_delay=self.auto_delete_delay,
            webhook_url=self.webhook_url,
            jobs=self.jobs
        )
        
        # Initialize job processor
        self.job_processor = JobProcessor(
            semaphore=self.semaphore,
            jobs=self.jobs,
            webhook_url=self.webhook_url,
            auto_deletion_manager=self.auto_deletion_manager
        )
        
        # Start the manager automatically
        asyncio.create_task(self.start())

    async def start(self):
        if not self.running:
            self.running = True
            logger.info(f"Starting job manager with {self.max_concurrent} concurrent jobs")
            asyncio.create_task(self._worker())
            asyncio.create_task(self.auto_deletion_manager.cleanup_old_jobs())

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
            try:
                _, job_info = await self.queue.get()
                
                if job_info.job_id not in self.jobs:
                    self.queue.task_done()
                    continue
                    
                if job_info.status == JobStatus.QUEUED and job_info.age > self.job_priority_threshold:
                    await self.queue.put((50, job_info))
                    self.queue.task_done()
                    continue
                    
                await self.semaphore.acquire()
                asyncio.create_task(self.job_processor.process_job(job_info))
                self.queue.task_done()
            except Exception as e:
                logger.error(f"Error in worker: {e}")
                await asyncio.sleep(1)  # Prevent tight loop on error
    
    async def cleanup_job(self, job_id: str):
        """Manually clean up a job when explicitly deleted by the user"""
        if job_id in self.jobs:
            del self.jobs[job_id]
            logger.info(f"Removed job {job_id} from memory after manual deletion")
